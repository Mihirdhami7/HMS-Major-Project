from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson.objectid import ObjectId

# Import MongoDB collections from a central location
from users.views import departments_collection, hospitals_collection

@csrf_exempt
def add_department(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Ensure hospital exists
            hospital = hospitals_collection.find_one({"_id": ObjectId(data["hospitalId"])})
            if not hospital:
                return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

            # Check if department already exists in the hospital
            existing_department = departments_collection.find_one({
                "name": data["name"],
                "hospitalId": data["hospitalId"]
            })
            if existing_department:
                return JsonResponse({"status": "error", "message": "Department already exists in this hospital"}, status=400)

            # Insert department
            department_data = {
                "name": data["name"],
                "hospitalId": data["hospitalId"],
                "created_at": datetime.now()
            }
            result = departments_collection.insert_one(department_data)

            if result.inserted_id:
                return JsonResponse({"status": "success", "message": "Department added successfully", "departmentId": str(result.inserted_id)})
            return JsonResponse({"status": "error", "message": "Failed to add department"}, status=500)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def add_department(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Ensure hospital exists
            hospital = hospitals_collection.find_one({"_id": ObjectId(data["hospitalId"])})
            if not hospital:
                return JsonResponse({"status": "error", "message": "Hospital not found"}, status=404)

            # Check if department already exists in the hospital
            existing_department = departments_collection.find_one({
                "name": data["name"],
                "hospitalId": data["hospitalId"]
            })
            if existing_department:
                return JsonResponse({"status": "error", "message": "Department already exists in this hospital"}, status=400)

            # Insert department
            department_data = {
                "name": data["name"],
                "hospitalId": data["hospitalId"],
                "created_at": datetime.now()
            }
            result = departments_collection.insert_one(department_data)

            if result.inserted_id:
                return JsonResponse({"status": "success", "message": "Department added successfully", "departmentId": str(result.inserted_id)})
            return JsonResponse({"status": "error", "message": "Failed to add department"}, status=500)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)