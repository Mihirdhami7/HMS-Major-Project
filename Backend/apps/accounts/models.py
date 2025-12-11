
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from backend import settings
import bcrypt

class UserDocument:
    COMMON_FIELDS = [
        "name", "email", "password", "hpassword", "gender",
        "userType", "contactNo", "dateOfBirth", "is_active",
        "created_at", "updated_at", "photo"
    ]
    @staticmethod
    def _save_file(email: str, subfolder: str, file_obj) -> Optional[str]:
        """
        Save uploaded file to MEDIA storage under <email>/<subfolder>/ and return its URL.
        Returns None if file_obj is falsy.
        """
        if not file_obj:
            return None
        filename = file_obj.name
        path = f"{email}/{subfolder}/{filename}"
        saved_name = default_storage.save(path, ContentFile(file_obj.read()))
        try:
            # default_storage.url usually returns public URL or path
            return default_storage.url(saved_name)
        except Exception:
            # fallback to join MEDIA_URL if configured
            media_url = getattr(settings, "MEDIA_URL", "")
            return f"{media_url.rstrip('/')}/{saved_name.lstrip('/')}"

    @staticmethod
    def _now() -> datetime:
        return datetime.utcnow()
    
    @staticmethod
    def create_base_user(
        email: str,
        name: str,
        password: str,
        contactNo: str,
        userType: str,
        gender: Optional[str] = None,
        dateOfBirth: str = None,
        photo = None,
        is_active: bool = False,
    ) -> Dict[str, Any]:
        """Create base user document (common fields for all users)"""
        if not email or not name:
            raise ValueError("email and name are required for base user")

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Handle photo upload if provided
        photo_url = UserDocument._save_file(email, "photos", photo)

        base = {
            "email": email,
            "name": name,
            "password": password,  # Plain password (for reference only, not stored)
            "hpassword": hashed_password,  # bcrypt hashed password
            "contactNo": contactNo,
            "userType": userType,  # Patient, Doctor, Admin, Supplier
            "gender": gender,
            "dateOfBirth": dateOfBirth,
            "photo": photo_url,
            "is_active": is_active,  # False until OTP verified
            "created_at": UserDocument._now(),
            "updated_at": UserDocument._now(),
        }
        return base
    
    @staticmethod
    def create_patient(
        base_data: Dict[str, Any],
        *,
        hospitalName: str = None,
        medicalHistory: Optional[List[Dict]] = None,
        invoices: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Patient document: keep only common base fields + patient-specific fields.
        """
        allowed = [
            "email", "name", "password", "hpassword", "contactNo",
            "userType", "gender", "dateOfBirth", "photo",
            "is_active", "created_at", "updated_at"
        ]
        patient = {k: base_data.get(k) for k in allowed if base_data.get(k) is not None}
        # patient-specific
        patient["hospitalName"] = hospitalName or base_data.get("hospitalName")
        patient["medicalHistory"] = medicalHistory or []
        patient["invoices"] = invoices or []
        return patient

    
    @staticmethod
    def create_doctor(
        base_data: Dict[str, Any],
        *,
        hospitalName: str = None,
        doctorQualification: str,
        doctorSpecialization: str,
        certificate = None,
        departments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Doctor document: base fields + doctor-specific metadata and certificate saved as URL.
        """
        allowed = [
            "email", "name", "password", "hpassword", "contactNo",
            "userType", "gender", "dateOfBirth", "photo",
            "is_active", "created_at", "updated_at"
        ]
        doc = {k: base_data.get(k) for k in allowed if base_data.get(k) is not None}
        cert_url = UserDocument._save_file(base_data.get("email"), "certificates", certificate)
        doc.update({
            "hospitalName": hospitalName,  # doctor's primary hospital if provided
            "doctorQualification": doctorQualification,
            "doctorSpecialization": doctorSpecialization,
            "doctorCertificate": cert_url,
            "departments": departments or [],
            "isApproved": False,
            "appointments": []
        })
        return doc
    
    @staticmethod
    def create_supplier(
        base_data: Dict[str, Any],
        *,
        companyName: str,
        companyStartingDate: str,
        license_file = None,
        hospitalNames: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Supplier document: base fields + supplier-specific metadata and license saved as URL.
        hospitalNames can be a list of hospital names the supplier works with.
        """
        allowed = [
            "email", "name", "password", "hpassword", "contactNo",
            "userType", "gender", "dateOfBirth", "photo",
            "is_active", "created_at", "updated_at"
        ]
        sup = {k: base_data.get(k) for k in allowed if base_data.get(k) is not None}
        license_url = UserDocument._save_file(base_data.get("email"), "licenses", license_file)
        sup.update({
            "companyName": companyName,
            "companyStartingDate": companyStartingDate,
            "companyLicense": license_url,
            "hospitalNames": hospitalNames or [],  # multiple hospitals supported
            "products": []
        })
        return sup
    
    @staticmethod
    def create_admin(base_data: dict) -> dict:
        """
        Admin (or super) document: no extra fields beyond common base.
        """
        allowed = [
            "email", "name", "password", "hpassword", "contactNo",
            "userType", "gender", "dateOfBirth", "photo",
            "is_active", "created_at", "updated_at"
        ]
        return {k: base_data.get(k) for k in allowed if base_data.get(k) is not None}
    
class StaffDocument:
    
    """
    Staff document structure in staff_collection
    Only for approved doctors/staff members
    """
    
    @staticmethod
    def create_staff(
        email: str,
        user_id: str,
        name: str,
        userType: str,
        hospitalName: str,
        departments: list = None,
        **kwargs
    ) -> dict:
        """Create staff record for approved doctor"""
        return {
            "email": email,
            "user_id": user_id,  # Reference to users_collection
            "name": name,
            "userType": userType,  # Doctor, Nurse, etc.
            "Hospital": hospitalName,
            "departments": departments or [],
            "approved": True,
            "approved_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            **kwargs
        }
    
class OTPDocument:
    """OTP document structure"""
    
    @staticmethod
    def create(email: str, otp: str, expiry_minutes: int = 2) -> dict:
        """Create OTP document"""
        return {
            "email": email,
            "otp": otp,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=expiry_minutes),
            "verified": False,
        }
class FieldValidators:
    """Field validation utilities"""
    
    @staticmethod
    def validate_user_type(userType: str) -> bool:
        """Validate user type"""
        valid_types = ["Patient", "Doctor", "Admin", "Supplier"]
        return userType in valid_types
