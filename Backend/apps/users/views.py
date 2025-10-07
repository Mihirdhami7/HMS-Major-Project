from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from bson.objectid import ObjectId
from datetime import datetime

# Import MongoDB collections from the central views.py file
from backend.db import users_collection, doctors_collection, departments_collection
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

            departmentName = request.GET.get("departmentName")
            hospital_name = request.GET.get("hospitalName")

            if not hospital_name:
                return JsonResponse({
                    "status": "error",
                    "message": "Hospital name is required"
                }, status=400)
            
            print(f"Fetching doctors for hospital: {hospital_name}")

            # Fetch all doctors from MongoDB
            doctors = list(doctors_collection.find({
                "userType": "Doctor",
                "Department": departmentName,
                "Hospital": hospital_name
            }))

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
                doctor["email"] = doctor.get("email", "Not Provided")
                doctor["doctorQualification"] = doctor.get("doctorQualification")
                doctor["doctorSpecialization"] = doctor.get("doctorSpecialization")
                doctor["description"] = doctor.get("description", "No description available")
                doctor["contactNo"] = doctor.get("contactNo", "Not Provided")
                doctor["rating"] = doctor.get("rating", 0)  # Default rating
                doctor["time_slot"] = doctor.get("time_slot", "Not Provided")
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
def add_doctor(request,):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            department_id = data.get("departmentId")
            hospital_name = data.get("hospitalName")
            
            # Get department details
            department = departments_collection.find_one({"_id": ObjectId(department_id)})
            if not department:
                return JsonResponse({"status": "error", "message": "Department not found"}, status=404)
            
            # Prepare doctor data
            doctor_data = {
                "name": data.get("name"),
                "email": data.get("email"),
                "doctorQualification": data.get("qualification"),
                "doctorSpecialization": data.get("specialization"),
                "experience": data.get("experience"),
                "roles": data.get("roles", []),
                "Department": department.get("Department"),  
                "Hospital": department.get("hospitalName"),
                "rating": 0,  # Default rating
                "created_at": datetime.now()
            }
            
            # Insert doctor
            result = doctors_collection.insert_one(doctor_data)
            
            if result.inserted_id:
                # Return the created doctor with proper formatting
                doctor_response = {
                    "_id": str(result.inserted_id),
                    "name": doctor_data["name"],
                    "email": doctor_data["email"],
                    "qualification": doctor_data["doctorQualification"],
                    "specialization": doctor_data["doctorSpecialization"],
                    "experience": doctor_data["experience"],
                    "roles": doctor_data["roles"],
                    "department": doctor_data["Department"],
                    "hospital": doctor_data["Hospital"]
                }
                
                return JsonResponse({
                    "status": "success", 
                    "message": "Doctor added successfully", 
                    "doctor": doctor_response
                }, status=201)
                
            return JsonResponse({"status": "error", "message": "Failed to add doctor"}, status=500)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def delete_doctor(request, doctorId):
    if request.method == "DELETE":
        try:
            # First check if doctor exists
            doctor = doctors_collection.find_one({"_id": ObjectId(doctorId)})
            if not doctor:
                return JsonResponse({"status": "error", "message": "Doctor not found"}, status=404)
            
            # Delete the doctor
            result = doctors_collection.delete_one({"_id": ObjectId(doctorId)})
            
            if result.deleted_count:
                return JsonResponse({"status": "success", "message": "Doctor deleted successfully"})
            return JsonResponse({"status": "error", "message": "Failed to delete doctor"}, status=500)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def assign_doctor_role(request, doctor_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            roles = data.get("roles", [])
            
            # Update doctor roles
            result = doctors_collection.update_one(
                {"_id": ObjectId(doctor_id)},
                {"$set": {"roles": roles}}
            )
            
            if result.modified_count:
                # Check if "Department Head" role is assigned
                if "Department Head" in roles:
                    # Get doctor details
                    doctor = doctors_collection.find_one({"_id": ObjectId(doctor_id)})
                    if doctor:
                        # Update department with new head
                        departments_collection.update_many(
                            {"Department": doctor.get("Department"), "Hospital": doctor.get("Hospital")},
                            {"$set": {"Head of Department": doctor.get("name")}}
                        )
                
                return JsonResponse({"status": "success", "message": "Doctor roles updated successfully"})
            return JsonResponse({"status": "error", "message": "Doctor not found or no changes made"}, status=404)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)


# ...existing code...

@csrf_exempt
def get_pending_doctors(request, hospital_name):
    """Fetch doctors from users collection that are not yet in doctors collection"""
    if request.method == "GET":
        try:
            # Find all users with userType "Doctor" in the given hospital
            all_doctors_in_users = list(users_collection.find({
                "userType": "Doctor",
                "hospitalName": hospital_name
            }))
            
            # Get emails of already approved doctors in doctors collection
            approved_doctor_emails = set(
                doctor["email"] for doctor in doctors_collection.find({
                    "Hospital": hospital_name
                }, {"email": 1})
            )
            
            # Filter out doctors who are already in the doctors collection
            pending_doctors = []
            for doctor in all_doctors_in_users:
                if doctor.get("email") and doctor["email"] not in approved_doctor_emails:
                    # Convert ObjectId to string for JSON serialization
                    doctor["_id"] = str(doctor["_id"])
                    pending_doctors.append(doctor)
            
            return JsonResponse({
                "status": "success",
                "pendingDoctors": pending_doctors
            }, safe=False)
            
        except Exception as e:
            print(f"Error fetching pending doctors: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)


@csrf_exempt
def approve_doctor(request):
    """Approve a pending doctor by adding them to the doctors collection"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            doctor_email = data.get("email")
            hospial_name = data.get("hospitalName")
            department_name = data.get("departmentName")
            department_id = data.get("departmentId")  # Get department ID from request

            # Find the user in users collection
            user = users_collection.find_one({"email": doctor_email, "userType": "Doctor", "hospitalName": hospial_name})
            if not user:
                return JsonResponse({
                    "status": "error",
                    "message": "Doctor not found in users collection"
                }, status=404)
            
            # Check if doctor with this email already exists in doctors collection
            existing_doctor = doctors_collection.find_one({"email": user["email"], "Hospital": hospial_name})
            if existing_doctor:
                return JsonResponse({
                    "status": "error",
                    "message": "Doctor already exists in doctors collection"
                }, status=400)
            
            # Create new doctor entry from user data
            doctor_data = {
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "userType": "Doctor",
                "doctorQualification": user.get("doctorQualification", ""),
                "doctorSpecialization": user.get("doctorSpecialization", ""),
                "contactNo": user.get("contactNo", ""),
                "Department": user.get("department", ""),
                "Hospital": user.get("hospitalName", ""),
                "depatment": department_name,
                "departmentId": department_id,  # Add department ID to doctor data
                "status": "approved",
                "image": user.get("image", "default-doctor.png"),
                "approved_at": datetime.now(),
                "created_at": user.get("created_at", datetime.now())
            }
            
            # Insert into doctors collection
            result = doctors_collection.insert_one(doctor_data)
            
            if result.inserted_id:
                # Update user in users collection to mark as approved
                users_collection.update_one(
                    {"email": doctor_email, "userType": "Doctor"},
                    {"$set": {"isApproved": True}}
                )
                
                # Format response
                doctor_data["_id"] = str(result.inserted_id)
                
                return JsonResponse({
                    "status": "success",
                    "message": "Doctor approved successfully",
                    "doctor": doctor_data
                })
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "Failed to add doctor to doctors collection"
                }, status=500)
                
        except Exception as e:
            print(f"Error approving doctor: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)


@csrf_exempt
def reject_doctor(request):
    """Reject a pending doctor application"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            doctor_email = data.get("email")
            hospital_name = data.get("hospitalName")

            if not doctor_email or not hospital_name:
                return JsonResponse({
                    "status": "error",
                    "message": "Email and hospital name are required"
                }, status=400)
            
            # Find and delete the doctor from users collection
            result = users_collection.delete_one({
                "email": doctor_email, 
                "userType": "Doctor", 
                "hospitalName": hospital_name,
            })
            
            if result.deleted_count > 0:
                return JsonResponse({
                    "status": "success",
                    "message": "Doctor application rejected successfully"
                })
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "Doctor not found or already rejected"
                }, status=404)
                
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_doctor_by_email(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            hospital_name = data.get("hospitalName")
            
            if not email:
                return JsonResponse({"status": "error", "message": "Email is required"}, status=400)
            
            if not hospital_name:
                return JsonResponse({"status": "error", "message": "Hospital name is required"}, status=400)
            
            doctor = doctors_collection.find_one({"email": email, "Hospital": hospital_name})
            if not doctor:
                return JsonResponse({"status": "error", "message": "Doctor not found"}, status=404)
            
            # Convert ObjectId to string
            doctor["_id"] = str(doctor["_id"])
            
            return JsonResponse({"status": "success", "doctor": doctor}, safe=False)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
        

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import EmailMultiAlternatives
import json
import random
import string
import bcrypt
from datetime import datetime
from bson.objectid import ObjectId
import backend.settings as backend_settings

# Import MongoDB collections from centralized location
from backend.db import users_collection

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
                if not backend_settings.EMAIL_HOST_USER:
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
                    from_email=f'HMS Team <{backend_settings.EMAIL_HOST_USER}>',
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