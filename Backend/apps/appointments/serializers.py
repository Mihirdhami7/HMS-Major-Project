from datetime import datetime
from rest_framework import serializers

class BookAppointmentSerializer(serializers.Serializer):
    """Serializer for booking appointments"""
    patientEmail = serializers.EmailField(required=True)
    doctorEmail = serializers.EmailField(required=True)
    department = serializers.CharField(required=True, max_length=100)
    hospitalName = serializers.CharField(required=True, max_length=200)
    appointmentDate = serializers.CharField(required=True)
    appointmentTime = serializers.CharField(required=True)
    symptoms = serializers.CharField(required=False, allow_blank=True, default="")
    
    def validate_appointmentDate(self, value):
        """Validate appointment date format"""
        try:
            date_obj = datetime.strptime(value, "%Y-%m-%d")
            if date_obj.date() < datetime.now().date():
                raise serializers.ValidationError("Appointment date cannot be in the past")
            return value
        except ValueError:
            raise serializers.ValidationError("Date must be in YYYY-MM-DD format")
    
    def validate_appointmentTime(self, value):
        """Validate time format"""
        try:
            datetime.strptime(value, "%H:%M")
            return value
        except ValueError:
            raise serializers.ValidationError("Time must be in HH:MM format (24-hour)")


class ApproveAppointmentSerializer(serializers.Serializer):
    """Serializer for approving/rejecting appointments"""
    appointmentId = serializers.CharField(required=True)
    action = serializers.ChoiceField(choices=["approve", "reject"], required=True)
    confirmedDate = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    confirmedTime = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    rejectionReason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def validate(self, data):
        """Cross-field validation"""
        action = data.get('action')
        
        if action == 'approve':
            if data.get('confirmedDate') or data.get('confirmedTime'):
                if not data.get('confirmedDate'):
                    raise serializers.ValidationError({
                        "confirmedDate": "Confirmed date is required when rescheduling"
                    })
                if not data.get('confirmedTime'):
                    raise serializers.ValidationError({
                        "confirmedTime": "Confirmed time is required when rescheduling"
                    })
        
        return data
    
    def validate_confirmedDate(self, value):
        """Validate confirmed date format"""
        if not value:
            return value
        try:
            date_obj = datetime.strptime(value, "%Y-%m-%d")
            if date_obj.date() < datetime.now().date():
                raise serializers.ValidationError("Confirmed date cannot be in the past")
            return value
        except ValueError:
            raise serializers.ValidationError("Date must be in YYYY-MM-DD format")
    
    def validate_confirmedTime(self, value):
        """Validate confirmed time format"""
        if not value:
            return value
        try:
            datetime.strptime(value, "%H:%M")
            return value
        except ValueError:
            raise serializers.ValidationError("Time must be in HH:MM format")


class AppointmentSerializer(serializers.Serializer):
    """Serializer for appointment response - NO ObjectId conversion"""
    _id = serializers.CharField(read_only=True)
    hospitalName = serializers.CharField()
    department = serializers.CharField()
    appointmentDate = serializers.CharField()
    requestedTime = serializers.CharField()
    acceptedDate = serializers.CharField(allow_null=True, required=False)
    acceptedTime = serializers.CharField(allow_null=True, required=False)
    
    patient = serializers.DictField()
    doctor = serializers.DictField()
    
    symptoms = serializers.CharField(allow_blank=True)
    payments = serializers.ListField(required=False)
    
    status = serializers.CharField()
    approvedBy = serializers.CharField(allow_null=True, required=False)
    rejectedBy = serializers.CharField(allow_null=True, required=False)
    rejectionReason = serializers.CharField(allow_null=True, required=False)
    
    createdAt = serializers.DateTimeField()
    updatedAt = serializers.DateTimeField()
    approvedAt = serializers.DateTimeField(allow_null=True, required=False)
    completedAt = serializers.DateTimeField(allow_null=True, required=False)
    rejectedAt = serializers.DateTimeField(allow_null=True, required=False)
    
    def to_representation(self, instance):
        """Convert MongoDB document to JSON - Simple conversion"""
        data = {}
        for key, value in instance.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            else:
                data[key] = value
        return data


class PrescriptionSerializer(serializers.Serializer):
    """Serializer for prescription - NO ObjectId conversion"""
    _id = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    invoiceId = serializers.CharField(read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True)
    invoicedAt = serializers.DateTimeField(read_only=True, allow_null=True)

    appointmentId = serializers.CharField(required=True, write_only=True)
    patientAge = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    patientPhone = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    patientAddress = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)

    patient = serializers.DictField(required=False)
    doctor = serializers.DictField(required=False)
    hospitalName = serializers.CharField(required=False)
    department = serializers.CharField(required=False)
    
    vitals = serializers.DictField(required=False, allow_null=True)
    medicines = serializers.ListField(required=True)
    suggestions = serializers.CharField(required=False, allow_blank=True, default="")
    reports = serializers.DictField(required=False, allow_null=True)

    def validate_medicines(self, value):
        """Validate medicines list structure"""
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("At least one medicine is required")
        
        required_fields = ['medicineId', 'name', 'quantity', 'dosage', 'duration', 'price']
        
        for idx, medicine in enumerate(value):
            if not isinstance(medicine, dict):
                raise serializers.ValidationError(f"Medicine at index {idx} must be a dictionary")
            
            missing_fields = [field for field in required_fields if field not in medicine]
            if missing_fields:
                raise serializers.ValidationError(
                    f"Medicine at index {idx} is missing: {', '.join(missing_fields)}"
                )
            
            try:
                quantity = int(medicine['quantity'])
                if quantity <= 0:
                    raise serializers.ValidationError(f"Medicine {idx}: quantity must be > 0")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Medicine {idx}: invalid quantity")
            
            try:
                price = float(medicine['price'])
                if price < 0:
                    raise serializers.ValidationError(f"Medicine {idx}: price cannot be negative")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Medicine {idx}: invalid price")
        
        return value
    
    def validate_vitals(self, value):
        """Validate vitals structure"""
        if value is None:
            return None
        
        allowed_fields = ['bloodPressure', 'heartRate', 'temperature', 'weight', 'height', 'oxygenLevel']
        
        for field in value.keys():
            if field not in allowed_fields:
                raise serializers.ValidationError(f"Invalid vital field: {field}")
        
        return value
    
    def validate_reports(self, value):
        """Validate reports structure"""
        if value is None:
            return None
        
        if 'reportType' not in value:
            raise serializers.ValidationError("reportType is required in reports")
        
        valid_types = ['none', 'blood_test', 'xray', 'ct_scan', 'mri', 'ultrasound', 'ecg', 'other']
        if value['reportType'] not in valid_types:
            raise serializers.ValidationError(f"Invalid reportType. Must be one of: {', '.join(valid_types)}")
        
        return value
    
    def to_representation(self, instance):
        """Convert MongoDB document to JSON - Simple conversion"""
        data = {}
        for key, value in instance.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            else:
                data[key] = value
        return data