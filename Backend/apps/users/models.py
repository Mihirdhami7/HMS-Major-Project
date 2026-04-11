from datetime import datetime
from typing import Any, Dict, List, Optional
class StaffDocument:
    @staticmethod
    def create_staff_doctor(
        user_id,
        email: str,
        name: str,
        hospital: str,
        department: str = None,
        qualification: str = None,
        specialization: str = None,
        experience: int = 0,
        certificate: str = None,
        licenseNumber: str = None,
        registrationNumber: str = None,
        contactNo: str = None,
        address: str = None,
        rating: float = 0.0,
        time_slot: dict = None,
        description: str = None
    ) -> dict:
        return {
            "user_id": user_id,                    # Reference to users_collection._id
            "email": email.lower(),
            "name": name,
            "userType": "Doctor",                  
            "role": "Doctor",
            "hospitalName": hospital,
            "department": department or "",
            "qualification": qualification or "",
            "specialization": specialization or "",
            "experience": experience,
            "certificate": certificate or "",
            "licenseNumber": licenseNumber or "",
            "registrationNumber": registrationNumber or "",
            "contactNo": contactNo or "",
            "address": address or "",
            "rating": float(rating) if rating else 0.0,
            "time_slot": time_slot or {},
            "description": description or "",
            "isApproved": True,                    
            "approvedAt": datetime.utcnow(),       
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    @staticmethod
    def create_staff_supplier(
        user_id,
        email: str,
        name: str,
        company_name: str,
        company_starting_date: str = None,
        license_url: str = None,
        license_number: str = None,
        gst_number: str = None,
        contactNo: str = None,
        address: str = None,
        hospital: str = None,
        hospital_list: list = None,
        product_categories: list = None,
        rating_score: float = 0.0,
        total_orders: int = 0
    ) -> dict:
        return {
            "user_id": user_id,
            "email": email.lower(),
            "name": name,
            "userType": "Supplier",               
            "hospitalName": hospital or "",
            "companyName": company_name,
            "companyStartingDate": company_starting_date or "",
            "companyLicense": license_url or "",
            "licenseNumber": license_number or "",
            "gstNumber": gst_number or "",
            "contactNo": contactNo or "",
            "address": address or "",
            "hospitalList": hospital_list or [],
            "productCategories": product_categories or [],
            "ratingScore": float(rating_score) if rating_score else 0.0,
            "totalOrders": total_orders,
            "isApproved": True,                    
            "approvedAt": datetime.utcnow(),       
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    @staticmethod
    def create_staff_admin(
        user_id,
        email: str,
        name: str,
        role: str = "Admin",
        hospital: str = None,
        contactNo: str = None,
        address: str = None
    ) -> dict:
        return {
            "user_id": user_id,
            "email": email.lower(),
            "name": name,
            "userType": "Admin",                   
            "role": role,                          # "Admin" or "SuperAdmin"
            "hospitalName": hospital or "",
            "contactNo": contactNo or "",
            "address": address or "",
            "isApproved": True,                    
            "approvedAt": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    