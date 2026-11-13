"""
Notifications for the logged-in user.

Notifications are written by other apps (appointment booked / approved / rejected,
prescription created, ...) using appointments.models.NotificationDocument:
    { userEmail, title, message, type, referenceId, read, createdAt }
This module only reads them and marks them as read.
"""
import logging
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from backend.db import notifications_collection

logger = logging.getLogger(__name__)
MAX_LIMIT = 50


def _serialize(doc):
    created = doc.get("createdAt")
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "message": doc.get("message", ""),
        "type": doc.get("type", "general"),
        "referenceId": doc.get("referenceId"),
        "read": bool(doc.get("read", False)),
        # stored as naive UTC -> send ISO with Z so the browser shows local time
        "createdAt": created.isoformat() + "Z" if isinstance(created, datetime) else created,
    }


class NotificationListView(APIView):
    """
    GET /api/notifications/?limit=20&unread=true
    -> { status, unread, count, notifications: [...] }  newest first
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = getattr(request.user, "email", None)
        try:
            limit = max(1, min(int(request.query_params.get("limit", 20)), MAX_LIMIT))
        except ValueError:
            limit = 20
        query = {"userEmail": email}
        if str(request.query_params.get("unread", "")).lower() in ("1", "true", "yes"):
            query["read"] = False
        try:
            docs = list(notifications_collection.find(query).sort("createdAt", -1).limit(limit))
            unread = notifications_collection.count_documents({"userEmail": email, "read": False})
        except Exception as exc:
            logger.error("NotificationListView: %s", exc, exc_info=True)
            return Response({"status": "error", "message": "Could not load notifications"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({
            "status": "success",
            "unread": unread,
            "count": len(docs),
            "notifications": [_serialize(d) for d in docs],
        }, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/read/   { "ids": ["..."] }  -> mark these as read
    POST /api/notifications/read/   {}                  -> mark all as read
    Only the caller's own notifications are touched.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = getattr(request.user, "email", None)
        ids = request.data.get("ids") if isinstance(request.data, dict) else None
        query = {"userEmail": email, "read": False}
        if ids:
            if not isinstance(ids, list):
                return Response({"status": "error", "message": "ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                query["_id"] = {"$in": [ObjectId(str(i)) for i in ids]}
            except (InvalidId, TypeError):
                return Response({"status": "error", "message": "Invalid notification id"}, status=status.HTTP_400_BAD_REQUEST)
        result = notifications_collection.update_many(query, {"$set": {"read": True}})
        unread = notifications_collection.count_documents({"userEmail": email, "read": False})
        return Response({"status": "success", "updated": result.modified_count, "unread": unread},
                        status=status.HTTP_200_OK)
