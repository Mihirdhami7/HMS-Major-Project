from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.mail import send_mail, EmailMultiAlternatives
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
import hashlib
from datetime import datetime, timedelta
from django.core.mail import EmailMessage
import backend.settings as settings



# Update MongoDB connection
try:
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DATABASE]


    users_collection = db["users"]
    temp_users_collection = db["temp_users"]
    otp_collection = db["otps"]
    sessions_collection = db["sessions"]


    payments_collection = db["payments"]
    departments_collection = db["departments"]
    hospitals_collection = db["hospitals"]

    departments_collection = db["departments"]
    products_collection = db["products"]
    notifications_collection = db["notifications"]
    prescriptions_collection = db["prescriptions"]


    temp_appointments_collection = db["temp_appointments"]
    appointments_collection = db["appointments"]

    print("Successfully connected to MongoDB Atlas!")


except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}")

# SECRET_KEY = "1fy%j02cvs&0$)-ny@3pj6l$+p)%cl6_ogu0h8-z=!&sy*v_ju"


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
            expiry_time = datetime.now() + timedelta(minutes=2) 

            temp_user_data = {
                "email": email,
                "name": data.get("name"),
                "password": data.get("password"),
                "contactNo": data.get("contactNo"),
                "userType": data.get("userType", "Patient"),
                "gender": data.get("gender"),
                "dateOfBirth": data.get("dateOfBirth"),
                "hospitalName": data.get("hospitalName"),
                "created_at": datetime.now(),
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

            print(f"opt for EasyTreat system: {otp}")

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








# Function to clear expired sessions
def clear_expired_sessions():
    now = datetime.now()
    sessions_collection.delete_many({"expires_at": {"$lt": now}})

# Function to generate a session ID
def generate_session_id(email):
    timestamp = datetime.now().isoformat()
    session_id = hashlib.sha256(f"{email}{timestamp}".encode()).hexdigest()
    return session_id

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        try:
            clear_expired_sessions()  # Remove expired sessions before login

            data = json.loads(request.body)
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")
            category = data.get("category", "")

            if not email or not password:
                return JsonResponse({"status": "error", "message": "Email and password are required"}, status=400)

            # User lookup
            user_query = {"email": email}
            if email != "21it402@bvmengineering.ac.in":  # Exclude super admin
                user_query["userType"] = category

            user = users_collection.find_one(user_query)
            if not user:
                return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=401)

            # Password verification (bcrypt)
            stored_hashed_password = user.get("hpassword", "").encode("utf-8")
            if not stored_hashed_password or not bcrypt.checkpw(password.encode("utf-8"), stored_hashed_password):
                return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=401)

            # Generate a new session ID
            session_id = generate_session_id(email)
            expires_at = datetime.now() + timedelta(hours=4)

            # Store session data in MongoDB
            session_data = {
                "session_id": session_id,
                "email": email,
                "userType": user.get("userType"),
                "expires_at": expires_at
            }
            sessions_collection.insert_one(session_data)

            return JsonResponse({
                "status": "success",
                "message": "Login successful",
                "userData": {
                    "userType": user.get("userType"),
                    "email": email
                },
                "session_Id": session_id
            }, status=200)

        except Exception as e:
            print(f"Login error: {str(e)}")
            return JsonResponse({"status": "error", "message": f"Login failed: {str(e)}"}, status=500)

    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def check_session(request):
    session_id = request.headers.get("Authorization") or request.COOKIES.get("session_id")

    if not session_id:
        return JsonResponse({"status": "error", "message": "No session ID provided"}, status=401)

    # Remove expired sessions first
    clear_expired_sessions()
    now = datetime.now()

    # Check session in MongoDB
    session_data = sessions_collection.find_one({"session_id": session_id})

    if not session_data:
        return JsonResponse({"status": "error", "message": "Session not found"}, status=401)

    if session_data["expires_at"] < now:
        sessions_collection.delete_one({"session_id": session_id})  # Remove expired session
        return JsonResponse({"status": "error", "message": "Session expired"}, status=401)

    return JsonResponse({
        "status": "success",
        "message": "Session is valid",
        "email": session_data.get("email"),
        "userType": session_data.get("userType"),
    }, status=200)

@csrf_exempt
def logout_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            session_id = data.get("session_id")

            if not session_id:
                return JsonResponse({"status": "error", "message": "Session ID required"}, status=400)

            # Remove session from MongoDB
            result = sessions_collection.delete_one({"session_id": session_id})

            if result.deleted_count == 0:
                return JsonResponse({"status": "error", "message": "Session not found"}, status=404)

            return JsonResponse({"status": "success", "message": "Logged out successfully"}, status=200)

        except Exception as e:
            print(f"Logout error: {str(e)}")
            return JsonResponse({"status": "error", "message": f"Logout failed: {str(e)}"}, status=500)

    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)







# logic for user profile and update views

# user profile all backend code
@csrf_exempt
def get_user_profile(request, user_type, email):
    if request.method == "GET":
        try:
            print(f"Fetching profile for {user_type}: {email}")
            
            # Verify session instead of token
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return JsonResponse({"status": "error", "message": "No session ID provided"}, status=401)
            
            session_id = auth_header.split(' ')[1]
            
            # Get session data from MongoDB
            session_data = sessions_collection.find_one({"session_id": session_id})
            
            if not session_data:
                return JsonResponse({"status": "error", "message": "Session not found"}, status=401)
                
            # Check if session is expired
            if session_data["expires_at"] < datetime.now():
                sessions_collection.delete_one({"session_id": session_id})  # Clean up expired session
                return JsonResponse({"status": "error", "message": "Session expired"}, status=401)

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

















def send_email(to_email, subject, body):
    """Send email notifications"""
    try:
       
        # Replace with your email configuration
        if not settings.EMAIL_HOST or not settings.EMAIL_HOST_USER:
            print("Email settings not configured properly")
            return False
        
        # Create email message
        from_email = f'HMS Healthcare <{settings.EMAIL_HOST_USER}>'
        email_message = EmailMessage(
            subject=subject,
            body=body,
            from_email=from_email,
            to=[to_email]
        )
        
        # Send the email with detailed logging
        print(f"Sending email to {to_email} with subject '{subject}'")
        result = email_message.send(fail_silently=False)
        print(f"Email sending result: {result}")
        return True
        
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        # Include the full traceback for better debugging
        import traceback
        print(traceback.format_exc())
        return False
































# logic for patient views where add patient, verify patient, search patient and book appointment

# patient all backend code

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
                email_subject = "Acoount Registred Successfully"
                
                
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






















# logic for appointment views where fetch appointment, update appointment, delete appointment and book appointment

# appointment all backend code

@csrf_exempt
def book_appointment(request):
    """Endpoint for patients to request appointments"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            
            # Validate required fields
            required_fields = ["patientName", "patientEmail","symptoms",
                            "department", "appointmentDate", "requestedTime", "doctorEmail", "doctorName"]

            
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                return JsonResponse({
                    "status": "error",
                    "message": f"Missing required fields: {', '.join(missing_fields)}"
                }, status=400)
            
            # Validate appointment date (ensure it's not in the past)
            try:
                appointment_date = datetime.strptime(data["appointmentDate"], "%Y-%m-%d").date()
                current_date = datetime.now().date()
                
                if appointment_date < current_date:
                    return JsonResponse({
                        "status": "error",
                        "message": "Appointment date cannot be in the past"
                    }, status=400)
            except ValueError:
                return JsonResponse({
                    "status": "error",
                    "message": "Invalid date format. Use YYYY-MM-DD."
                }, status=400)


            appointment_request = {
                "patientId": data.get("patientId"),
                "patientName": data.get("patientName"),
                "patientEmail": data.get("patientEmail"),
                "department": data.get("department"),
                "appointmentDate": data.get("appointmentDate"),
                "requestedTime": data.get("requestedTime"),
                "symptoms": data.get("symptoms", "") or "",
                "doctorEmail": data.get("doctorEmail"),
                "doctorName": data.get("doctorName"),
                "status": "pending",
                "createdAt": datetime.now()
            }
            
            # Store in temporary collection pending admin approval
            result = temp_appointments_collection.insert_one(appointment_request)
            
            # Notify admin about the new appointment request
            admin_notification = {
                "userType": "admin",
                "title": "New Appointment Request",
                "message": f"New appointment request from {data.get('patientName')} for {data.get('department')}",
                "read": False,
                "createdAt": datetime.now()
            }
            notifications_collection.insert_one(admin_notification)
            
            # # Send confirmation email to patient
            # try:
            #     send_email(
            #         to_email=data["patientEmail"],
            #         subject="Appointment Request Received",
            #         body=f"""
            #         Hello {data['patientName']},
                    
            #         Your appointment request has been received and is pending approval.
                    
            #         Requested details:
            #         Date: {data['appointmentDate']}
            #         Time: {data['requestedTime']}
            #         Department: {data['department']}
                    
            #         You will receive another email once your appointment is approved.
                    
            #         Best regards,
            #         The Healthcare Team
            #         """
            #     )
            # except Exception as e:
            #     print(f"Failed to send confirmation email: {e}")
            
            return JsonResponse({
                "status": "success",
                "message": "Appointment request submitted successfully. You will be notified when it's approved.",
            }, status=201)
            
        except Exception as e:
            print(f"Error in book_appointment: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message":  f"Failed to book appointment: {str(e)}"
            }, status=500)
            
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)
# views.py - Appointment Search and Booking

@csrf_exempt
def search_appointment(request):
    """Search appointments by ID or patient information"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            query = data.get("query")
            
            if not query:
                return JsonResponse({
                    "status": "error",
                    "message": "Search query is required"
                }, status=400)
            
            results = []
            
            # Try to search by appointment ID
            if ObjectId.is_valid(query):
                appointment = appointments_collection.find_one({"_id": ObjectId(query)})
                if appointment:
                    appointment["id"] = str(appointment["_id"])
                    del appointment["_id"]
                    results.append(appointment)

                # Search by ID in pending appointments
                pending = temp_appointments_collection.find_one({"_id": ObjectId(query)})
                if pending:
                    pending["id"] = str(pending["_id"])
                    del pending["_id"]
                    results.append(pending)
            
             # Search by patient email in both collections
            email_query = {"patientEmail": {"$regex": query, "$options": "i"}}

            # Get results from approved appointments collection
            approved_appointments = list(appointments_collection.find(email_query))
            for appointment in approved_appointments:
                appointment["id"] = str(appointment["_id"])
                del appointment["_id"]
                results.append(appointment)
            
            # Get results from pending appointments collection
            pending_appointments = list(temp_appointments_collection.find(email_query))
            for appointment in pending_appointments:
                appointment["id"] = str(appointment["_id"])
                del appointment["_id"]
                results.append(appointment)
            
            if results:
                return JsonResponse({
                    "status": "success",
                    "appointments": results
                })
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "No appointments found"
                }, status=404)
            
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)

@csrf_exempt
def create_appointment(request):
    """Create a new appointment by admin"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            required_fields = ["patientEmail", "department", "appointmentDate", "appointmentTime"]
            
            # Validate required fields
            for field in required_fields:
                if not data.get(field):
                    return JsonResponse({
                        "status": "error",
                        "message": f"{field} is required"
                    }, status=400)
            
            # Get patient info
            patient = users_collection.find_one({"email": data["patientEmail"]})
            if not patient:
                return JsonResponse({
                    "status": "error",
                    "message": "Patient not found"
                }, status=404)
            
             # Get doctor info if provided
            doctor_email = data.get("doctorEmail")
            doctor_name = None
            if doctor_email:
                doctor = users_collection.find_one({"email": doctor_email})
                if doctor:
                    doctor_name = doctor.get("name")
            
              # Create new appointment directly in the appointments collection
            new_appointment = {
                "patientId": str(patient["_id"]),
                "patientName": patient.get("name", ""),
                "patientEmail": patient.get("email"),
                "department": data["department"],
                "appointmentDate": data["appointmentDate"],
                "confirmedDate": data["appointmentDate"],  # Direct assignment
                "requestedTime": data["appointmentTime"],
                "confirmedTime": data["appointmentTime"],  # Direct assignment
                "doctorEmail": doctor_email if doctor_email else None,
                "doctorName": doctor_name if doctor_name else None,
                "symptoms": data.get("symptoms", ""),
                "status": "approved",  # Admin-created appointments are automatically approved
                "createdAt": datetime.now(),
                "approvedAt": datetime.now(),
                "approvedBy": "admin",
                "createdBy": "admin"
            }
            
            # Insert the appointment
            result = appointments_collection.insert_one(new_appointment)
            
            # Create notification for the patient
            notification = {
                "userId": patient.get("userId"),
                "title": "New Appointment Scheduled",
                "message": f"An appointment has been scheduled for you on {data['appointmentDate']} at {data['appointmentTime']}.",
                "read": False,
                "createdAt": datetime.now()
            }
            notifications_collection.insert_one(notification)
            
            # Send email notification
            try:
                send_email(
                    to_email=patient.get("email"),
                    subject="New Appointment Scheduled",
                    body=f"""
                    Hello {patient.get('name')},
                    
                    An appointment has been scheduled for you:
                    
                    Date: {data['appointmentDate']}
                    Time: {data['appointmentTime']}
                    Department: {data['department']}
                    
                    Please arrive 15 minutes before your scheduled time.
                    
                    Best regards,
                    The Healthcare Team
                    """
                )
            except Exception as e:
                print(f"Failed to send email notification: {e}")
            
            return JsonResponse({
                "status": "success",
                "message": "Appointment created successfully",
                "appointmentId": str(result.inserted_id)
            })
            
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)



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

# ✅ Fetch Pending Appointments (For Admin Approval)
@csrf_exempt
def get_pending_appointments(request):
    if request.method == "GET":
        try:
            appointments = temp_appointments_collection.find({"status": "pending"})

            appointment_list = []
            for appointment in appointments:
                # Convert MongoDB ObjectId to string
                appointment_obj = {
                    "id": str(appointment["_id"]),
                    "patientId": appointment.get("patientId", ""),
                    "patientName": appointment.get("patientName", ""),
                    "patientEmail": appointment.get("patientEmail", ""),

                    "department": appointment.get("department", ""),
                    "appointmentDate": appointment.get("appointmentDate", ""),
                    "requestedTime": appointment.get("requestedTime", ""),
                    "symptoms": appointment.get("symptoms", ""),
                    
                    "doctorEmail": appointment.get("doctorEmail", ""),
                    "doctorName": appointment.get("doctorName", ""),

                    "status": appointment.get("status", ""),
                    "createdAt": appointment.get("createdAt", "").isoformat() if appointment.get("createdAt") else ""
                }
                appointment_list.append(appointment_obj)
            return JsonResponse({"status": "success", "appointments": appointment_list})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)



@csrf_exempt
def approve_appointment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            appointment_id = data.get("appointmentId")
            accept_patient_time = data.get("acceptPatientTime", True)
            accept_patient_date = data.get("acceptPatientDate", True)
            

            if not appointment_id:
                return JsonResponse({
                    "status": "error",
                    "message": "Appointment ID is required"
                }, status=400)
            
            # Find the pending appointment
            temp_appointment = temp_appointments_collection.find_one({"_id": ObjectId(appointment_id)})

            if not temp_appointment:
                return JsonResponse({"status": "error", "message": "Appointment not found"}, status=404)

            update_data = {
                "status": "approved",
                "approvedBy": "admin",
                "approvedAt": datetime.now()
            }

             
            # Track whether the appointment details were changed
            is_date_changed = False
            is_time_changed = False
            

            # Handle date assignment
            if accept_patient_date:
                # Keep the patient's requested date
                update_data["confirmedDate"] = temp_appointment.get("appointmentDate")
            else:
                # Use admin's provided date
                admin_date = data.get("dateSlot")
                if not admin_date:
                    return JsonResponse({
                        "status": "error",
                        "message": "Date slot is required when changing the appointment date"
                    }, status=400)
                update_data["confirmedDate"] = admin_date
                is_date_changed = True
            
            # Handle time slot assignment
            if accept_patient_time:
                # Keep the patient's requested time
                update_data["confirmedTime"] = temp_appointment.get("requestedTime")
            else:
                # Use admin's provided time
                admin_time = data.get("timeSlot")
                if not admin_time:
                    return JsonResponse({
                        "status": "error",
                        "message": "Time slot is required when changing the appointment time"
                    }, status=400)
                update_data["confirmedTime"] = admin_time
                is_time_changed = True
            
            # Copy the temp appointment data to appointments collection
            appointment_data = temp_appointment.copy()
            appointment_data.pop("_id", None)  # Remove the original ID

            appointment_data.update(update_data)

            result = appointments_collection.insert_one(appointment_data)

            if not result.inserted_id:
                return JsonResponse({
                    "status": "error",
                    "message": "Failed to create approved appointment"
                }, status=500)
                
            # Delete from temporary collection after approval
            temp_appointments_collection.delete_one({"_id": ObjectId(appointment_id)})

            # Get patient details for notification
            patient_id = temp_appointment.get("patientId")
            patient_email = temp_appointment.get("patientEmail")
            patient_name = temp_appointment.get("patientName")
            
            # The date to use in notifications (either original or admin-provided)
            display_date = update_data.get("confirmedDate", temp_appointment.get("appointmentDate"))
            display_time = update_data.get("confirmedTime", temp_appointment.get("requestedTime"))


             # Original requested date/time
            original_date = temp_appointment.get("appointmentDate")
            original_time = temp_appointment.get("requestedTime")
            # Create notification for the patient
            notification = {
                "userId": patient_id,
                "title": "Appointment Approved",
                "message": f"Your appointment for {display_date} at {display_time} has been approved.",
                "read": False,
                "createdAt": datetime.now()
            }
            notifications_collection.insert_one(notification)

            try:
                if not settings.EMAIL_HOST_USER:
                    raise ValueError("EMAIL_HOST_USER is not configured in settings.")
                
                if is_date_changed or is_time_changed:
                    appointment_body=f"""
                            Hello {patient_email},

                            Sorry your appointment has been rescheduled, please find the new details below:

                            Original Request:
                            Date: {original_date}
                            Time: {original_time}
                            
                            Approved Schedule:
                                Date: {display_date} {"(changed)" if is_date_changed else ""}
                                Time: {display_time} {"(changed)" if is_time_changed else ""}
                                Department: {temp_appointment.get('department')}
                                Doctor: {temp_appointment.get('doctorName')}

                                Please note the schedule changes and arrive 15 minutes before your scheduled time.
                                If this new schedule doesn't work for you, please contact us immediately.

                                Best regards,
                                The Healthcare Team
                            """
                    email_subject = "Appointment Approved with Schedule Change"


                else:
                    appointment_body = f"""
                        Hello {patient_name},

                        Good news! Your appointment request has been approved as requested.

                        Date: {display_date}
                        Time: {display_time}
                        Department: {temp_appointment.get('department')}
                        Doctor: {temp_appointment.get('doctorName')}

                        Please arrive 15 minutes before your scheduled time.

                        Best regards,
                        The Healthcare Team
                    """
                    email_subject = "Appointment Approved"

                # Send email
                email_message = EmailMultiAlternatives(
                    subject=email_subject,
                    body=appointment_body,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[patient_email],
                )
                # email_message.attach_alternative(html_message, "text/html")
                email_message.send(fail_silently=False)

                print(f"message sent successfully to {patient_email}")

            except Exception as e:
                print(f"Error sending email: {str(e)}")
                import traceback
                print(traceback.format_exc())
            
            return JsonResponse({
                "status": "success",
                "message": "Appointment approved successfully",
                "appointmentId": str(result.inserted_id)
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def get_doctor_appointments(request):
    """Get appointments for a doctor using their email"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            doctor_email = data.get("doctorEmail")
            
            if not doctor_email:
                return JsonResponse({
                    "status": "error",
                    "message": "Doctor email is required"
                }, status=400)
            
            # Find appointments for this doctor that have been approved
            appointments = list(appointments_collection.find({
                "doctorEmail": doctor_email,
                "status": "approved"
            }).sort("appointmentDate", -1))  # Sort by date, newest first
            
            # Format appointments for frontend
            formatted_appointments = []
            for appointment in appointments:
                appointment_obj = {
                    "id": str(appointment["_id"]),
                    "patientId": appointment.get("patientId", ""),
                    "patientName": appointment.get("patientName", ""),
                    "patientEmail": appointment.get("patientEmail", ""),
                    "department": appointment.get("department", ""),
                    "appointmentDate": appointment.get("confirmedDate", appointment.get("appointmentDate", "")),
                    "appointmentTime": appointment.get("confirmedTime", appointment.get("requestedTime", "")),
                    "symptoms": appointment.get("symptoms", ""),
                    "doctorName": appointment.get("doctorName", ""),
                    "status": appointment.get("status", ""),
                    "hasPrescription": appointment.get("hasPrescription", False),
                    "createdAt": appointment.get("createdAt", "").isoformat() if appointment.get("createdAt") else ""
                }
                formatted_appointments.append(appointment_obj)
            
            return JsonResponse({
                "status": "success", 
                "appointments": formatted_appointments
            })
            
        except Exception as e:
            print(f"Error fetching doctor appointments: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)

















@csrf_exempt
@csrf_exempt
def save_prescription(request):
    """API endpoint to save prescription data from doctor"""
    if request.method == "POST":
        try:
            # Check if the request includes a file upload
            if request.content_type and 'multipart/form-data' in request.content_type:
                prescription_data_json = request.POST.get('prescriptionData')
                if not prescription_data_json:
                    return JsonResponse({
                        "status": "error", 
                        "message": "Missing prescription data"
                    }, status=400)
                
                # Parse JSON data
                prescription_data = json.loads(prescription_data_json)
                
                # Handle report file upload if present
                report_file = request.FILES.get('reportFile')
                if report_file:
                    # Create a unique filename with patient email and timestamp
                    file_path = f"reports/{prescription_data['patientEmail'].replace('@', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{report_file.name}"
                    file_path = default_storage.save(file_path, ContentFile(report_file.read()))
                    prescription_data['reportFilePath'] = default_storage.url(file_path)
            else:
                # Regular JSON data without file
                prescription_data = json.loads(request.body)
            
            # Convert datetime strings to datetime objects
            if 'createdAt' in prescription_data and isinstance(prescription_data['createdAt'], str):
                try:
                    prescription_data['createdAt'] = datetime.fromisoformat(prescription_data['createdAt'].replace('Z', '+00:00'))
                except ValueError:
                    prescription_data['createdAt'] = datetime.now()
            else:
                prescription_data['createdAt'] = datetime.now()
                
            prescription_data['lastUpdated'] = datetime.now()
            
            # Ensure proper format for MongoDB
            # Convert any ObjectId strings to ObjectId if needed
            if prescription_data.get('appointmentId') and isinstance(prescription_data['appointmentId'], str):
                try:
                    prescription_data['appointmentId'] = ObjectId(prescription_data['appointmentId'])
                except:
                    # If the conversion fails, keep it as string
                    pass

            # Insert prescription data into MongoDB
            result = prescriptions_collection.insert_one(prescription_data)
            
            if not result.inserted_id:
                return JsonResponse({
                    "status": "error",
                    "message": "Failed to save prescription data"
                }, status=500)
            
            # If we have a patient email, update their profile with prescription reference
            if prescription_data.get('patientEmail'):
                users_collection.update_one(
                    {"email": prescription_data['patientEmail'], "userType": "Patient"},
                    {"$push": {"prescriptions": str(result.inserted_id)}}
                )
                
            # Create notification for patient
            notification = {
                "userType": "patient",
                "email": prescription_data['patientEmail'],
                "title": "New Prescription",
                "message": f"Dr. {prescription_data.get('doctorName', 'Your doctor')} has created a new prescription for you.",
                "read": False,
                "createdAt": datetime.now()
            }
            
            notifications_collection.insert_one(notification)
            
            # Send email notification to patient
            try:
                send_email(
                    to_email=prescription_data['patientEmail'],
                    subject="New Prescription Available",
                    body=f"""
                    Hello {prescription_data.get('patientName', 'Patient')},
                    
                    Dr. {prescription_data.get('doctorName', 'Your doctor')} has created a new prescription for you.
                    
                    You can view your prescription in your patient portal.
                    
                    Best regards,
                    The Healthcare Team
                    """
                )
            except Exception as e:
                print(f"Failed to send prescription notification email: {e}")
                
            return JsonResponse({
                "status": "success",
                "message": "Prescription saved successfully",
                "prescriptionId": str(result.inserted_id)
            })
            
        except Exception as e:
            print(f"Error saving prescription: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return JsonResponse({
                "status": "error", 
                "message": f"Failed to save prescription: {str(e)}"
            }, status=500)
    
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)

# Helper function to convert ObjectIds to strings in a document
def convert_object_ids(document):
    if isinstance(document, dict):
        for k, v in document.items():
            if isinstance(v, ObjectId):
                document[k] = str(v)
            elif isinstance(v, (dict, list)):
                document[k] = convert_object_ids(v)
    elif isinstance(document, list):
        for i, item in enumerate(document):
            document[i] = convert_object_ids(item)
    return document

@csrf_exempt
def get_prescriptions(request):
    """API endpoint to fetch prescriptions for pharmacy management"""
    if request.method == "GET":
        try:
            # Get all prescriptions that are not yet dispensed
            prescriptions = list(prescriptions_collection.find({"status": {"$ne": "dispensed"}}))
            
            # Convert ObjectId to strings for JSON serialization
            prescriptions = convert_object_ids(prescriptions)
            
            return JsonResponse({
                "status": "success",
                "prescriptions": prescriptions
            })
        except Exception as e:
            print(f"Error getting prescriptions: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def update_appointment_status(request):
    """Update appointment status after prescription is created"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            appointment_id = data.get("appointmentId")
            has_prescription = data.get("hasPrescription", False)
            
            if not appointment_id:
                return JsonResponse({
                    "status": "error", 
                    "message": "Appointment ID is required"
                }, status=400)
            
            # Update appointment with prescription status
            result = appointments_collection.update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": {
                    "hasPrescription": has_prescription,
                    "updatedAt": datetime.now()
                }}
            )
            if result.modified_count > 0:
                return JsonResponse({
                    "status": "success", 
                    "message": "Appointment status updated successfully"
                })
            else:
                return JsonResponse({
                    "status": "error", 
                    "message": "Appointment not found or no changes made"
                }, status=404)
                
        except Exception as e:
            print(f"Error updating appointment status: {str(e)}")
            return JsonResponse({
                "status": "error", 
                "message": f"Failed to update appointment status: {str(e)}"
            }, status=500)
    
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)



















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
    """ Fetches all products in the inventory formatted for the frontend. """
    if request.method == "GET":
        try:
            # Get all products from database
            products_cursor = products_collection.find()
            products_list = []
            
            for product in products_cursor:
                # Format expiry date if needed
                expiry_date = product.get("Expiry Date")
                if isinstance(expiry_date, datetime):
                    expiry_date = expiry_date.strftime("%Y-%m-%d")
                
                # Format the product for frontend
                formatted_product = {
                    "id": str(product["_id"]),
                    "name": product.get("Product Name", ""),
                    "type": product.get("Product Type", "Medicine"),  # Default to Medicine if missing
                    "supplier": product.get("Supplier Info", "Unknown"),
                    "price": product.get("Price (Per Unit/Strip)", 0),
                    "stock": product.get("Stock", 0),
                    "expiryDate": expiry_date,
                    # Status will be handled on frontend
                }
                products_list.append(formatted_product)
                
            return JsonResponse({"status": "success", "products": products_list})
            
        except Exception as e:
            print(f"Error fetching products: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

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
