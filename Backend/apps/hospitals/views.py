from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson.objectid import ObjectId

# Import MongoDB collections from a central location
from backend.db import departments_collection, hospitals_collection, users_collection, doctors_collection




@csrf_exempt
def get_hospital_departments(request, hospital_name):
    if request.method == "GET":
        try:
            print(f"Fetching departments for hospital: {hospital_name}")
            departments = list(departments_collection.find({"hospitalName": hospital_name}))
            print(f"Found {len(departments)} departments")
            # Convert ObjectId to string for JSON serialization
            for dept in departments:
                dept["_id"] = str(dept["_id"])
                dept["name"] = dept["Department"]
                dept["head"] = dept["Head of Department"]
                dept["created_at"] = dept["Created Date"] 
                dept["Description"] = dept["Description"]
    
            return JsonResponse({"status": "success", "departments": departments})
        except Exception as e:
            print(f"Error fetching departments: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_department_doctors(request, departmentId, hospital_name):
    if request.method == "GET":
        try:
            department = departments_collection.find_one({"_id": ObjectId(departmentId)})
            if not department:
                return JsonResponse({"status": "error", "message": "Department not found"}, status=404)
            
            departments_name = department.get("Department")

            doctors = list(doctors_collection.find({"Department": departments_name, "Hospital": hospital_name}))
            # Convert ObjectId to string for JSON serialization
            for doc in doctors:
                doc["_id"] = str(doc["_id"])
                doc["name"] = doc["name"]
                doc["email"] = doc["email"]
                doc["specialization"] = doc["doctorSpecialization"]
                doc["qualification"] = doc["doctorQualification"]
                doc["contact"] = doc["contectNo"]
                doc["rating"] = doc["rating"]
                # doc["dateOfBirth"] = doc["dateOfBirth"]
                # doc["adress"] = doc["Address"]
                # doc["time_slot"] = doc["Time Slot"]
                # doc["Description"] = doc["Description"]

            
            return JsonResponse({"status": "success", "doctors": doctors})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_department_patients(request, department_name):
    if request.method == "GET":
        try:
            patients = list(users_collection.find({"Department": department_name}))
            # Convert ObjectId to string for JSON serialization
            for patient in patients:
                patient["_id"] = str(patient["_id"])
            
            return JsonResponse({"status": "success", "patients": patients})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def add_department(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            hospital_name = data.get("hospitalName")
            department_name = data.get("name")

            # # Ensure hospital exists
            # hospital = hospitals_collection.find_one({"name": hospitalName})
            # if not hospital:
            #     return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

            # Check if department already exists in the hospital
            existing_department = departments_collection.find_one({
                "Department": department_name,
                "hospitalName": hospital_name
            })
            if existing_department:
                return JsonResponse({"status": "error", "message": "Department already exists in this hospital"}, status=400)

            # Insert department
            department_data = {
                "Department": department_name,
                "Description": data.get("Description", ""),  # Use get() with default value
                "roles": data.get("roles", []),
                "hospitalName": hospital_name,
                "Head of Department": "",  # This can be updated later
                "Created Date": datetime.now()
            }
            result = departments_collection.insert_one(department_data)

            if result.inserted_id:
                # Return the created department with proper formatting
                department_response = {
                    "_id": str(result.inserted_id),
                    "name": department_data["Department"],
                    "Description": department_data["Description"],
                    "roles": department_data["roles"],
                    "hospitalName": department_data["hospitalName"],
                    # "head": department_data["Head of Department"],
                    "created_at": department_data["Created Date"]
                }
                
                return JsonResponse({
                    "status": "success", 
                    "message": "Department added successfully", 
                    "department": department_response
                }, status=201)
            return JsonResponse({"status": "error", "message": "Failed to add department"}, status=500)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def update_department(request, department_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            
            # Update department
            result = departments_collection.update_one(
                {"_id": ObjectId(department_id)},
                {"$set": {
                    "name": data["name"],
                    "description": data["Description"],
                    "roles": data.get("roles", []),
                    "updated_at": datetime.now()
                }}
            )

            if result.modified_count:
                return JsonResponse({"status": "success", "message": "Department updated successfully"})
            return JsonResponse({"status": "error", "message": "Department not found or no changes made"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def delete_department(request, department_id):
    if request.method == "DELETE":
        try:
            # First check if department exists
            department = departments_collection.find_one({"_id": ObjectId(department_id)})
            if not department:
                return JsonResponse({"status": "error", "message": "Department not found"}, status=404)
            
            # Delete the department
            result = departments_collection.delete_one({"_id": ObjectId(department_id)})
            
            if result.deleted_count:
                # Also update doctors associated with this department
                users_collection.update_many(
                    {"departmentId": department_id},
                    {"$set": {"departmentId": None}}
                )
                
                return JsonResponse({"status": "success", "message": "Department deleted successfully"})
            return JsonResponse({"status": "error", "message": "Failed to delete department"}, status=500)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)



from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson.objectid import ObjectId

# Import MongoDB collections from a central location
from backend.db import hospitals_collection

@csrf_exempt
def add_hospital(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Check if hospital already exists
            existing_hospital = hospitals_collection.find_one({"name": data["name"]})
            if existing_hospital:
                return JsonResponse({"status": "error", "message": "Hospital already exists"}, status=400)

            # Insert hospital data
            hospital_data = {
                "name": data["name"],
                "location": data["location"],
                "contactNo": data["contactNo"],
                "adminId": data["adminId"],  # Assigned Admin
                "created_at": datetime.now()
            }
            result = hospitals_collection.insert_one(hospital_data)

            if result.inserted_id:
                return JsonResponse({"status": "success", "message": "Hospital added successfully", "hospitalId": str(result.inserted_id)})
            return JsonResponse({"status": "error", "message": "Failed to add hospital"}, status=500)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_hospitals(request):
    if request.method == "GET":
        try:
            hospitals = list(hospitals_collection.find({}))

            for hospital in hospitals:
                hospital["_id"] = str(hospital["_id"])
                hospital["adminId"] = str(hospital["adminId"])

            return JsonResponse({"status": "success", "hospitals": hospitals})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def update_hospital(request, hospital_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            update_data = {k: v for k, v in data.items() if k in ["name", "location", "contactNo", "adminId"]}

            result = hospitals_collection.update_one({"_id": ObjectId(hospital_id)}, {"$set": update_data})

            if result.modified_count > 0:
                return JsonResponse({"status": "success", "message": "Hospital updated successfully"})
            return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def delete_hospital(request, hospital_id):
    if request.method == "DELETE":
        try:
            result = hospitals_collection.delete_one({"_id": ObjectId(hospital_id)})

            if result.deleted_count > 0:
                return JsonResponse({"status": "success", "message": "Hospital deleted successfully"})
            return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)