"""
Disease information catalogue (general health info shown to patients).

Collection `diseases`:
    { name, department, description, image, symptoms: [str], createdAt, updatedAt }

GET is public. Create / update / delete are SuperAdmin only.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.accounts.permissions import IsSuperAdmin
from backend.db import diseases_collection

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DiseaseSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    department = serializers.CharField(max_length=100)
    description = serializers.CharField(allow_blank=True, required=False, default="")
    image = serializers.CharField(allow_blank=True, required=False, default="")
    symptoms = serializers.ListField(child=serializers.CharField(max_length=200), required=False, default=list)


def _serialize(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "department": doc.get("department", ""),
        "description": doc.get("description", ""),
        "image": doc.get("image", ""),
        "symptoms": doc.get("symptoms", []),
    }


def _object_id(value):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


class DiseaseListCreateView(APIView):
    """
    GET  /api/diseases/?department=Cardiology   -> { status, count, departments: [...], diseases: [...] }
    POST /api/diseases/                          (SuperAdmin)
    """
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsSuperAdmin()] if self.request.method == "POST" else [AllowAny()]

    def get(self, request):
        query = {}
        department = request.query_params.get("department")
        if department:
            query["department"] = department
        docs = list(diseases_collection.find(query).sort([("department", 1), ("name", 1)]))
        departments = sorted(diseases_collection.distinct("department"))
        return Response({
            "status": "success",
            "count": len(docs),
            "departments": departments,
            "diseases": [_serialize(d) for d in docs],
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = DiseaseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        if diseases_collection.find_one({"name": data["name"], "department": data["department"]}):
            return Response({"status": "error", "message": "This disease already exists in that department"},
                            status=status.HTTP_400_BAD_REQUEST)
        doc = {**data, "createdAt": _now(), "updatedAt": _now()}
        doc["_id"] = diseases_collection.insert_one(doc).inserted_id
        return Response({"status": "success", "message": "Disease added", "disease": _serialize(doc)},
                        status=status.HTTP_201_CREATED)


class DiseaseDetailView(APIView):
    """
    PATCH  /api/diseases/<id>/   (SuperAdmin)
    DELETE /api/diseases/<id>/   (SuperAdmin)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def patch(self, request, disease_id):
        oid = _object_id(disease_id)
        if not oid:
            return Response({"status": "error", "message": "Invalid disease id"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = DiseaseSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        updates = {k: v for k, v in serializer.validated_data.items() if k in request.data}
        updates["updatedAt"] = _now()
        result = diseases_collection.find_one_and_update({"_id": oid}, {"$set": updates}, return_document=True)
        if not result:
            return Response({"status": "error", "message": "Disease not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": "success", "message": "Disease updated", "disease": _serialize(result)},
                        status=status.HTTP_200_OK)

    def delete(self, request, disease_id):
        oid = _object_id(disease_id)
        if not oid:
            return Response({"status": "error", "message": "Invalid disease id"}, status=status.HTTP_400_BAD_REQUEST)
        result = diseases_collection.delete_one({"_id": oid})
        if not result.deleted_count:
            return Response({"status": "error", "message": "Disease not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": "success", "message": "Disease deleted"}, status=status.HTTP_200_OK)
