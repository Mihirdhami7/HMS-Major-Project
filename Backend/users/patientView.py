from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import EmailMultiAlternatives
import json
import random
import string
import bcrypt
from datetime import datetime
from bson.objectid import ObjectId
import backend.settings as settings

# Import MongoDB collections from centralized location
from users.views import users_collection

# SECRET_KEY = "1fy%j02cvs&0$)-ny@3pj6l$+p)%cl6_ogu0h8-z=!&sy*v_ju"

@csrf_exempt
def add_patient(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            required_fields = ["name", "email", "contactNo", "gender", "dateOfBirth"]
            
            # Validate required fields
            for field in required_fields:
                if not data.get(field):
                    return JsonResponse({
                        "status": "error",
                        "message": f"{field} is required"
                    }, status=400)
            
            # Check if email already exists
            existing_user = users_collection.find_one({"email": data["email"]})
            if existing_user:
                return JsonResponse({
                    "status": "error",
                    "message": "Email already registered"
                }, status=400)
            
            # Generate a random password for the new user
            random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            hashed_password = bcrypt.hashpw(random_password.encode('utf-8'), bcrypt.gensalt())

            # Create new user record
            new_user = {
                "name": data["name"],
                "email": data["email"],
                "contactNo": data["contactNo"],
                "gender": data["gender"],
                "dateOfBirth": data["dateOfBirth"],
                "address": data.get("address", ""),
                "userType": "Patient",
                "password": hashed_password.decode('utf-8'),  # Store hashed password
                "createdAt": datetime.now(),
            }
            # Insert into database
            result = users_collection.insert_one(new_user)

            patient_email= data["email"]
            try:
                if not settings.EMAIL_HOST_USER:
                    raise ValueError("EMAIL_HOST_USER is not configured in settings.")
                appointment_body = f"""
                Hello {patient_email},

                        You have successfully registered as a patient on our platform, you can now book your appointment further.
                        Your login credentials are:
                        Email: {patient_email}
                        Password: {random_password}
                        Best regards,
                        The Healthcare Team
                    """
                email_subject = "Account Registered Successfully"
                
                email_message = EmailMultiAlternatives(
                    subject=email_subject,
                    body=appointment_body,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[patient_email],
                )
                email_message.send(fail_silently=False)
            
            except Exception as e:
                print(f"Failed to send welcome email: {e}")
            
            return JsonResponse({
                "status": "success",
                "message": "Patient registered successfully",
                "patientId": str(result.inserted_id)
            })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_patient(request, patient_id):
    if request.method == "GET":
        try:
            patient = users_collection.find_one({"_id": ObjectId(patient_id), "userType": "Patient"})
            
            if patient:
                patient["_id"] = str(patient["_id"])
                return JsonResponse({"status": "success", "patient": patient})
            
            return JsonResponse({"status": "error", "message": "Patient not found"}, status=404)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def search_patient(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            query = data.get("query")

            # Search by multiple fields
            patient = users_collection.find_one({
                "$or": [
                    {"_id": ObjectId(query) if len(query) == 24 else None},
                    {"name": {"$regex": query, "$options": "i"}},
                    {"email": {"$regex": query, "$options": "i"}},
                    {"contactNo": query}
                ],
                "userType": "Patient"
            })

            if patient:
                patient["_id"] = str(patient["_id"])
                return JsonResponse({"status": "success", "patient": patient})
            
            return JsonResponse({"status": "error", "message": "Patient not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def update_patient(request, patient_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            
            result = users_collection.update_one(
                {"_id": ObjectId(patient_id), "userType": "Patient"},
                {"$set": data}
            )
            
            if result.modified_count > 0:
                return JsonResponse({"status": "success", "message": "Patient updated successfully"})
            
            return JsonResponse({"status": "error", "message": "Patient not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def delete_patient(request, patient_id):
    if request.method == "DELETE":
        try:
            result = users_collection.delete_one({"_id": ObjectId(patient_id), "userType": "Patient"})
            
            if result.deleted_count > 0:
                return JsonResponse({"status": "success", "message": "Patient deleted successfully"})
            
            return JsonResponse({"status": "error", "message": "Patient not found"}, status=404)
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_patient_by_email(request):
    """Fetch patient details by email for appointment booking"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            
            if not email:
                return JsonResponse({
                    "status": "error",
                    "message": "Email is required"
                }, status=400)
            
            # Find the patient in users collection
            patient = users_collection.find_one({"email": email, "userType": "Patient"})
            
            if not patient:
                return JsonResponse({
                    "status": "error",
                    "message": "No patient found with this email"
                }, status=404)
            
            # Remove sensitive data and convert ObjectId to string
            patient_data = {
                "id": str(patient["_id"]),
                "name": patient.get("name", ""),
                "email": patient.get("email", ""),
                "contactNo": patient.get("contactNo", ""),
                "gender": patient.get("gender", ""),
                "dateOfBirth": patient.get("dateOfBirth", ""),
                "address": patient.get("address", "")
            }
            
            # Add optional fields if they exist
            if "bloodGroup" in patient:
                patient_data["bloodGroup"] = patient["bloodGroup"]
            
            if "height" in patient:
                patient_data["height"] = patient["height"]
                
            if "weight" in patient:
                patient_data["weight"] = patient["weight"]
            
            return JsonResponse({
                "status": "success",
                "patient": patient_data
            })
            
        except Exception as e:
            print(f"Error fetching patient by email: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)