from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson.objectid import ObjectId

# Import MongoDB collections from a central location
from users.views import hospitals_collection

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