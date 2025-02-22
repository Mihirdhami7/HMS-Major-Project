from pymongo import MongoClient
from django.conf import settings
from bson import ObjectId

# Connect to MongoDB
client = MongoClient(settings.MONGO_URI)
mongo_db = client[settings.MONGO_DB_NAME]
users_collection = mongo_db["users"]  # This is the MongoDB collection

class User:
    def __init__(self, name, email, password, contact_no, date_of_birth, user_type, gender, photo=None, _id=None):
        self.id = str(_id) if _id else None
        self.name = name
        self.email = email
        self.password = password  # Hash before storing
        self.contact_no = contact_no
        self.date_of_birth = date_of_birth
        self.user_type = user_type
        self.gender = gender
        self.photo = photo

    def save(self):
        """Insert new user into MongoDB"""
        user_data = self.__dict__
        user_data.pop("id", None)  # Remove id field before insert
        inserted_id = users_collection.insert_one(user_data).inserted_id
        self.id = str(inserted_id)
        return self

    @staticmethod
    def find_by_email(email):
        """Find a user by email"""
        user = users_collection.find_one({"email": email})
        return User(**user) if user else None
