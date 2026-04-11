from rest_framework.permissions import BasePermission

class IsSameUser(BasePermission):
    """
    Allow access when authenticated user's email matches the email in URL kwargs.
    Works with different kwarg names produced across codebase.
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        user_email = str(getattr(user, "email", "") or "").strip().lower()
        if not user_email:
            return False

        email_keys = ("email", "emailToUse", "email_to", "emailTo", "userEmail")

        # 1) URL kwargs
        kwargs = getattr(view, "kwargs", {}) or {}
        for key in email_keys:
            value = kwargs.get(key)
            if value:
                return str(value).strip().lower() == user_email

        if hasattr(request, "data"):
            for key in email_keys:
                value = request.data.get(key)
                if value:
                    return str(value).strip().lower() == user_email

        query_params = getattr(request, "query_params", {})
        for key in email_keys:
            value = query_params.get(key)
            if value:
                return str(value).strip().lower() == user_email

        path = str(getattr(request, "path", "") or "").lower()
        if "/me/" in path or path.endswith("/me"):
            return True

        return False


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        return getattr(user, "userType", None) == "Patient"



class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        return getattr(user, "userType", None) == "Doctor"


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        return getattr(user, "userType", None) == "Admin"


class IsSupplier(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        return getattr(user, "userType", None) == "Supplier"

class IsPatientOrAdmin(BasePermission):
    """Allow access to Patient or Admin users"""
    
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        
        user_type = getattr(user, "userType", None)
        return user_type in ["Patient", "Admin"]


class IsDoctorOrAdmin(BasePermission):
    """Allow access to Doctor or Admin users"""
    
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        
        user_type = str(getattr(user, "userType", "") or "").strip().lower()
        return user_type in ["doctor", "admin", "superadmin"]

class IsPatientOrDoctor(BasePermission):
    """Allow access to Patient or Doctor users"""
    
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        
        user_type = getattr(user, "userType", None)
        return user_type in ["Patient", "Doctor"]
    
class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        user_type = str(getattr(user, "userType", "") or "").strip().lower()
        return user_type == "superadmin"
    
class IsSuperAdminOrIsSameHospitalAdmin(BasePermission):
    """Allow access to Super Admin or Admin users"""
    
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
    
        user_type = str(getattr(user, "userType", "") or "").strip().lower()
        return user_type in ["superadmin", "admin"]
    
    def has_object_permission(self, request, view, obj):
        user = getattr(request, "user", None)
        user_type = str(getattr(user, "userType", "") or "").strip().lower()
        user_email = str(getattr(user, "email", "") or "").strip().lower()
        user_hospital = str(getattr(user, "hospitalName", "") or "").strip()
        
        if user_type == "superadmin":
            return True
        elif user_type == "admin":
            if isinstance(obj, dict):
                hospital_admin_email = str(obj.get("adminEmail", "") or "").strip().lower()
                target_hospital = str(obj.get("hospitalName", "") or "").strip()
            else:
                hospital_admin_email = str(getattr(obj, "adminEmail", "") or "").strip().lower()
                target_hospital = str(getattr(obj, "hospitalName", "") or "").strip()

            if hospital_admin_email:
                return user_email == hospital_admin_email
            return bool(user_hospital and target_hospital and user_hospital == target_hospital)
        return False 