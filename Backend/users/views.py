from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import bcrypt
from pymongo import MongoClient
import jwt
import datetime
import json

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["hospital_db"]
users_collection = db["users"]

@csrf_exempt
def register_user(request):
    if request.method == "POST":
        try:
            # Handle form data
            name = request.POST.get("name")
            email = request.POST.get("email")
            password = request.POST.get("password")
            contact_no = request.POST.get("contactNo")
            date_of_birth = request.POST.get("dateOfBirth")
            user_type = request.POST.get("userType")
            gender = request.POST.get("gender")
            photo = request.FILES.get("photo")

            # Check for missing required fields
            if not name or not email or not password or not contact_no:
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            existing_user = users_collection.find_one({"email": email})
            if existing_user:
                return JsonResponse({"status": "error", "message": "User already exists"}, status=400)

            # Hash the password securely
            hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

            # Save the photo if provided
            photo_url = None
            if photo:
                try:
                    photo_name = default_storage.save(photo.name, ContentFile(photo.read()))
                    photo_url = default_storage.url(photo_name)
                except Exception as e:
                    return JsonResponse({"status": "error", "message": f"Error saving photo: {str(e)}"}, status=500)

            # Create user data
            user_data = {
                "name": name,
                "email": email,
                "password": password,
                "hpassword": hashed_password.decode("utf-8"),
                "contactNo": contact_no,
                "dateOfBirth": date_of_birth,
                "userType": user_type,
                "gender": gender,
                "photo": photo_url,
            }

            # Insert into MongoDB
            result = users_collection.insert_one(user_data)
            print("Inserted User ID:", result.inserted_id)

            return JsonResponse({
                "status": "success",
                "message": "User registered successfully",
                "userId": str(result.inserted_id),
            }, status=201)

        except Exception as e:
            print("Error:", str(e))  # Log the error
            return JsonResponse({"status": "error", "message": f"Server error: {str(e)}"}, status=500)
    else:
        return JsonResponse({"status": "error", "message": "Invalid request method"}, status=400)

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password").encode("utf-8")  # Convert to bytes

            # Find user in MongoDB
            user = users_collection.find_one({"email": email})

            if not user:
                return JsonResponse({"message": "User not found"}, status=404)

            stored_hashed_password = user.get("hpassword").encode("utf-8")  # Get stored hash

            # ✅ Compare entered password with stored hashed password
            if bcrypt.checkpw(password, stored_hashed_password):
                return JsonResponse(
                    {
                        "message": "Login successful",
                        "user_type": user.get("userType"),
                    },
                    status=200,
                )
            else:
                return JsonResponse({"message": "Invalid email or password"}, status=401)

        except Exception as e:
            return JsonResponse({"message": str(e)}, status=500)

    return JsonResponse({"message": "Method not allowed"}, status=405)