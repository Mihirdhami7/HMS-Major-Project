from apps.accounts.authentication import JWTAuthentication
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, UpdateAPIView, DestroyAPIView
from bson.objectid import ObjectId
from rest_framework.permissions import IsAuthenticated
from datetime import datetime


from backend.db import hospitals_collection, departments_collection, staff_collection, users_collection
from .serializers import (
    HospitalSerializer, HospitalListSerializer,
    DepartmentSerializer, DepartmentListSerializer
)
from apps.accounts.permissions import (
    IsSuperAdmin,
    IsSuperAdminOrIsSameHospitalAdmin,
)


def _get_hospital_by_id(hospital_id):
    try:
        return hospitals_collection.find_one({"_id": ObjectId(hospital_id)})
    except Exception:
        return None


class DepartmentListCreateView(ListCreateAPIView):
    """
    GET: List all departments for a hospital (Authenticated users)
    POST: Create department (SuperAdmin or Hospital Admin)
    """
    authentication_classes = [JWTAuthentication]
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsSuperAdminOrIsSameHospitalAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DepartmentSerializer
        return DepartmentListSerializer

    def list(self, request, hospital_id, *args, **kwargs):
        try:
            # Verify hospital exists
            hospital = _get_hospital_by_id(hospital_id)
            if not hospital:
                return Response({
                    "status": "error",
                    "message": "Hospital not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            hospital_name = hospital.get("name")
            departments = list(departments_collection.find({"hospitalName": hospital_name}))
            serializer = self.get_serializer(departments, many=True)
            
            return Response({
                "status": "success",
                "count": len(departments),
                "hospitalName": hospital_name,
                "departments": serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, hospital_id, *args, **kwargs):
        try:
            # Verify hospital exists
            hospital = _get_hospital_by_id(hospital_id)
            if not hospital:
                return Response({
                    "status": "error",
                    "message": "Hospital not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check permissions
            self.check_object_permissions(request, hospital)
            
            hospital_name = hospital.get("name")

            data = request.data.copy()
            data['hospitalName'] = hospital_name
            
            serializer = self.get_serializer(data=data)
            
            if serializer.is_valid():
                try:
                    department = serializer.save()
                    return Response({
                        "status": "success",
                        "message": "Department created successfully",
                        "department": serializer.data
                    }, status=status.HTTP_201_CREATED)
                except Exception as e:
                    return Response({
                        "status": "error",
                        "message": str(e)
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DepartmentUpdateView(UpdateAPIView):
    """
    GET: Retrieve department details (Authenticated users)
    PUT/PATCH: Update department (SuperAdmin or Hospital Admin)
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]
    serializer_class = DepartmentSerializer   

    def get_object(self, department_id, hospital_id):
        try:
            hospital = _get_hospital_by_id(hospital_id)
            if not hospital:
                return None
            
            hospital_name = hospital.get("name")
            return departments_collection.find_one({
                "_id": ObjectId(department_id),
                "hospitalName": hospital_name
            })
        except Exception:
            return None
    
    def patch(self, request, hospital_id, department_id, *args, **kwargs):
        hospital = _get_hospital_by_id(hospital_id)
        if not hospital:
            return Response({
                "status": "error",
                "message": "Hospital not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        department = self.get_object(department_id, hospital_id)
        if not department:
            return Response({
                "status": "error",
                "message": "Department not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions
        self.check_object_permissions(request, hospital)
        
        hospital_name = hospital.get("name")
        data = request.data.copy()
        data['hospitalName'] = hospital_name
        
        serializer = self.get_serializer(department, data=data, partial=True)
        
        if serializer.is_valid():
            try:
                serializer.save()
                return Response({
                    "status": "success",
                    "message": "Department updated successfully",
                    "department": serializer.data
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    "status": "error",
                    "message": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class DepartmentDestroyView(DestroyAPIView):
    """
    DELETE: Delete department (SuperAdmin or Hospital Admin)
    Checks if any doctors are assigned first.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]
    serializer_class = DepartmentSerializer
    
    def get_object(self, department_id, hospital_id):
        try:
            hospital = _get_hospital_by_id(hospital_id)
            if not hospital:
                return None
            
            hospital_name = hospital.get("name")
            return departments_collection.find_one({
                "_id": ObjectId(department_id),
                "hospitalName": hospital_name
            })
        except Exception:
            return None
    
    def delete(self, request, hospital_id, department_id, *args, **kwargs):
        hospital = _get_hospital_by_id(hospital_id)
        if not hospital:
            return Response({
                "status": "error",
                "message": "Hospital not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        department = self.get_object(department_id, hospital_id)
        if not department:
            return Response({
                "status": "error",
                "message": "Department not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions
        self.check_object_permissions(request, hospital)
        
        try:
            department_name = department.get('name')
            hospital_name = hospital.get('name')
            
            # Check if any doctors assigned
            doctors_count = staff_collection.count_documents({
                "department": department_name,
                "hospitalName": hospital_name,
                "role": "Doctor"
            })
            
            if doctors_count > 0:
                return Response({
                    "status": "error",
                    "message": f"Cannot delete department. It has {doctors_count} doctor(s) assigned. Please reassign or remove them first."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Nullify patient department references
            users_collection.update_many(
                {
                    "hospitalName": hospital_name,
                    "department": department_name,
                },
                {"$set": {"department": None}}
            )
            
            # Delete department
            result = departments_collection.delete_one({"_id": ObjectId(department_id)})
            
            if result.deleted_count > 0:
                return Response({
                    "status": "success",
                    "message": "Department deleted successfully"
                }, status=status.HTTP_200_OK)
            
            return Response({
                "status": "error",
                "message": "Failed to delete department"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HospitalListCreateView(ListCreateAPIView):
    """
    GET: List all hospitals (Authenticated users)
    POST: Create hospital (SuperAdmin only)
    """
    
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsSuperAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return HospitalSerializer
        return HospitalListSerializer
    
    def list(self, request, *args, **kwargs):
        try:
            hospitals = list(hospitals_collection.find({}))
            serializer = self.get_serializer(hospitals, many=True)
            return Response({
                "status": "success",
                "count": len(hospitals),
                "hospitals": serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            try:
                hospital = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Hospital created successfully",
                    "hospitalName": serializer.data.get("name")
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    "status": "error",
                    "message": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class HospitalUpdateView(UpdateAPIView):
    """
    GET: Retrieve hospital details (Authenticated users)
    PUT/PATCH: Update hospital (SuperAdmin or Hospital Admin)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdminOrIsSameHospitalAdmin]
    serializer_class = HospitalSerializer
    
    def get_object(self, hospital_id):
        """Get hospital from MongoDB"""
        return _get_hospital_by_id(hospital_id)
            
    
    def patch(self, request, hospital_id, *args, **kwargs):
        hospital = self.get_object(hospital_id)
        if not hospital:
            return Response({"status": "error", "message": "Hospital not found"},
                            status=status.HTTP_404_NOT_FOUND)

        # permission check on this hospital
        self.check_object_permissions(request, hospital)

        serializer = self.get_serializer(hospital, data=request.data, partial=True)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response({
                    "status": "success",
                    "message": "Hospital updated successfully",
                    "hospitalName": serializer.data.get("name")
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"status": "error", "message": str(e)},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class HospitalDestroyView(DestroyAPIView):
    """
    DELETE: Delete hospital (SuperAdmin only)
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]
    serializer_class = HospitalSerializer
    
    def get_object(self, hospital_id):
        return _get_hospital_by_id(hospital_id)
    
    def delete(self, request, hospital_id, *args, **kwargs):
        hospital = self.get_object(hospital_id)
        
        if not hospital:
            return Response({
                "status": "error",
                "message": "Hospital not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Check if hospital has departments
            departments_count = departments_collection.count_documents(
                {"hospitalName": hospital['name']}
            )
            if departments_count > 0:
                return Response({
                    "status": "error",
                    "message": f"Cannot delete hospital. It has {departments_count} department(s). Please delete all departments first."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete hospital
            result = hospitals_collection.delete_one({"_id": ObjectId(hospital_id)})
            
            if result.deleted_count > 0:
                return Response({
                    "status": "success",
                    "message": "Hospital deleted successfully"
                }, status=status.HTTP_200_OK)
            
            return Response({
                "status": "error",
                "message": "Failed to delete hospital"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        