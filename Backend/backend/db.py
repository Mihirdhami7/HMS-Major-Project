from pymongo import MongoClient
from datetime import datetime, timedelta
import random
import string
import hashlib
import logging
import backend.settings as backend_settings

logger = logging.getLogger(__name__)

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
# DEPRECATED: doctors_collection - use staff_collection instead
# doctors_collection = db["doctors"]
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


def ensure_indexes():
    """Create commonly used MongoDB indexes and TTL indexes."""
    try:
        users_collection.create_index("email")
        users_collection.create_index([("userType", 1), ("hospitalName", 1)])

        staff_collection.create_index("email")
        staff_collection.create_index([("role", 1), ("hospitalName", 1)])

        sessions_collection.create_index("token")
        sessions_collection.create_index("expires_at", expireAfterSeconds=0)

        otp_collection.create_index([("email", 1), ("otp", 1)])
        otp_collection.create_index("expires_at", expireAfterSeconds=0)

        appointments_collection.create_index([("patient.email", 1), ("appointmentDate", -1)])
        appointments_collection.create_index([("doctor.email", 1), ("appointmentDate", -1)])
        appointments_collection.create_index([("hospitalName", 1), ("status", 1)])

        products_collection.create_index([("hospitalName", 1), ("is_approved", 1)])
        orders_collection.create_index([("hospitalName", 1), ("status", 1)])
    except Exception as exc:
        # Keep app startup resilient even if index creation fails.
        logger.warning("Mongo index initialization skipped/failed: %s", exc)


ensure_indexes()

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