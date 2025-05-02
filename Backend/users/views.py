# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# from django.core.files.storage import default_storage
# from django.core.files.base import ContentFile
# from django.core.mail import send_mail, EmailMultiAlternatives
# import bcrypt
from pymongo import MongoClient
# import json
# import jwt as pyjwt
import datetime
import random
import string
from datetime import datetime, timedelta
from pymongo.errors import ConnectionFailure
# import ssl
# from bson.objectid import ObjectId

from django.contrib.sessions.models import Session
from django.contrib.sessions.backends.db import SessionStore
import hashlib
import backend.settings as settings


# Update MongoDB connection
try:
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DATABASE]


    users_collection = db["users"]
    temp_users_collection = db["temp_users"]
    otp_collection = db["otps"]
    sessions_collection = db["sessions"]
    doctors_collection = db["doctors"]

    
    payments_collection = db["payments"]
    departments_collection = db["departments"]
    hospitals_collection = db["hospitals"]

    notifications_collection = db["notifications"]
    prescriptions_collection = db["prescriptions"]
    invoices_collection = db["invoices"]


    temp_appointments_collection = db["temp_appointments"]
    appointments_collection = db["appointments"]
    orders_collection = db["orders"]


    products_collection = db["products"]
    temp_products_collection = db["temp_products"]

    print("Successfully connected to MongoDB Atlas!")


except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}")


# Helper functions used across views

def generate_otp():
    """Generate a random 6-digit OTP."""
    return "".join(random.choices(string.digits, k=6))


# Function to clear expired sessions
def clear_expired_sessions():
    now = datetime.now()
    sessions_collection.delete_many({"expires_at": {"$lt": now}})


# Function to generate a session ID
def generate_session_id(email):
    timestamp = datetime.now().isoformat()
    session_id = hashlib.sha256(f"{email}{timestamp}".encode()).hexdigest()
    return session_id








