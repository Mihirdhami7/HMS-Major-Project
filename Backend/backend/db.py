from pymongo import MongoClient
from datetime import datetime
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

# Helpers
def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))

def clear_expired_sessions():
    now = datetime.now()
    sessions_collection.delete_many({"expires_at": {"$lt": now}})

def generate_session_id(email: str) -> str:
    timestamp = datetime.now().isoformat()
    return hashlib.sha256(f"{email}{timestamp}".encode()).hexdigest()