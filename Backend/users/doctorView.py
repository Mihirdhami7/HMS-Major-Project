from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from bson.objectid import ObjectId

# Import MongoDB collections from the central views.py file
from users.views import users_collection
# Doctors all backend code 
@csrf_exempt
def get_doctors_by_hospital(request, hospital_id):
    if request.method == "GET":
        try:
            doctors = list(users_collection.find({
                "userType": "Doctor",
                "hospital_id": hospital_id
            }))
            
            for doctor in doctors:
                doctor["_id"] = str(doctor["_id"])
                doctor.pop("hpassword", None)  # Remove sensitive data
            
            return JsonResponse({"status": "success", "doctors": doctors}, safe=False)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)



@csrf_exempt
def get_doctor_details(request):
    if request.method == "GET":
        try:
            # Fetch all doctors from MongoDB
            doctors = list(users_collection.find({"userType": "Doctor"}))

            # Add error handling if no doctors found
            if not doctors:
                return JsonResponse({
                    "status": "success",
                    "doctors": [],
                    "message": "No doctors found"
                }, safe=False)

            # Convert ObjectId to string
            for doctor in doctors:
                doctor["_id"] = str(doctor["_id"])
                doctor["name"] = doctor.get("name", "Unknown")
                doctor["doctorQualification"] = doctor.get("doctorQualification")
                doctor["doctorSpecialization"] = doctor.get("doctorSpecialization")
                doctor["email"] = doctor.get("email", "Not Provided")
                doctor["image"] = doctor.get("image", "default-doctor.png")  # Optional

            return JsonResponse({"status": "success", "doctors": doctors}, safe=False)

        except Exception as e:
            print(f"Error in get_doctor_details: {str(e)}")  # Add logging
            return JsonResponse({
                "status": "error", 
                "message": "Failed to fetch doctor details"
            }, status=500)



@csrf_exempt
def update_doctor(request, doctor_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            
            # Ensure only allowed fields are updated
            allowed_fields = {"name", "phone", "email", "doctorSpecialization", "qualification", "hospital_id"}
            update_data = {key: data[key] for key in data if key in allowed_fields}
            
            result = users_collection.update_one(
                {"_id": ObjectId(doctor_id), "userType": "Doctor"},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return JsonResponse({"status": "success", "message": "Doctor updated successfully"})
            else:
                return JsonResponse({"status": "error", "message": "No changes made or doctor not found"}, status=404)
                
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def delete_doctor(request, doctor_id):
    if request.method == "DELETE":
        try:
            result = users_collection.delete_one({"_id": ObjectId(doctor_id), "userType": "Doctor"})
            
            if result.deleted_count > 0:
                return JsonResponse({"status": "success", "message": "Doctor deleted successfully"})
            else:
                return JsonResponse({"status": "error", "message": "Doctor not found"}, status=404)
                
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)