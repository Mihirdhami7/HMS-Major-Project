from pymongo import MongoClient
from datetime import datetime, timedelta
import random
import string
import hashlib
import backend.settings as backend_settings

# Validate settings
MONGO_URI = getattr(backend_settings, "MONGO_URI", None)
MONGO_DATABASE = getattr(backend_settings, "MONGO_DATABASE", None)

if not MONGO_URI or not MONGO_DATABASE:
    raise RuntimeError("MONGO_URI or MONGO_DATABASE not set in Django settings (backend/settings.py)")

# Initialize client and DB
client = MongoClient(MONGO_URI)
db = client[MONGO_DATABASE]

# Collections
users_collection = db["users"]
temp_users_collection = db["temp_users"]
otp_collection = db["otps"]
sessions_collection = db["sessions"]
doctors_collection = db["doctors"]
staff_collection = db["staff"]
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

# Helper Functions
def generate_otp(length=6):
    """Generate random OTP"""
    return ''.join(random.choices(string.digits, k=length))

def generate_session_id(email):
    """Generate unique session ID"""
    timestamp = str(datetime.now().timestamp())
    random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    raw = f"{email}:{timestamp}:{random_str}"
    return hashlib.sha256(raw.encode()).hexdigest()

def clear_expired_sessions():
    """Remove expired sessions"""
    now = datetime.now()
    sessions_collection.delete_many({"expires_at": {"$lt": now}})

def clear_expired_otps():
    """Remove expired OTPs"""
    now = datetime.now()
    otp_collection.delete_many({"expires_at": {"$lt": now}})