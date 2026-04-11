"""
User Module Serializers
Validation and serialization for User module APIs
Contains only DoctorStaffSerializer - Uses accounts serializers for patient/doctor registration
"""

from rest_framework import serializers
from datetime import datetime
from backend.db import hospitals_collection

class PatientCreateSerializer(serializers.Serializer):
    """Serializer for admin-created patients."""
    email = serializers.EmailField(required=True)
    name = serializers.CharField(max_length=100, required=True)
    contactNo = serializers.CharField(max_length=15, required=True)
    gender = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    dateOfBirth = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_contactNo(self, value):
        cleaned = ''.join(filter(str.isdigit, value))
        if len(cleaned) != 10:
            raise serializers.ValidationError("Contact number must be exactly 10 digits")
        return cleaned

    def validate_dateOfBirth(self, value):
        if not value:
            return value

        for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
            try:
                datetime.strptime(value, fmt)
                return value
            except Exception:
                continue

        raise serializers.ValidationError("dateOfBirth must be in YYYY-MM-DD or DD-MM-YYYY format")

    def to_representation(self, instance):
        data = {}
        for key, value in instance.items():
            data[key] = value.isoformat() if isinstance(value, datetime) else value
        return data


class DoctorStaffSerializer(serializers.Serializer):
    """
    Serializer for approved doctor staff with full fields
    Used for retrieving and updating doctor staff documents from staff_collection
    """
    user_id = serializers.CharField(read_only=True)
    email = serializers.EmailField()
    name = serializers.CharField(max_length=100)
    userType = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    hospital = serializers.CharField(max_length=100, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    qualification = serializers.CharField(max_length=200, required=False, allow_blank=True)
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True)
    experience = serializers.IntegerField(default=0, required=False)
    certificate = serializers.CharField(required=False, allow_blank=True)
    licenseNumber = serializers.CharField(max_length=50, required=False, allow_blank=True)
    registrationNumber = serializers.CharField(max_length=50, required=False, allow_blank=True)
    contactNo = serializers.CharField(max_length=15, required=False)
    address = serializers.CharField(required=False, allow_blank=True)
    rating = serializers.FloatField(default=0.0, min_value=0.0, max_value=5.0, read_only=True)
    time_slot = serializers.DictField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    isApproved = serializers.BooleanField(read_only=True)
    approvedAt = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_email(self, value):
        """Normalize email"""
        return value.strip().lower() if value else value

    def validate_contactNo(self, value):
        """Validate contact number"""
        if value:
            cleaned = ''.join(filter(str.isdigit, value))
            if len(cleaned) != 10:
                raise serializers.ValidationError("Contact number must be exactly 10 digits")
        return value

    def validate(self, data):
        """Cross-field validation for doctor updates"""
        # Ensure qualification and specialization are updated together
        instance = self.instance or {}
        qual = data.get('qualification', instance.get('qualification'))
        spec = data.get('specialization', instance.get('specialization'))

        if ('qualification' in data or 'specialization' in data) and (not qual or not spec):
            raise serializers.ValidationError({
                "qualification": "Both qualification and specialization must be provided together"
            })
        return data

    def to_representation(self, instance):
        """Convert datetime objects to ISO format string"""
        data = super().to_representation(instance)
        for key, value in list(data.items()):
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        return data


class DoctorApprovalSerializer(serializers.Serializer):
    """
    Serializer for doctor approval request
    Validates email, hospital, department, experience before approval
    """
    email = serializers.EmailField(required=True)
    hospitalName = serializers.CharField(required=True, max_length=100)
    department = serializers.CharField(required=False, allow_blank=True, default="")
    experience = serializers.IntegerField(required=False, default=0, min_value=0, max_value=60)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_hospitalName(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Hospital name cannot be blank")
        if not hospitals_collection.find_one({"name": value}):
            raise serializers.ValidationError(f"Hospital '{value}' not found")
        return value


class DoctorRejectSerializer(serializers.Serializer):
    """
    Serializer for doctor rejection request
    Validates email and hospital before rejection
    """
    email = serializers.EmailField(required=True)
    hospitalName = serializers.CharField(required=True, max_length=100)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_hospitalName(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Hospital name cannot be blank")
        if not hospitals_collection.find_one({"name": value}):
            raise serializers.ValidationError(f"Hospital '{value}' not found")
        return value
