import logging
from bson.objectid import ObjectId
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from backend.db import users_collection, staff_collection, departments_collection, hospitals_collection
from apps.accounts.authentication import JWTAuthentication
from .models import StaffDocument
from .serializers import PatientCreateSerializer, DoctorStaffSerializer, DoctorApprovalSerializer, DoctorRejectSerializer
from apps.accounts.permissions import IsSuperAdminOrIsSameHospitalAdmin, IsDoctorOrAdmin
from apps.accounts.serializers import UserProfileSerializer

logger = logging.getLogger(__name__)


# ============================================================================
# DOCTOR VIEWS
# ============================================================================

class DoctorListAPIView(APIView):
    """
    GET  /api/users/doctors/<hospital_name>/ - List doctors by hospital
    POST /api/users/doctors/<hospital_name>/ - Create doctor
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def get(self, request, hospital_name):
        """Get doctors list by hospital."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            query = {"role": "Doctor", "hospitalName": hospital_name}
            doctors = list(staff_collection.find(query, {"password": 0, "otp": 0}))
            for doctor in doctors:
                doctor["_id"] = str(doctor["_id"])
                if "user_id" in doctor:
                    doctor["user_id"] = str(doctor["user_id"])
            return Response({
                "status": "success",
                "count": len(doctors),
                "doctors": doctors
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorListAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, hospital_name):
        """Create new doctor in staff_collection."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            serializer = DoctorStaffSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            data = serializer.validated_data

            user_doc = users_collection.find_one({
                "email": data["email"],
                "userType": "Doctor",
                "hospitalName": hospital_name,
            })
            if not user_doc:
                return Response({
                    "status": "error",
                    "message": "Doctor user profile not found. Create the doctor account first."
                }, status=status.HTTP_404_NOT_FOUND)

            staff_doc = StaffDocument.create_staff_doctor(
                user_id=user_doc["_id"],
                email=data["email"],
                name=data.get("name", ""),
                hospital=hospital_name,
                department=data.get("department", ""),
                qualification=data.get("qualification"),
                specialization=data.get("specialization"),
                certificate=data.get("certificate"),
                contactNo=data.get("contactNo", ""),
                experience=data.get("experience", 0)
            )
            result = staff_collection.insert_one(staff_doc)
            return Response({
                "status": "success",
                "message": "Doctor created successfully",
                "doctor_id": str(result.inserted_id)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("DoctorListAPIView.post: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorDetailAPIView(APIView):
    """
    GET    /api/users/doctors/<doctor_id>/ - Get doctor detail
    PUT    /api/users/doctors/<doctor_id>/ - Update doctor
    DELETE /api/users/doctors/<doctor_id>/ - Delete doctor
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def get(self, request, doctor_id):
        """Get doctor by ID."""
        if not ObjectId.is_valid(doctor_id):
            return Response({"status": "error", "message": "Invalid doctor ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doctor = staff_collection.find_one(
                {"_id": ObjectId(doctor_id), "role": "Doctor"}, {"password": 0, "otp": 0}
            )
            if not doctor:
                return Response({"status": "error", "message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            doctor_hospital = str(doctor.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != doctor_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            doctor["_id"] = str(doctor["_id"])
            if "user_id" in doctor:
                doctor["user_id"] = str(doctor["user_id"])
            return Response({"status": "success", "doctor": doctor}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorDetailAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, doctor_id):
        """Update doctor details."""
        if not ObjectId.is_valid(doctor_id):
            return Response({"status": "error", "message": "Invalid doctor ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            existing = staff_collection.find_one({"_id": ObjectId(doctor_id), "role": "Doctor"})
            if not existing:
                return Response({"status": "error", "message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            doctor_hospital = str(existing.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != doctor_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

            serializer = DoctorStaffSerializer(data=request.data, partial=True)
            if not serializer.is_valid():
                return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            update_data = {k: v for k, v in serializer.validated_data.items() if v is not None}
            update_data["updated_at"] = datetime.now()
            result = staff_collection.update_one(
                {"_id": ObjectId(doctor_id)},
                {"$set": update_data}
            )
            return Response({"status": "success", "message": "Doctor updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorDetailAPIView.put: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, doctor_id):
        """Delete doctor."""
        if not ObjectId.is_valid(doctor_id):
            return Response({"status": "error", "message": "Invalid doctor ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            existing = staff_collection.find_one({"_id": ObjectId(doctor_id), "role": "Doctor"})
            if not existing:
                return Response({"status": "error", "message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            doctor_hospital = str(existing.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != doctor_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

            staff_collection.delete_one({"_id": ObjectId(doctor_id)})
            return Response({"status": "success", "message": "Doctor deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorDetailAPIView.delete: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorRoleAPIView(APIView):
    """
    PUT /api/users/doctors/id/<doctor_id>/role/ - Assign roles to doctor
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def put(self, request, doctor_id):
        """Assign doctor roles."""
        if not ObjectId.is_valid(doctor_id):
            return Response({"status": "error", "message": "Invalid doctor ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doctor = staff_collection.find_one({"_id": ObjectId(doctor_id), "role": "Doctor"})
            if not doctor:
                return Response({"status": "error", "message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)

            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            doctor_hospital = str(doctor.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != doctor_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

            roles = request.data.get("roles", [])
            if not isinstance(roles, list):
                return Response({"status": "error", "message": "'roles' must be a list"}, status=status.HTTP_400_BAD_REQUEST)
            result = staff_collection.update_one(
                {"_id": ObjectId(doctor_id), "role": "Doctor"},
                {"$set": {"roles": roles, "updated_at": datetime.now()}}
            )
            if result.matched_count == 0:
                return Response({"status": "error", "message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            # Sync department head when applicable
            if "Department Head" in roles:
                if doctor and doctor.get("department"):
                    departments_collection.update_many(
                        {
                            "hospitalName": doctor.get("hospitalName"),
                            "name": doctor["department"],
                        },
                        {"$set": {"headOfDepartment": doctor.get("name")}, "$unset": {"Head of Department": ""}}
                    )
            return Response({"status": "success", "message": "Doctor roles updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorRoleAPIView.put: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorPendingListAPIView(APIView):
    """
    GET /api/users/doctors/<hospital_name>/pending/ - List pending doctors by hospital
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def get(self, request, hospital_name):
        """Get doctors pending approval by hospital."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            query = {"userType": "Doctor", "isApproved": False, "hospitalName": hospital_name}
            pending = list(users_collection.find(query, {"password": 0, "otp": 0}))
            for doctor in pending:
                doctor["_id"] = str(doctor["_id"])
            return Response({
                "status": "success",
                "count": len(pending),
                "pending_doctors": pending
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorPendingListAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorApproveAPIView(APIView):
    """
    POST /api/users/doctors/approve/ - Approve pending doctor
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def post(self, request):
        """Approve doctor and create staff record."""
        serializer = DoctorApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data["email"]
        hospital = data["hospitalName"]

        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        try:
            # Idempotency: return success if staff record already exists
            existing = staff_collection.find_one({"email": email, "hospitalName": hospital, "role": "Doctor"})
            if existing:
                return Response({
                    "status": "success",
                    "message": "Doctor already approved",
                    "staff_id": str(existing["_id"])
                }, status=status.HTTP_200_OK)

            # Fetch pending doctor
            doctor = users_collection.find_one({"email": email, "userType": "Doctor", "hospitalName": hospital})
            if not doctor:
                return Response({"status": "error", "message": "Pending doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            if doctor.get("isApproved"):
                return Response({"status": "error", "message": "Doctor already approved"}, status=status.HTTP_400_BAD_REQUEST)

            # Build and insert staff document
            staff_doc = StaffDocument.create_staff_doctor(
                user_id=doctor["_id"],
                email=doctor["email"],
                name=doctor.get("name", ""),
                hospital=doctor.get("hospitalName", ""),
                department=data.get("department", ""),
                qualification=doctor.get("doctorQualification", ""),
                specialization=doctor.get("doctorSpecialization", ""),
                certificate=doctor.get("doctorCertificate", ""),
                contactNo=doctor.get("contactNo", ""),
                experience=data.get("experience", 0)
            )
            staff_result = staff_collection.insert_one(staff_doc)

            # Mark doctor as approved — rollback on failure
            update_result = users_collection.update_one(
                {"_id": doctor["_id"]},
                {"$set": {"isApproved": True, "approvedAt": datetime.now()}}
            )
            if not update_result.matched_count:
                staff_collection.delete_one({"_id": staff_result.inserted_id})
                logger.error("DoctorApproveAPIView: rollback triggered for %s", email)
                return Response({"status": "error", "message": "Approval failed, please try again"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "status": "success",
                "message": "Doctor approved successfully",
                "staff_id": str(staff_result.inserted_id)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorApproveAPIView.post: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorRejectAPIView(APIView):
    """
    POST /api/users/doctors/reject/ - Reject pending doctor
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def post(self, request):
        """Reject doctor application."""
        serializer = DoctorRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data["email"]
        hospital = data["hospitalName"]

        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        try:
            result = users_collection.delete_one({"email": email, "userType": "Doctor", "hospitalName": hospital})
            if result.deleted_count == 0:
                return Response({"status": "error", "message": "Pending doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            return Response({"status": "success", "message": "Doctor application rejected"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorRejectAPIView.post: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorByDepartmentAPIView(APIView):
    """
    GET /api/users/doctors/<hospital_name>/department/<department_name>/ - List doctors in department
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request, hospital_name, department_name):
        """Get doctors by hospital and department."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            if not departments_collection.find_one({
                "hospitalName": hospital_name,
                "name": department_name,
            }):
                return Response({"status": "error", "message": f"Department '{department_name}' not found in hospital '{hospital_name}'"}, status=status.HTTP_404_NOT_FOUND)
            query = {"department": department_name, "role": "Doctor", "hospitalName": hospital_name}
            doctors = list(staff_collection.find(query, {"password": 0, "otp": 0}))
            for doctor in doctors:
                doctor["_id"] = str(doctor["_id"])
                if "user_id" in doctor:
                    doctor["user_id"] = str(doctor["user_id"])
            return Response({
                "status": "success",
                "count": len(doctors),
                "hospitalName": hospital_name,
                "department": department_name,
                "doctors": doctors
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorByDepartmentAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorSearchAPIView(APIView):
    """
    GET /api/users/doctors/search/?email=doctor@example.com&hospitalName=HospitalName - Search doctor
        Query Parameters:
        - email (required): Doctor email address
        - hospitalName (optional): Filter by hospital name
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request):
        """Search doctor by email with optional hospital filter."""
        email = request.query_params.get("email", "").strip().lower()
        hospital = request.query_params.get("hospitalName", "").strip() or request.query_params.get("hospital", "").strip()
        if not email:
            return Response({"status": "error", "message": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            query = {"email": email, "role": "Doctor"}
            if hospital:
                query["hospitalName"] = hospital
            doctor = staff_collection.find_one(query, {"password": 0, "otp": 0})
            if not doctor:
                return Response({"status": "error", "message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            doctor_hospital = str(doctor.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != doctor_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            doctor["_id"] = str(doctor["_id"])
            if "user_id" in doctor:
                doctor["user_id"] = str(doctor["user_id"])
            return Response({"status": "success", "doctor": doctor}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("DoctorSearchAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PATIENT VIEWS
# ============================================================================

class PatientListAPIView(APIView):
    """
    GET  /api/users/patients/<hospital_name>/ - List patients by hospital
    POST /api/users/patients/<hospital_name>/ - Create patient
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def get(self, request, hospital_name):
        """Get patients list by hospital."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            query = {"userType": "Patient", "hospitalName": hospital_name}
            patients = list(users_collection.find(query, {"password": 0, "otp": 0}))
            for patient in patients:
                patient["_id"] = str(patient["_id"])
            return Response({
                "status": "success",
                "count": len(patients),
                "patients": patients
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("PatientListAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, hospital_name):
        """Create new patient."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            serializer = PatientCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            data = serializer.validated_data
            email = data["email"].lower()
            if users_collection.find_one({"email": email}):
                return Response({"status": "error", "message": "Patient already exists"}, status=status.HTTP_400_BAD_REQUEST)
            patient_doc = {
                "email": email,
                "name": data.get("name", ""),
                "userType": "Patient",
                "contactNo": data.get("contactNo", ""),
                "gender": data.get("gender", ""),
                "dateOfBirth": data.get("dateOfBirth"),
                "hospitalName": hospital_name,
                "is_active": True,
                "created_at": datetime.now()
            }
            result = users_collection.insert_one(patient_doc)
            return Response({
                "status": "success",
                "message": "Patient created successfully",
                "patient_id": str(result.inserted_id)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("PatientListAPIView.post: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientDetailAPIView(APIView):
    """
    GET    /api/users/patients/<patient_id>/ - Get patient detail
    PUT    /api/users/patients/<patient_id>/ - Update patient
    DELETE /api/users/patients/<patient_id>/ - Delete patient
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request, patient_id):
        """Get patient by ID."""
        if not ObjectId.is_valid(patient_id):
            return Response({"status": "error", "message": "Invalid patient ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            patient = users_collection.find_one(
                {"_id": ObjectId(patient_id), "userType": "Patient"}, {"password": 0, "otp": 0}
            )
            if not patient:
                return Response({"status": "error", "message": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            patient_hospital = str(patient.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != patient_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            patient["_id"] = str(patient["_id"])
            return Response({"status": "success", "patient": patient}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("PatientDetailAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, patient_id):
        """Update patient details."""
        if not ObjectId.is_valid(patient_id):
            return Response({"status": "error", "message": "Invalid patient ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            existing = users_collection.find_one({"_id": ObjectId(patient_id), "userType": "Patient"})
            if not existing:
                return Response({"status": "error", "message": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            patient_hospital = str(existing.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != patient_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

            serializer = UserProfileSerializer(data=request.data, partial=True)
            if not serializer.is_valid():
                return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            update_data = {k: v for k, v in serializer.validated_data.items() if v is not None}
            update_data["updated_at"] = datetime.now()
            result = users_collection.update_one(
                {"_id": ObjectId(patient_id)},
                {"$set": update_data}
            )
            return Response({"status": "success", "message": "Patient updated successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("PatientDetailAPIView.put: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, patient_id):
        """Delete patient."""
        if not ObjectId.is_valid(patient_id):
            return Response({"status": "error", "message": "Invalid patient ID"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            existing = users_collection.find_one({"_id": ObjectId(patient_id), "userType": "Patient"})
            if not existing:
                return Response({"status": "error", "message": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            patient_hospital = str(existing.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != patient_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

            users_collection.delete_one({"_id": ObjectId(patient_id)})
            return Response({"status": "success", "message": "Patient deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("PatientDetailAPIView.delete: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientSearchAPIView(APIView):
    """
    GET /api/users/patients/search/?email=patient@example.com&hospitalName=HospitalName - Search patient
        Query Parameters:
        - email (required): Patient email address
        - hospitalName (optional): Filter by hospital name
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request):
        """Search patient by email with optional hospital filter."""
        email = request.query_params.get("email", "").strip().lower()
        hospital = request.query_params.get("hospitalName", "").strip() or request.query_params.get("hospital", "").strip()
        if not email:
            return Response({"status": "error", "message": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            query = {"email": email, "userType": "Patient"}
            if hospital:
                query["hospitalName"] = hospital
            patient = users_collection.find_one(query, {"password": 0, "otp": 0})
            if not patient:
                return Response({"status": "error", "message": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
            user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
            user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            patient_hospital = str(patient.get("hospitalName", "") or "").strip()
            if user_type != "superadmin" and user_hospital != patient_hospital:
                return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            patient["_id"] = str(patient["_id"])
            return Response({"status": "success", "patient": patient}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("PatientSearchAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientByDepartmentAPIView(APIView):
    """
    GET /api/users/patients/<hospital_name>/department/<department_name>/ - List patients in department
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]

    def get(self, request, hospital_name, department_name):
        """Get patients by hospital and department."""
        user_type = str(getattr(request.user, "userType", "") or "").strip().lower()
        user_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if user_type != "superadmin" and user_hospital != str(hospital_name or "").strip():
            return Response({"status": "error", "message": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            if not hospitals_collection.find_one({"name": hospital_name}):
                return Response({"status": "error", "message": f"Hospital '{hospital_name}' not found"}, status=status.HTTP_404_NOT_FOUND)
            if not departments_collection.find_one({
                "hospitalName": hospital_name,
                "name": department_name,
            }):
                return Response({"status": "error", "message": f"Department '{department_name}' not found in hospital '{hospital_name}'"}, status=status.HTTP_404_NOT_FOUND)
            query = {"department": department_name, "userType": "Patient", "hospitalName": hospital_name}
            patients = list(users_collection.find(query, {"password": 0, "otp": 0}))
            for patient in patients:
                patient["_id"] = str(patient["_id"])
            return Response({
                "status": "success",
                "count": len(patients),
                "hospitalName": hospital_name,
                "department": department_name,
                "patients": patients
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("PatientByDepartmentAPIView.get: %s", e, exc_info=True)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
