from pymongo import MongoClient
from urllib.parse import quote_plus
import os
from dotenv import load_dotenv

load_dotenv()

username = quote_plus(os.getenv('MONGO_USERNAME'))
password = quote_plus(os.getenv('MONGO_PASSWORD'))
cluster = os.getenv('MONGO_CLUSTER')
database = os.getenv('MONGO_DATABASE')

uri = f"mongodb+srv://{username}:{password}@{cluster}/?retryWrites=true&w=majority"

try:
    client = MongoClient(uri)
    db = client[database]
    # Test the connection
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")
    
    # Test database access
    users = list(db.users.find().limit(1))
    print(f"Found {len(users)} users")
    
except Exception as e:
    print(f"Connection error: {e}") 