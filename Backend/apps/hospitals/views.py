# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# import json
# from datetime import datetime
# from bson.objectid import ObjectId

# # Import MongoDB collections from a central location
# from backend.db import departments_collection, hospitals_collection, users_collection, doctors_collection

# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# import json
# from datetime import datetime
# from bson.objectid import ObjectId


# Import MongoDB collections from a central location
# from backend.db import hospitals_collection

from apps.accounts.authentication import JWTAuthentication
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, UpdateAPIView, DestroyAPIView
from bson.objectid import ObjectId
from rest_framework.permissions import IsAuthenticated
from datetime import datetime


from backend.db import hospitals_collection, departments_collection, doctors_collection, users_collection
from .serializer import (
    HospitalSerializer, HospitalListSerializer,
    DepartmentSerializer, DepartmentListSerializer
)
from apps.accounts.permissions import (
    IsSuperAdmin,
    IsSuperAdminOrIsSameHospitalAdmin,
    IsAdmin,
)

# ================================= DEPARTMENT VIEWS ================================= #
# ================================= DEPARTMENT VIEWS ================================= #    



# @csrf_exempt
# def get_hospital_departments(request, hospital_name):
#     if request.method == "GET":
#         try:
#             print(f"Fetching departments for hospital: {hospital_name}")
#             departments = list(departments_collection.find({"hospitalName": hospital_name}))
#             print(f"Found {len(departments)} departments")
#             # Convert ObjectId to string for JSON serialization
#             for dept in departments:
#                 dept["_id"] = str(dept["_id"])
#                 dept["name"] = dept["Department"]
#                 dept["head"] = dept["Head of Department"]
#                 dept["created_at"] = dept["Created Date"] 
#                 dept["Description"] = dept["Description"]
    
#             return JsonResponse({"status": "success", "departments": departments})
#         except Exception as e:
#             print(f"Error fetching departments: {str(e)}")
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

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

    def get_hospital(self, hospital_id):
        try:
            return hospitals_collection.find_one({"_id": ObjectId(hospital_id)})
        except Exception:
            return None
    
    def list(self, request, hospital_id, *args, **kwargs):
        try:
            # Verify hospital exists
            hospital = self.get_hospital(hospital_id)
            
            hospital_name = hospital.get("name")
            departments = list(departments_collection.find({"hospitalName": hospital_name}))
            serializer = self.get_serializer(departments, many=True)
            
            return Response({
                "status": "success",
                "count": len(departments),
                "hospital": hospital_name,
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
            hospital = self.get_hospital(hospital_id)
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
    
# @csrf_exempt
# def add_department(request):
#     if request.method == "POST":
#         try:
#             data = json.loads(request.body)
#             hospital_name = data.get("hospitalName")
#             department_name = data.get("name")

#             # # Ensure hospital exists
#             # hospital = hospitals_collection.find_one({"name": hospitalName})
#             # if not hospital:
#             #     return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

#             # Check if department already exists in the hospital
#             existing_department = departments_collection.find_one({
#                 "Department": department_name,
#                 "hospitalName": hospital_name
#             })
#             if existing_department:
#                 return JsonResponse({"status": "error", "message": "Department already exists in this hospital"}, status=400)

#             # Insert department
#             department_data = {
#                 "Department": department_name,
#                 "Description": data.get("Description", ""),  # Use get() with default value
#                 "roles": data.get("roles", []),
#                 "hospitalName": hospital_name,
#                 "Head of Department": "",  # This can be updated later
#                 "Created Date": datetime.now()
#             }
#             result = departments_collection.insert_one(department_data)

#             if result.inserted_id:
#                 # Return the created department with proper formatting
#                 department_response = {
#                     "_id": str(result.inserted_id),
#                     "name": department_data["Department"],
#                     "Description": department_data["Description"],
#                     "roles": department_data["roles"],
#                     "hospitalName": department_data["hospitalName"],
#                     # "head": department_data["Head of Department"],
#                     "created_at": department_data["Created Date"]
#                 }
                
#                 return JsonResponse({
#                     "status": "success", 
#                     "message": "Department added successfully", 
#                     "department": department_response
#                 }, status=201)
#             return JsonResponse({"status": "error", "message": "Failed to add department"}, status=500)

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

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
            hospital = self.get_hospital(hospital_id)
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
        hospital = self.get_hospital(hospital_id)
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
    
    def get_hospital(self, hospital_id):
        try:
            return hospitals_collection.find_one({"_id": ObjectId(hospital_id)})
        except Exception:
            return None
    
    def get_object(self, department_id, hospital_id):
        try:
            hospital = self.get_hospital(hospital_id)
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
        hospital = self.get_hospital(hospital_id)
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
            department_name = department.get('Department')
            hospital_name = hospital.get('name')
            
            # Check if any doctors assigned
            doctors_count = doctors_collection.count_documents({
                "Department": department_name,
                "Hospital": hospital_name
            })
            
            if doctors_count > 0:
                return Response({
                    "status": "error",
                    "message": f"Cannot delete department. It has {doctors_count} doctor(s) assigned. Please reassign or remove them first."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Nullify patient department references
            users_collection.update_many(
                {"Department": department_name, "hospitalName": hospital_name},
                {"$set": {"Department": None}}
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

# @csrf_exempt
# def delete_department(request, department_id):
#     if request.method == "DELETE":
#         try:
#             # First check if department exists
#             department = departments_collection.find_one({"_id": ObjectId(department_id)})
#             if not department:
#                 return JsonResponse({"status": "error", "message": "Department not found"}, status=404)
            
#             # Delete the department
#             result = departments_collection.delete_one({"_id": ObjectId(department_id)})
            
#             if result.deleted_count:
#                 # Also update doctors associated with this department
#                 users_collection.update_many(
#                     {"departmentId": department_id},
#                     {"$set": {"departmentId": None}}
#                 )
                
#                 return JsonResponse({"status": "success", "message": "Department deleted successfully"})
#             return JsonResponse({"status": "error", "message": "Failed to delete department"}, status=500)

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)


# ================================= HOSPITAL VIEWS ================================= #
# ================================= HOSPITAL VIEWS ================================= #
# ================================= HOSPITAL VIEWS ================================= #
# ================================= HOSPITAL VIEWS ================================= #

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
                    "hospital": serializer.data
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

# @csrf_exempt
# def add_hospital(request):
#     if request.method == "POST":
#         try:
#             data = json.loads(request.body)

#             # Check if hospital already exists
#             existing_hospital = hospitals_collection.find_one({"name": data["name"]})
#             if existing_hospital:
#                 return JsonResponse({"status": "error", "message": "Hospital already exists"}, status=400)

#             # Insert hospital data
#             hospital_data = {
#                 "name": data["name"],
#                 "location": data["location"],
#                 "contactNo": data["contactNo"],
#                 "adminId": data["adminId"],  # Assigned Admin
#                 "created_at": datetime.now()
#             }
#             result = hospitals_collection.insert_one(hospital_data)

#             if result.inserted_id:
#                 return JsonResponse({"status": "success", "message": "Hospital added successfully", "hospitalId": str(result.inserted_id)})
#             return JsonResponse({"status": "error", "message": "Failed to add hospital"}, status=500)

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

# @csrf_exempt
# def get_hospitals(request):
#     if request.method == "GET":
#         try:
#             hospitals = list(hospitals_collection.find({}))

#             for hospital in hospitals:
#                 hospital["_id"] = str(hospital["_id"])
#                 hospital["adminId"] = str(hospital["adminId"])

#             return JsonResponse({"status": "success", "hospitals": hospitals})

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
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
        try:
            return hospitals_collection.find_one({"_id": ObjectId(hospital_id)})
        except Exception:
            return None
            
    
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
                    "hospital": serializer.data
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"status": "error", "message": str(e)},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # def put(self, request, hospital_id, *args, **kwargs):
    #     return self.update(request, hospital_id, partial=False)
    
    # def patch(self, request, hospital_id, *args, **kwargs):
    #     return self.update(request, hospital_id, partial=True)

# @csrf_exempt
# def update_hospital(request, hospital_id):
#     if request.method == "PUT":
#         try:
#             data = json.loads(request.body)
#             update_data = {k: v for k, v in data.items() if k in ["name", "location", "contactNo", "adminId"]}

#             result = hospitals_collection.update_one({"_id": ObjectId(hospital_id)}, {"$set": update_data})

#             if result.modified_count > 0:
#                 return JsonResponse({"status": "success", "message": "Hospital updated successfully"})
#             return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
class HospitalDestroyView(DestroyAPIView):
    """
    DELETE: Delete hospital (SuperAdmin only)
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]
    serializer_class = HospitalSerializer
    
    def get_object(self, hospital_id):
        try:
            hospital = hospitals_collection.find_one({"_id": ObjectId(hospital_id)})
            return hospital
        except Exception:
            return None
    
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
        
# @csrf_exempt
# def delete_hospital(request, hospital_id):
#     if request.method == "DELETE":
#         try:
#             result = hospitals_collection.delete_one({"_id": ObjectId(hospital_id)})

#             if result.deleted_count > 0:
#                 return JsonResponse({"status": "success", "message": "Hospital deleted successfully"})
#             return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)