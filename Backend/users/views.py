from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.core.exceptions import ValidationError
import bcrypt
from pymongo import MongoClient
import json
import jwt as pyjwt
import datetime
import random
import string
from datetime import datetime, timedelta
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from pymongo.errors import ConnectionFailure
import ssl
from bson.objectid import ObjectId

from django.contrib.sessions.models import Session
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone


# Update MongoDB connection
try:
    client = MongoClient(settings.MONGO_URI)
    # Test the connection
    client.admin.command('ping')
    db = client[settings.MONGO_DATABASE]
    users_collection = db["users"]
    temp_users_collection = db["temp_users"]
    otp_collection = db["otps"]
    payments_collection = db["payments"]
    departments_collection = db["departments"]
    hospitals_collection = db["hospitals"]

    departments_collection = db["departments"]
    products_collection = db["products"]
    notifications_collection = db["notifications"]


    temp_appointments_collection = db["temp_appointments"]
    appointments_collection = db["appointments"]

    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}")

SECRET_KEY = "1fy%j02cvs&0$)-ny@3pj6l$+p)%cl6_ogu0h8-z=!&sy*v_ju"


# logic for user registration, verification and login views 

def generate_otp():
    """Generate a random 6-digit OTP."""
    return "".join(random.choices(string.digits, k=6))

@csrf_exempt
def register_user(request):
    if request.method == "POST":
        try:
            data = request.POST.dict() if request.content_type.startswith('multipart') else json.loads(request.body)
            
            email = data.get("email")
            if not email:
                return JsonResponse({"status": "error", "message": "Email is required"}, status=400)

            existing_user = users_collection.find_one({"email": email})
            if existing_user:
                return JsonResponse({"status": "error", "message": "User already exists"}, status=400)

            otp = generate_otp()
            expiry_time = datetime.utcnow() + timedelta(minutes=2) 

            temp_user_data = {
                "email": email,
                "name": data.get("name"),
                "password": data.get("password"),
                "contactNo": data.get("contactNo"),
                "userType": data.get("userType", "Patient"),
                "gender": data.get("gender"),
                "dateOfBirth": data.get("dateOfBirth"),
                "hospitalName": data.get("hospitalName"),
                "created_at": datetime.utcnow(),
                "photo": None  # Default photo value
            }

            # Handle photo upload if present
            if request.FILES and 'photo' in request.FILES:
                photo = request.FILES['photo']
                photo_name = default_storage.save(
                    f"profile_photos/{email}/{photo.name}", 
                    ContentFile(photo.read())
                )
                temp_user_data["photo"] = default_storage.url(photo_name)

            # Add doctor-specific fields if userType is Doctor
            if data.get("userType") == "Doctor":
                temp_user_data.update({
                    "doctorQualification": data.get("doctorQualification"),
                    "doctorSpecialization": data.get("doctorSpecialization")
                })

                if request.FILES and 'doctorCertificate' in request.FILES:
                    certificate = request.FILES['doctorCertificate']
                    cert_path = f"doctor_certificates/{email}/{certificate.name}"
                    cert_name = default_storage.save(cert_path, ContentFile(certificate.read()))
                    temp_user_data["doctorCertificate"] = settings.MEDIA_URL + cert_name

            # Store OTP with expiry time
            otp_collection.insert_one({
                "email": email,
                "otp": otp,
                "created_at": datetime.utcnow(),
                "expires_at": expiry_time,
                "verified": False
            })

            # Store temporary user data
            temp_users_collection.insert_one(temp_user_data)

            # Send OTP via email
            try:
                if not settings.EMAIL_HOST_USER:
                    raise ValueError("EMAIL_HOST_USER is not configured in settings.")

                html_message = render_to_string('email/verification.html', {'name': data.get('name'), 'otp': otp})
                plain_message = strip_tags(html_message)

                # Send email
                email_message = EmailMultiAlternatives(
                    subject="HMS - Email Verification OTP",
                    body=plain_message,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[email],
                )
                email_message.attach_alternative(html_message, "text/html")
                email_message.send(fail_silently=False)

                print(f"OTP email sent successfully to {email}")

            except Exception as e:
                print(f"Error sending email: {str(e)}")
                import traceback
                print(traceback.format_exc())
                
                return JsonResponse({
                    "status": "error",
                    "message": "Failed to send OTP email. Please try again."
                }, status=500)

            return JsonResponse({
                "status": "success",
                "message": "Please check your email for verification OTP"
            }, status=200)

        except Exception as e:
            print(f"Registration error: {str(e)}")
            return JsonResponse({
                "status": "error", 
                "message": f"Registration failed: {str(e)}"
            }, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)

@csrf_exempt
def verify_email(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            otp = data.get("otp")

            otp_record = otp_collection.find_one({
                "email": email,
                "otp": otp,
                "verified": False
            })

            if not otp_record:
                return JsonResponse({"status": "error", "message": "Invalid OTP"}, status=400)

            # Check if OTP has expired
            current_time = datetime.utcnow()
            if current_time > otp_record["expires_at"]:
                otp_collection.delete_one({"_id": otp_record["_id"]})
                return JsonResponse({
                    "status": "error", 
                    "message": "OTP has expired. Please request a new one"
                }, status=400)

            # Get user data from temp collection
            temp_user = temp_users_collection.find_one({"email": email})
            if not temp_user:
                return JsonResponse({"status": "error", "message": "User data not found"}, status=400)

            try:
                if '_id' in temp_user:
                    del temp_user['_id']

                password = temp_user.get("password")
                if password:
                    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
                    temp_user["hpassword"] = hashed_password.decode("utf-8")
                
                result = users_collection.insert_one(temp_user)
                
                if not result.inserted_id:
                    raise Exception("Failed to insert user")

                # Clean up temp data
                otp_collection.delete_one({"_id": otp_record["_id"]})
                temp_users_collection.delete_one({"email": email})

                return JsonResponse({
                    "status": "success",
                    "message": "Email verified successfully"
                }, status=200)

            except Exception as e:
                print(f"Error storing user: {str(e)}")
                return JsonResponse({
                    "status": "error",
                    "message": f"Error storing user: {str(e)}"
                }, status=500)

        except Exception as e:
            print(f"Verification error: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)


@csrf_exempt
def login_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")
            category = data.get("category")

            if not email or not password:
                return JsonResponse({
                    "status": "error",
                    "message": "Email and password are required"
                }, status=400)
            
            # For Superadmin, ignore category filter
            if email.lower() == "21it402@bvmengineering.ac.in":
                user = users_collection.find_one({"email": email})
            else:
                user = users_collection.find_one({"email": email, "userType": category})

            if not user:
                return JsonResponse({
                    "status": "error",
                    "message": "User not found or invalid category"
                }, status=404)

            stored_hashed_password = user.get("hpassword", "").encode("utf-8")
            if not stored_hashed_password or not bcrypt.checkpw(password.encode("utf-8"), stored_hashed_password):
                return JsonResponse({
                    "status": "error",
                    "message": "Invalid email or password"
                }, status=401)

            # Create and store session using Django's session framework
            request.session["user_email"] = user["email"]
            request.session["userType"] = user["userType"]
            
            request.session.set_expiry(14400)  # 4 hours

            return JsonResponse({
                "status": "success",
                "message": "Login successful",
                "userData": {
                    "email": user["email"],
                    "userType": user["userType"]
                }
            })
        except Exception as e:
            print(f"Login error: {str(e)}")
            return JsonResponse({"status": "error", "message": "Login failed"}, status=500)

    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def logout_view(request):
    if request.method == "POST":
        try:
            # Clear the session using Django's session framework
            request.session.flush()
            return JsonResponse({
                "status": "success",
                "message": "Logged out successfully"
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)












# logic for user profile and update views

# user profile all backend code
@csrf_exempt
def get_user_profile(request, user_type, email):
    if request.method == "GET":
        try:
            print(f"Fetching profile for {user_type}: {email}")
            
            # Verify token
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return JsonResponse({"status": "error", "message": "No token provided"}, status=401)
            
            token = auth_header.split(' ')[1]
            try:
                payload = pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
                return JsonResponse({"status": "error", "message": "Invalid token"}, status=401)

            # Find user in MongoDB
            user = users_collection.find_one({
                "email": email,
                "userType": user_type.capitalize()  # Match user type
            })
            
            if not user:
                return JsonResponse({
                    "status": "error", 
                    "message": f"User not found with email: {email} and type: {user_type}"
                }, status=404)
            
            # Convert ObjectId to string
            user["_id"] = str(user["_id"])
            
            # Remove sensitive information
            if "hpassword" in user:
                del user["hpassword"]
            
            return JsonResponse(user, status=200, safe=False)
            
        except Exception as e:
            print(f"Error in get_user_profile: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def update_user_profile(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            user_type = data.get('userType')

            # Remove fields that shouldn't be updated
            data.pop('email', None)
            data.pop('userType', None)
            data.pop('_id', None)

            # Update the user in MongoDB
            result = users_collection.update_one(
                {"email": email, "userType": user_type},
                {"$set": data}
            )

            if result.modified_count > 0:
                return JsonResponse({
                    "status": "success",
                    "message": "Profile updated successfully"
                })
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "No changes made to profile"
                }, status=400)

        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)

    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)













# logic for doctor views where fetch doctor by hospital name
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
def get_doctors_by_department(request, department_id):
    if request.method == "GET":
        try:
            doctors = list(users_collection.find({
                "userType": "Doctor",
                "departmentId": department_id
            }))

            for doctor in doctors:
                doctor["_id"] = str(doctor["_id"])
                doctor["departmentId"] = str(doctor["departmentId"])

            return JsonResponse({"status": "success", "doctors": doctors})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def get_doctor_details(request, doctor_id):
    if request.method == "GET":
        try:
            doctor = users_collection.find_one({"_id": ObjectId(doctor_id), "userType": "Doctor"})
            
            if not doctor:
                return JsonResponse({"status": "error", "message": "Doctor not found"}, status=404)
            
            doctor["_id"] = str(doctor["_id"])
            doctor.pop("hpassword", None)
            
            return JsonResponse({"status": "success", "doctor": doctor})
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

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
def add_doctor(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            if not all(key in data for key in ["name", "email", "phone", "doctorSpecialization", "hospital_id", "password"]):
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            # Hash password before storing
            hashed_password = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())
            data["hpassword"] = hashed_password.decode("utf-8")
            del data["password"]
            
            # Set userType
            data["userType"] = "Doctor"
            
            result = users_collection.insert_one(data)
            
            return JsonResponse({"status": "success", "message": "Doctor added successfully", "doctorId": str(result.inserted_id)})
                
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













# logic for patient views where add patient, verify patient, search patient and book appointment

# patient all backend code

@csrf_exempt
def add_patient(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Check if patient already exists
            if users_collection.find_one({"email": data["email"], "userType": "Patient"}):
                return JsonResponse({"status": "error", "message": "Patient already exists"}, status=400)
            
            # Create new patient
            patient_data = {
                "name": data["name"],
                "email": data["email"],
                "contactNo": data["contactNo"],
                "gender": data["gender"],
                "dateOfBirth": data["dateOfBirth"],
                "address": data["address"],
                "userType": "Patient",
                "created_at": datetime.now()
            }
            
            result = users_collection.insert_one(patient_data)
            
            if result.inserted_id:
                patient_data["_id"] = str(result.inserted_id)
                return JsonResponse({"status": "success", "message": "Patient registered successfully", "patient": patient_data})
            
            return JsonResponse({"status": "error", "message": "Failed to register patient"}, status=500)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ✅ Fetch patient details by ID
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

# ✅ Search for a patient (by ID, name, email, or contact number)
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

# ✅ Update patient details
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

# ✅ Delete a patient
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












# logic for appointment views where fetch appointment, update appointment, delete appointment and book appointment

# appointment all backend code
@csrf_exempt
def book_appointment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Validate Doctor
            doctor = users_collection.find_one({
                "_id": ObjectId(data["doctorId"]),
                "userType": "Doctor"
            })
            if not doctor:
                return JsonResponse({"status": "error", "message": "Doctor not found"}, status=404)

            # Validate Patient
            patient = users_collection.find_one({
                "_id": ObjectId(data["patientId"]),
                "userType": "Patient"
            })
            if not patient:
                return JsonResponse({"status": "error", "message": "Patient not found"}, status=404)

            # # Store Payment (Pending)
            # payment_data = {
            #     "patientId": data["patientId"],
            #     "amount": data["amount"],
            #     "paymentStatus": "Pending",
            #     "created_at": datetime.now()
            # }
            # payment_result = payments_collection.insert_one(payment_data)
            # payment_id = str(payment_result.inserted_id)

            # Store Appointment in Temporary Collection
            temp_appointment_data = {
                "patientId": data["patientId"],
                "doctorId": data["doctorId"],
                "hospital": data["hospital"],
                "department": data["department"],
                "date": data["date"],
                "timeSlot": data["timeSlot"],  # Now accepting selected time slot
                "healthIssues": data["healthIssues"],
                "status": "Pending",  # Awaiting admin approval
                "paymentId": "null",
                "created_at": datetime.now()
            }

            result = temp_appointments_collection.insert_one(temp_appointment_data)

            if result.inserted_id:
                return JsonResponse({
                    "status": "success",
                    "message": "Appointment request submitted. Awaiting approval.",
                    "appointmentId": str(result.inserted_id)
                })

            return JsonResponse({"status": "error", "message": "Failed to book appointment"}, status=500)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ✅ Fetch Appointments (Admin: All, Patient: Their own, Doctor: Assigned to them)
@csrf_exempt
def get_appointments(request, user_id):
    if request.method == "GET":
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return JsonResponse({"status": "error", "message": "User not found"}, status=404)

            query = {}
            if user["userType"] == "Admin":
                query = {}  # Fetch all appointments
            elif user["userType"] == "Doctor":
                query = {"doctorId": user_id, "status": "Approved"}
            elif user["userType"] == "Patient":
                query = {"patientId": user_id}

            appointments = list(appointments_collection.find(query))
            for appointment in appointments:
                appointment["_id"] = str(appointment["_id"])
                appointment["doctorId"] = str(appointment["doctorId"])
                appointment["patientId"] = str(appointment["patientId"])

            return JsonResponse({"status": "success", "appointments": appointments})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ✅ Approve/Reject Appointment (Admin assigns time slot)
@csrf_exempt
def approve_appointment(request, appointment_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            if data["status"] not in ["Approved", "Rejected"]:
                return JsonResponse({"status": "error", "message": "Invalid status"}, status=400)

            update_data = {"status": data["status"]}
            if data["status"] == "Approved":
                update_data["timeSlot"] = data["timeSlot"]  # Assign time slot

            result = appointments_collection.update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": update_data}
            )

            if result.modified_count > 0:
                return JsonResponse({"status": "success", "message": f"Appointment {data['status']}"})
            return JsonResponse({"status": "error", "message": "Appointment not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)



# ✅ Fetch Pending Appointments (For Admin Approval)
@csrf_exempt
def get_pending_appointments(request):
    if request.method == "GET":
        try:
            appointments = list(appointments_collection.find({"status": "Pending"}))

            for appointment in appointments:
                appointment["_id"] = str(appointment["_id"])
                appointment["doctorId"] = str(appointment["doctorId"])
                appointment["patientId"] = str(appointment["patientId"])

            return JsonResponse({"status": "success", "appointments": appointments})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)













# logic for payment views where fetch payment, update payment and delete payment

# payment all backend code
# ✅ Payment Update After Confirmation
@csrf_exempt
def update_payment_status(request, payment_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            if data["paymentStatus"] not in ["Completed", "Failed"]:
                return JsonResponse({"status": "error", "message": "Invalid payment status"}, status=400)

            result = payments_collection.update_one(
                {"_id": ObjectId(payment_id)},
                {"$set": {"paymentStatus": data["paymentStatus"]}}
            )

            if result.modified_count > 0:
                return JsonResponse({"status": "success", "message": "Payment updated"})
            return JsonResponse({"status": "error", "message": "Payment not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)













# logic for department views where add department, get department, update department

# department all backend code



# ✅ Add a New Hospital (Super Admin)
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

# ✅ Fetch All Hospitals (For Super Admin)
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

# ✅ Update Hospital Details (Super Admin)
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

# ✅ Delete Hospital (Super Admin)
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

# ✅ Add Department to a Hospital (Admin)
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

# ✅ Fetch Departments by Hospital ID
@csrf_exempt
def get_departments(request, hospital_id):
    if request.method == "GET":
        try:
            departments = list(departments_collection.find({"hospitalId": hospital_id}))

            for department in departments:
                department["_id"] = str(department["_id"])
                department["hospitalId"] = str(department["hospitalId"])

            return JsonResponse({"status": "success", "departments": departments})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ✅ Update Department (Admin)
@csrf_exempt
def update_department(request, department_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            update_data = {k: v for k, v in data.items() if k == "name"}

            result = departments_collection.update_one({"_id": ObjectId(department_id)}, {"$set": update_data})

            if result.modified_count > 0:
                return JsonResponse({"status": "success", "message": "Department updated successfully"})
            return JsonResponse({"status": "error", "message": "Department not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ✅ Delete Department (Admin)
@csrf_exempt
def delete_department(request, department_id):
    if request.method == "DELETE":
        try:
            result = departments_collection.delete_one({"_id": ObjectId(department_id)})

            if result.deleted_count > 0:
                return JsonResponse({"status": "success", "message": "Department deleted successfully"})
            return JsonResponse({"status": "error", "message": "Department not found"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)








# logic for product views where add product, get product, update product, delete product, check stock levels, request stock restock, supplier add stock, supplier get products, send low stock notification

# product all backend code

# Helper function to format ObjectId
def format_product(product):
    product["_id"] = str(product["_id"])
    return product

@csrf_exempt
def add_product(request):
    """ Adds a new product to the inventory. Only suppliers should use this. """
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Validate required fields
            required_fields = ["name", "category", "supplier", "quantity", "threshold", "price", "expiry_date"]
            if not all(field in data for field in required_fields):
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            product = {
                "name": data["name"],
                "category": data["category"],
                "supplier": data["supplier"],  # Supplier ID or Name
                "quantity": int(data["quantity"]),
                "threshold": int(data["threshold"]),
                "price": float(data["price"]),
                "expiry_date": data["expiry_date"],
                "created_at": datetime.now(),
                "lastRestocked": datetime.now()
            }
            result = products_collection.insert_one(product)
            return JsonResponse({"status": "success", "product_id": str(result.inserted_id)})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def get_products(request):
    """ Fetches all products in the inventory. """
    if request.method == "GET":
        try:
            products = list(products_collection.find())
            return JsonResponse({"status": "success", "products": [format_product(p) for p in products]})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def update_product(request, product_id):
    """ Updates product details. Only admins or suppliers can use this. """
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            result = products_collection.update_one({"_id": ObjectId(product_id)}, {"$set": data})
            if result.modified_count:
                return JsonResponse({"status": "success", "message": "Product updated"})
            return JsonResponse({"status": "error", "message": "No changes made"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def delete_product(request, product_id):
    """ Deletes a product from inventory. """
    if request.method == "DELETE":
        try:
            result = products_collection.delete_one({"_id": ObjectId(product_id)})
            if result.deleted_count:
                return JsonResponse({"status": "success", "message": "Product deleted"})
            return JsonResponse({"status": "error", "message": "Product not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def check_stock_levels(request):
    """ Fetches all products that are low in stock. """
    if request.method == "GET":
        try:
            low_stock_products = list(products_collection.find({"$expr": {"$lt": ["$quantity", "$threshold"]}}))
            return JsonResponse({"status": "success", "low_stock_products": [format_product(p) for p in low_stock_products]})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def request_restock(request, product_id):
    """ Requests restock for a low-stock product. """
    if request.method == "POST":
        try:
            product = products_collection.find_one({"_id": ObjectId(product_id)})
            if product:
                notification = {
                    "product_id": product_id,
                    "message": f"Restock needed for {product['name']}",
                    "timestamp": datetime.now()
                }
                notifications_collection.insert_one(notification)
                return JsonResponse({"status": "success", "message": "Restock request sent"})
            return JsonResponse({"status": "error", "message": "Product not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def add_stock(request, product_id):
    """ Adds stock to an existing product. """
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            added_quantity = int(data.get("quantity", 0))
            result = products_collection.update_one(
                {"_id": ObjectId(product_id)}, 
                {"$inc": {"quantity": added_quantity}, "$set": {"lastRestocked": datetime.now()}}
            )
            if result.modified_count:
                return JsonResponse({"status": "success", "message": "Stock updated"})
            return JsonResponse({"status": "error", "message": "Product not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def supplier_get_products(request, supplier_id):
    """ Fetches products associated with a specific supplier. """
    if request.method == "GET":
        try:
            products = list(products_collection.find({"supplier": supplier_id}))
            return JsonResponse({"status": "success", "products": [format_product(p) for p in products]})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def supplier_add_stock(request, supplier_id, product_id):
    """ Allows a supplier to add stock to their own product. """
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            added_quantity = int(data.get("quantity", 0))

            product = products_collection.find_one({"_id": ObjectId(product_id), "supplier": supplier_id})
            if not product:
                return JsonResponse({"status": "error", "message": "Unauthorized or product not found"}, status=403)

            result = products_collection.update_one(
                {"_id": ObjectId(product_id)}, 
                {"$inc": {"quantity": added_quantity}, "$set": {"lastRestocked": datetime.now()}}
            )
            if result.modified_count:
                return JsonResponse({"status": "success", "message": "Stock updated"})
            return JsonResponse({"status": "error", "message": "Product not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
