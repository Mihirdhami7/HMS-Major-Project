from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import bcrypt
import json
import random
import string
import hashlib
from datetime import datetime, timedelta
import backend.settings as settings

# Import from views.py where collections are defined
from users.views import (
    users_collection, temp_users_collection, otp_collection, sessions_collection,
    generate_otp, generate_session_id, clear_expired_sessions,

)









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

                message = f"""
                <html>
                    <body>
                        <h2>Welcome to HMS</h2>
                        <p>Your OTP for email verification is: <strong>{otp}</strong></p>
                        <p>Please enter this OTP to verify your email address.</p>
                        <p>Thank you for registering!</p>
                    </body>
                </html> 
                """

                # Send email
                email_message = EmailMultiAlternatives(
                    subject="HMS - Email Verification OTP",
                    body=message,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[email],
                )
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
















@csrf_exempt
def login_view(request):
    if request.method == "POST":
        try:
            clear_expired_sessions()  # Remove expired sessions before login

            data = json.loads(request.body)
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")
            category = data.get("category", "")
            hospital_name = data.get("hospitalName", "")

            if not email or not password:
                return JsonResponse({"status": "error", "message": "Email and password are required"}, status=400)

            if not hospital_name and email != "21it402@bvmengineering.ac.in":  # Super admin doesn't need hospital
                return JsonResponse({"status": "error", "message": "Hospital selection is required"}, status=400)
            
            # User lookup
            user_query = {"email": email}
            if email != "21it402@bvmengineering.ac.in":  # Exclude super admin
                user_query["userType"] = category
                user_query["hospitalName"] = hospital_name

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
                "hospitalName": user.get("hospitalName"),
                "expires_at": expires_at
            }
            sessions_collection.insert_one(session_data)

            return JsonResponse({
                "status": "success",
                "message": "Login successful",
                "userData": {
                    "userType": user.get("userType"),
                    "email": email,
                    "hospitalName": user.get("hospitalName"),
                    "name": user.get("name"),
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
        "hospitalName": session_data.get("hospitalName"),
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