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




# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["hospital_db"]
users_collection = db["users"]
temp_users_collection = db["temp_users"]  # New collection for unverified users
otp_collection = db["otps"]  # New collection for OTPs

SECRET_KEY = "1fy%j02cvs&0$)-ny@3pj6l$+p)%cl6_ogu0h8-z=!&sy*v_ju"

def generate_otp():
    """Generate a 6-digit OTP"""
    otp_length = getattr(settings, 'OTP_SETTINGS', {}).get('LENGTH', 6)
    return ''.join(random.choices(string.digits, k=otp_length))

@csrf_exempt
def register_user(request):
    if request.method == "POST":
        try:
            # Handle both JSON and multipart form-data
            data = request.POST.dict() if request.content_type.startswith('multipart') else json.loads(request.body)
            
            email = data.get("email")
            if not email:
                return JsonResponse({"status": "error", "message": "Email is required"}, status=400)

            # Check if user already exists
            existing_user = users_collection.find_one({"email": email})
            if existing_user:
                return JsonResponse({"status": "error", "message": "User already exists"}, status=400)

            # Generate OTP
            otp = generate_otp()
            # Default to 1 minute if setting not found
            expiry_time = datetime.utcnow() + getattr(settings, 'OTP_SETTINGS', {}).get('EXPIRY_TIME', timedelta(minutes=1))
            
            # Store user data temporarily
            temp_user_data = {
                "email": email,
                "name": data.get("name"),
                "password": data.get("password"),
                "contactNo": data.get("contactNo"),
                "userType": data.get("userType", "Patient"),
                "gender": data.get("gender"),
                "dateOfBirth": data.get("dateOfBirth"),
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

                # Handle doctor certificate if present
                if request.FILES and 'doctorCertificate' in request.FILES:
                    certificate = request.FILES['doctorCertificate']
                    cert_name = default_storage.save(
                        f"doctor_certificates/{email}/{certificate.name}", 
                        ContentFile(certificate.read())
                    )
                    temp_user_data["doctorCertificate"] = default_storage.url(cert_name)

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
                # Create HTML content
                html_message = render_to_string('email/verification.html', {
                    'name': data.get('name'),
                    'otp': otp
                })
                
                # Create plain text content
                plain_message = strip_tags(html_message)
                
                # Create email
                email = EmailMultiAlternatives(
                    subject="HMS - Email Verification OTP",
                    body=plain_message,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[email],
                )
                
                # Attach HTML content
                email.attach_alternative(html_message, "text/html")
                
                # Send email
                email.send(fail_silently=False)
                
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

            # Find OTP record
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
                # Delete expired OTP
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
                # Remove _id if it exists
                if '_id' in temp_user:
                    del temp_user['_id']

                # Hash password
                password = temp_user.get("password")
                if password:
                    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
                    temp_user["hpassword"] = hashed_password.decode("utf-8")
                
                # Insert verified user into main collection
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
            category = data.get("category")  # Get the category from request

            if not all([email, password, category]):
                return JsonResponse({
                    "status": "error",
                    "message": "Email, password and category are required"
                }, status=400)

            # Find user with matching email and category
            user = users_collection.find_one({
                "email": email,
                "userType": category  # Match the user type with category
            })

            if not user:
                return JsonResponse({
                    "status": "error",
                    "message": "User not found or invalid category"
                }, status=404)

            stored_hashed_password = user.get("hpassword", "").encode("utf-8")
            if not stored_hashed_password:
                return JsonResponse({
                    "status": "error",
                    "message": "Invalid user data"
                }, status=400)

            if bcrypt.checkpw(password.encode("utf-8"), stored_hashed_password):
                # Generate token with 4-hour expiration
                payload = {
                    "user_id": str(user["_id"]),
                    "email": user["email"],
                    "userType": user["userType"],
                    "exp": datetime.utcnow() + timedelta(hours=4)
                }
                token = pyjwt.encode(payload, SECRET_KEY, algorithm="HS256")
                
                # Remove sensitive data before sending
                user_data = {
                    "_id": str(user["_id"]),
                    "name": user.get("name", ""),
                    "email": user["email"],
                    "contactNo": user.get("contactNo", ""),
                    "userType": user["userType"],
                    "gender": user.get("gender", ""),
                    "photo": user.get("photo"),
                }

                if user["userType"] == "Doctor":
                    user_data.update({
                        "doctorQualification": user.get("doctorQualification", ""),
                        "doctorSpecialization": user.get("doctorSpecialization", "")
                    })

                return JsonResponse({
                    "status": "success",
                    "message": "Login successful",
                    "authToken": token,
                    "userData": user_data
                }, status=200)
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "Invalid email or password"
                }, status=401)

        except json.JSONDecodeError:
            return JsonResponse({
                "status": "error",
                "message": "Invalid JSON data"
            }, status=400)
        except Exception as e:
            print(f"Login error: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": "Login failed"
            }, status=500)

    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)

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
    if request.method == "PUT":
        try:
            email = request.POST.get("email")
            if not email:
                return JsonResponse({"status": "error", "message": "Email is required"}, status=400)
            
            # Find the existing user
            existing_user = users_collection.find_one({"email": email})
            if not existing_user:
                return JsonResponse({"status": "error", "message": "User not found"}, status=404)
            
            # Get user type and normalize it
            user_type = existing_user.get("userType", "").lower()
            is_doctor = user_type == "doctor"
            
            # Prepare update data
            update_data = {}
            
            # Handle form data
            for key in request.POST:
                if key not in ["email", "userType", "_id", "hpassword"]:  # Protected fields
                    # Handle doctor-specific fields
                    if is_doctor and key.startswith("doctor"):
                        update_data[key] = request.POST.get(key)
                    # Handle common fields
                    elif not key.startswith("doctor"):
                        update_data[key] = request.POST.get(key)
            
            # Handle profile photo
            if request.FILES.get("profilePhoto"):
                profile_photo = request.FILES["profilePhoto"]
                photo_name = default_storage.save(f"profile_photos/{email}/{profile_photo.name}", 
                                               ContentFile(profile_photo.read()))
                update_data["photo"] = default_storage.url(photo_name)
            
            # Update user in database
            if update_data:
                users_collection.update_one(
                    {"email": email},
                    {"$set": update_data}
                )
            
            # Get updated user data
            updated_user = users_collection.find_one({"email": email})
            if updated_user:
                updated_user["_id"] = str(updated_user["_id"])
                if "hpassword" in updated_user:
                    del updated_user["hpassword"]
                
                return JsonResponse(updated_user, status=200)
            
            return JsonResponse({"status": "error", "message": "Failed to retrieve updated user"}, status=500)
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_doctors(request):
    if request.method == "GET":
        try:
            # Get all doctors from MongoDB
            doctors = list(users_collection.find({"userType": "Doctor"}))
            
            # Convert ObjectId to string for each doctor
            for doctor in doctors:
                doctor["_id"] = str(doctor["_id"])
                # Remove sensitive information
                doctor.pop("hpassword", None)
            
            return JsonResponse(doctors, safe=False)
            
        except Exception as e:
            print(f"Error fetching doctors: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": "Failed to fetch doctors"
            }, status=500)

    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)