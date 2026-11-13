"""
Medicine requests: a doctor asks the hospital pharmacy (admin) to stock a medicine that is
not in the hospital inventory. The admin is notified and can later order it from a supplier.

Collection `medicine_requests`:
    { hospitalName, medicineName, productType, notes, status: open|ordered|done|rejected,
      requestedBy: [{email, name, at}], requestCount, createdAt, updatedAt, handledBy }

POST  /api/orders/medicine-requests/            doctor creates (same open medicine is merged)
GET   /api/orders/medicine-requests/?status=    doctor: own requests, admin: hospital requests
PATCH /api/orders/medicine-requests/<id>/       admin updates status
"""
import logging
import re
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.appointments.models import NotificationDocument
from backend.db import medicine_requests_collection, notifications_collection, users_collection

logger = logging.getLogger(__name__)
STATUSES = ("open", "ordered", "done", "rejected")


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _role(user):
    return str(getattr(user, "userType", "") or "").strip().lower()


def _serialize(doc):
    created = doc.get("createdAt")
    return {
        "id": str(doc["_id"]),
        "hospitalName": doc.get("hospitalName"),
        "medicineName": doc.get("medicineName"),
        "productType": doc.get("productType", ""),
        "notes": doc.get("notes", ""),
        "status": doc.get("status", "open"),
        "requestCount": doc.get("requestCount", 1),
        "requestedBy": [{"email": r.get("email"), "name": r.get("name")} for r in doc.get("requestedBy", [])],
        "createdAt": created.isoformat() + "Z" if isinstance(created, datetime) else created,
    }


class MedicineRequestSerializer(serializers.Serializer):
    medicineName = serializers.CharField(max_length=120)
    productType = serializers.CharField(max_length=60, required=False, allow_blank=True, default="Medicine")
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")

    def validate_medicineName(self, value):
        value = " ".join(value.split())
        if len(value) < 2:
            raise serializers.ValidationError("Enter the medicine name.")
        return value


class MedicineRequestListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = _role(request.user)
        query = {}
        if role == "doctor":
            query = {"hospitalName": request.user.hospitalName, "requestedBy.email": request.user.email}
        elif role == "admin":
            query = {"hospitalName": request.user.hospitalName}
        elif role != "superadmin":
            return Response({"status": "error", "message": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if request.query_params.get("status") in STATUSES:
            query["status"] = request.query_params["status"]
        docs = list(medicine_requests_collection.find(query).sort("createdAt", -1).limit(100))
        return Response({"status": "success", "count": len(docs), "requests": [_serialize(d) for d in docs]},
                        status=status.HTTP_200_OK)

    def post(self, request):
        if _role(request.user) != "doctor":
            return Response({"status": "error", "message": "Only doctors can request medicines."},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = MedicineRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        hospital = request.user.hospitalName
        doctor = users_collection.find_one({"email": request.user.email, "userType": "Doctor"}, {"name": 1}) or {}
        requester = {"email": request.user.email, "name": doctor.get("name", ""), "at": _now()}

        # Same medicine already requested and still open at this hospital -> merge
        existing = medicine_requests_collection.find_one({
            "hospitalName": hospital,
            "status": "open",
            "medicineName": {"$regex": f"^{re.escape(data['medicineName'])}$", "$options": "i"},
        })
        if existing:
            already = any(r.get("email") == request.user.email for r in existing.get("requestedBy", []))
            if not already:
                medicine_requests_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$push": {"requestedBy": requester}, "$inc": {"requestCount": 1}, "$set": {"updatedAt": _now()}},
                )
            doc = medicine_requests_collection.find_one({"_id": existing["_id"]})
            return Response({"status": "success",
                             "message": "This medicine was already requested — your request was added to it.",
                             "request": _serialize(doc)}, status=status.HTTP_200_OK)

        doc = {
            "hospitalName": hospital,
            "medicineName": data["medicineName"],
            "productType": data.get("productType") or "Medicine",
            "notes": data.get("notes", ""),
            "status": "open",
            "requestedBy": [requester],
            "requestCount": 1,
            "createdAt": _now(),
            "updatedAt": _now(),
        }
        doc["_id"] = medicine_requests_collection.insert_one(doc).inserted_id

        try:
            for admin in users_collection.find({"userType": "Admin", "hospitalName": hospital}, {"email": 1}):
                notifications_collection.insert_one(NotificationDocument.create(
                    user_email=admin["email"],
                    title="Medicine Requested",
                    message=f"{doctor.get('name') or 'A doctor'} requested '{data['medicineName']}' for the pharmacy.",
                    notification_type="medicine_request",
                    reference_id=str(doc["_id"]),
                ))
        except Exception as exc:  # the request itself is saved; notification is best-effort
            logger.warning("Medicine request notification failed: %s", exc)

        return Response({"status": "success", "message": "Request sent to the hospital pharmacy.",
                         "request": _serialize(doc)}, status=status.HTTP_201_CREATED)


class MedicineRequestUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, request_id):
        role = _role(request.user)
        if role not in ("admin", "superadmin"):
            return Response({"status": "error", "message": "Only admins can update requests."},
                            status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get("status")
        if new_status not in STATUSES:
            return Response({"status": "error", "message": f"status must be one of {', '.join(STATUSES)}"},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            oid = ObjectId(request_id)
        except (InvalidId, TypeError):
            return Response({"status": "error", "message": "Invalid request id"}, status=status.HTTP_400_BAD_REQUEST)
        query = {"_id": oid}
        if role == "admin":
            query["hospitalName"] = request.user.hospitalName
        doc = medicine_requests_collection.find_one_and_update(
            query, {"$set": {"status": new_status, "handledBy": request.user.email, "updatedAt": _now()}},
            return_document=True,
        )
        if not doc:
            return Response({"status": "error", "message": "Request not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": "success", "request": _serialize(doc)}, status=status.HTTP_200_OK)
