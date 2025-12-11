from datetime import datetime
from rest_framework import serializers

class RegisterSerializer(serializers.Serializer):

    """
    User registration serializer with dynamic field validation based on userType
    """
    
    # Common required fields for all users
    email = serializers.EmailField(required=True)
    name = serializers.CharField(required=True, max_length=100)
    password = serializers.CharField(required=True, min_length=6, write_only=True)
    contactNo = serializers.CharField(required=True, max_length=15)
    userType = serializers.ChoiceField(
        choices=["Patient", "Doctor", "Admin", "Supplier"],
        default="Patient"
    )
    
    # Optional common fields
    gender = serializers.ChoiceField(
        choices=["Male", "Female", "Other"],
        required=False,
        allow_null=True,
        allow_blank=True
    )
    dateOfBirth = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    hospitalName = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    
    # Doctor-specific fields
    doctorQualification = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    doctorSpecialization = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    doctorCertificate = serializers.FileField(required=False, allow_null=True)
    
    # Supplier-specific fields
    companyName = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    companyStartingDate = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    companyLicense = serializers.FileField(required=False, allow_null=True)

    def validate_email(self, value):
        """Lowercase and trim email"""
        return value.strip().lower()
    
    def validate_password(self, value):
        """Password strength validation"""
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters")
        if value.isdigit():
            raise serializers.ValidationError("Password cannot be entirely numeric")
        return value
    
    def validate_contactNo(self, value):
        """Clean and validate contact number"""
        cleaned = ''.join(filter(str.isdigit, value))
        if len(cleaned) != 10:
            raise serializers.ValidationError("Contact number must be exactly 10 digits")
        return cleaned
    
    def validate(self, data):
        """Cross-field validation based on userType"""
        userType = data.get('userType', 'Patient')
        errors = {}
        request = self.context.get('request')

        if userType == "Patient":
            # Patient required fields
            required_fields = {
                'hospitalName': 'Hospital name is required for Patient',
                'gender': 'Gender is required for Patient',
                'dateOfBirth': 'Date of birth is required for Patient'
            }
            for field, error_msg in required_fields.items():
                if not data.get(field):
                    errors[field] = error_msg
        
        elif userType == "Doctor":
            # Doctor required fields
            required_fields = {
                'doctorQualification': 'Doctor qualification is required',
                'doctorSpecialization': 'Doctor specialization is required',
                'hospitalName': 'Hospital name is required for Doctor',
                'gender': 'Gender is required for Doctor',
                'dateOfBirth': 'Date of birth is required for Doctor'
            }
            for field, error_msg in required_fields.items():
                if not data.get(field):
                    errors[field] = error_msg
            
            # Check file upload
            if not request or 'doctorCertificate' not in request.FILES:
                errors['doctorCertificate'] = 'Doctor certificate file is required'
        
        elif userType == "Supplier":
            # Supplier required fields
            required_fields = {
                'companyName': 'Company name is required for Supplier',
                'companyStartingDate': 'Company starting date is required for Supplier'
            }
            for field, error_msg in required_fields.items():
                if not data.get(field):
                    errors[field] = error_msg
            
            # Check file upload
            if not request or 'companyLicense' not in request.FILES:
                errors['companyLicense'] = 'Company license file is required'
        
        elif userType == "Admin":
            # Admin required fields
            required_fields = {
                'hospitalName': 'Hospital name is required for Admin',
                'gender': 'Gender is required for Admin',
                'dateOfBirth': 'Date of birth is required for Admin'
            }
            for field, error_msg in required_fields.items():
                if not data.get(field):
                    errors[field] = error_msg
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data

    def to_representation(self, instance):
        """Filter response based on userType - only show relevant fields"""
        user_type = instance.get('userType', 'Patient')
        
        # Base fields for all users
        base_fields = ['email', 'name', 'contactNo', 'userType', 'is_active', 'created_at', 'updated_at']
        
        if user_type == "Patient":
            allowed_fields = base_fields + ['gender', 'dateOfBirth', 'hospitalName', 'photo']
        elif user_type == "Doctor":
            allowed_fields = base_fields + ['gender', 'dateOfBirth', 'hospitalName', 'photo', 
                                           'doctorQualification', 'doctorSpecialization', 
                                           'doctorCertificate', 'isApproved']
        elif user_type == "Supplier":
            allowed_fields = base_fields + ['photo', 'companyName', 'companyStartingDate', 'companyLicense']
        elif user_type == "Admin":
            allowed_fields = base_fields + ['gender', 'dateOfBirth', 'hospitalName', 'photo']
        else:
            allowed_fields = base_fields
        
        # Build response directly from instance
        filtered_data = {}
        for key in allowed_fields:
            if key in instance:
                value = instance[key]
                if isinstance(value, datetime):
                    filtered_data[key] = value.isoformat()
                else:
                    filtered_data[key] = value
        return filtered_data
class VerifyEmailSerializer(serializers.Serializer):

    """Email verification serializer"""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_email(self, value):
        return value.strip().lower()
    
    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits")
        if len(value) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 digits")
        return value

class LoginSerializer(serializers.Serializer):

    """Login serializer"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    category = serializers.ChoiceField(
        choices=["Patient", "Doctor", "Admin", "Supplier", "SuperAdmin"],
        required=False,
        allow_null=True,
        allow_blank=True
    )
    hospitalName = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, data):
        """Validate hospital requirement"""
        email = data.get('email')
        category = data.get('category')
        
        # Super admin and Supplier don't need hospital
        if email == "21it402@bvmengineering.ac.in":
            return data
        
        if not category:
            raise serializers.ValidationError({
                "category": "Category is required"
            })
        
        if category == "Supplier":
            return data
        
        if not data.get('hospitalName'):
            raise serializers.ValidationError({
                "hospitalName": "Hospital selection is required"
            })
        return data
class LogoutSerializer(serializers.Serializer):
    
    """Logout serializer"""
    reason = serializers.CharField(required=False, allow_blank=True)

class UserProfileSerializer(serializers.Serializer):
    
    """User profile serializer for updates and retrieval"""
    
    # Common fields
    email = serializers.EmailField(read_only=True)  # Email is read-only
    name = serializers.CharField(required=False, max_length=100)
    contactNo = serializers.CharField(required=False, max_length=15)
    password = serializers.CharField(required=False, min_length=6, write_only=True)
    userType = serializers.CharField(read_only=True)  # UserType is read-only
    
    gender = serializers.ChoiceField(
        choices=["Male", "Female", "Other"],
        required=False,
        allow_null=True
    )
    dateOfBirth = serializers.CharField(required=False, allow_null=True)
    hospitalName = serializers.CharField(required=False, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True, write_only=True)
    
    # Doctor fields
    doctorQualification = serializers.CharField(required=False, allow_null=True)
    doctorSpecialization = serializers.CharField(required=False, allow_null=True)
    doctorCertificate = serializers.FileField(required=False, allow_null=True, write_only=True)
    isApproved = serializers.BooleanField(read_only=True)
    
    # Supplier fields
    companyName = serializers.CharField(required=False, allow_null=True)
    companyStartingDate = serializers.CharField(required=False, allow_null=True)
    companyLicense = serializers.FileField(required=False, allow_null=True, write_only=True)
    
    # Read-only fields
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_password(self, value):
        """Password strength validation"""
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters")
        if value.isdigit():
            raise serializers.ValidationError("Password cannot be entirely numeric")
        return value
    
    def validate_contactNo(self, value):
        """Clean and validate contact number"""
        if not value:
            return value
        
        cleaned = ''.join(filter(str.isdigit, value))
        if len(cleaned) != 10:
            raise serializers.ValidationError("Contact number must be exactly 10 digits")
        return cleaned

    def validate_dateOfBirth(self, value):
        """Validate date format"""
        if not value:
            return value
        
        for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
            try:
                datetime.strptime(value, fmt)
                return value
            except Exception:
                continue
        
        raise serializers.ValidationError("dateOfBirth must be in YYYY-MM-DD or DD-MM-YYYY format")

    def validate(self, data):
        """Cross-field validation for updates"""
        instance = self.instance
        user_type = instance.get('userType') if instance else None
        
        # Doctor-specific validation
        if user_type == "Doctor":
            # If updating qualification or specialization, both should be provided
            if ('doctorQualification' in data or 'doctorSpecialization' in data):
                if not data.get('doctorQualification') and not instance.get('doctorQualification'):
                    raise serializers.ValidationError({
                        "doctorQualification": "Doctor qualification is required"
                    })
                if not data.get('doctorSpecialization') and not instance.get('doctorSpecialization'):
                    raise serializers.ValidationError({
                        "doctorSpecialization": "Doctor specialization is required"
                    })
        
        # Supplier-specific validation
        elif user_type == "Supplier":
            if ('companyName' in data or 'companyStartingDate' in data):
                if not data.get('companyName') and not instance.get('companyName'):
                    raise serializers.ValidationError({
                        "companyName": "Company name is required"
                    })
                if not data.get('companyStartingDate') and not instance.get('companyStartingDate'):
                    raise serializers.ValidationError({
                        "companyStartingDate": "Company starting date is required"
                    })
        
        return data

    def to_representation(self, instance):
        """
        Return all data from database
        Converts datetime objects to ISO format
        """
        response_data = {}
        
        for key, value in instance.items():
            # Convert datetime objects to ISO format string
            if isinstance(value, datetime):
                response_data[key] = value.isoformat()
            else:
                response_data[key] = value
        
        return response_data
