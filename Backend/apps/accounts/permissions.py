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
        # Accept multiple possible kwarg names
        email_from_url = (
            view.kwargs.get("email")
            or view.kwargs.get("emailToUse")
            or view.kwargs.get("email_to")
            or view.kwargs.get("emailTo")
        )
        return email_from_url == getattr(user, "email", None)


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
        
        user_type = getattr(user, "userType", None)
        return user_type in ["Doctor", "Admin"]

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
        user_type = getattr(user, "userType", None)
        return user_type == "SuperAdmin"
    
class IsSuperAdminOrIsSameHospitalAdmin(BasePermission):
    """Allow access to Super Admin or Admin users"""
    
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False)):
            return False
    
        
        user_type = getattr(user, "userType", None)
        return user_type in ["SuperAdmin", "Admin"]
    
    def has_object_permission(self, request, view, obj):
        user = getattr(request, "user", None)
        user_type = getattr(user, "userType", None)
        user_email = getattr(user, "email", None)
        
        if user_type == "SuperAdmin":
            return True
        elif user_type == "Admin":
            # Handle both dict and object types
            if isinstance(obj, dict):
                hospital_admin_email = obj.get("adminEmail")
            else:
                hospital_admin_email = getattr(obj, "adminEmail", None)
            return user_email == hospital_admin_email
        return False 