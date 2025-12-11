"""
Hospital and Department Serializers
Using DRF serializers for validation
"""
from rest_framework import serializers
from bson.objectid import ObjectId
from datetime import datetime
from backend.db import hospitals_collection, departments_collection, users_collection, doctors_collection
from .models import HospitalDocument, DepartmentDocument

class HospitalSerializer(serializers.Serializer):
    """Full Hospital Serializer for Create/Update operations"""
    id = serializers.CharField(read_only=True, source="_id")
    name = serializers.CharField(required=True, max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    adminEmail = serializers.EmailField(required=True)
    adminName = serializers.CharField(required=False, allow_blank=True, default="")
    contactNo = serializers.CharField(required=True, max_length=20)
    address = serializers.CharField(required=False, allow_blank=True, default="")
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True)

    def validate_name(self, value):
        """Ensure hospital name is unique"""
        instance_id = self.instance.get("_id") if self.instance else None
        query = {"name": value}
        if instance_id:
            query["_id"] = {"$ne": ObjectId(instance_id)}
        if hospitals_collection.find_one(query):
            raise serializers.ValidationError("Hospital with this name already exists")
        return value

    def validate_adminEmail(self, value):
        """Admin email must exist and belong to an Admin user"""
        admin = users_collection.find_one({"email": value})
        if not admin:
            raise serializers.ValidationError("Admin with this email not found")
        if admin.get("userType") != "Admin":
            raise serializers.ValidationError("User must have userType='Admin'")
        return value

    def validate(self, attrs):
        """Populate adminName from admin user record"""
        admin_email = attrs.get("adminEmail")
        if admin_email:
            admin = users_collection.find_one({"email": admin_email})
            if not admin:
                raise serializers.ValidationError({"adminEmail": "Admin with this email not found"})
            if admin.get("userType") != "Admin":
                raise serializers.ValidationError({"adminEmail": "User must have userType='Admin'"})
            attrs["adminName"] = admin.get("name") or admin.get("fullName") or admin.get("email")
        return attrs

    def create(self, validated_data):
        """Create hospital using HospitalDocument helper"""
        hospital_data = HospitalDocument.create(
            name=validated_data["name"],
            adminEmail=validated_data["adminEmail"],
            contactNo=validated_data["contactNo"],
            description=validated_data.get("description", ""),
            adminName=validated_data.get("adminName", ""),
            address=validated_data.get("address", "")
        )
        result = hospitals_collection.insert_one(hospital_data)
        hospital_data["_id"] = str(result.inserted_id)
        return hospital_data

    def update(self, instance, validated_data):
        """Update hospital using HospitalDocument helper"""
        update_data = HospitalDocument.update(
            name=validated_data.get("name"),
            description=validated_data.get("description"),
            adminEmail=validated_data.get("adminEmail"),
            adminName=validated_data.get("adminName"),
            contactNo=validated_data.get("contactNo"),
            address=validated_data.get("address")
        )
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        hospitals_collection.update_one(
            {"_id": ObjectId(instance["_id"])},
            {"$set": update_data}
        )
        updated = hospitals_collection.find_one({"_id": ObjectId(instance["_id"])})
        updated["_id"] = str(updated["_id"])
        return updated

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if "_id" in instance:
            rep["id"] = str(instance["_id"])
        return rep
    
class HospitalListSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True, source="_id")
    name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    adminName = serializers.CharField(required=False, allow_blank=True, default="")
    adminEmail = serializers.CharField(required=False, allow_blank=True, default="")
    contactNo = serializers.CharField(required=False, allow_blank=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, default="")
    createdAt = serializers.DateTimeField(required=False)

    def to_representation(self, instance):
        return {
            "id": str(instance.get("_id", "")),
            "name": instance.get("name", ""),
            "description": instance.get("description", ""),
            "adminName": instance.get("adminName", ""),
            "adminEmail": instance.get("adminEmail", ""),
            "contactNo": instance.get("contactNo", ""),
            "address": instance.get("address", ""),
            "createdAt": instance.get("createdAt"),
        }


# ==================== DEPARTMENT SERIALIZERS ============================= 

class DepartmentSerializer(serializers.Serializer):
    """Full Department Serializer for Create/Update operations"""
    id = serializers.CharField(read_only=True, source="_id")
    name = serializers.CharField(required=True, max_length=200, source="Department")
    description = serializers.CharField(required=False, allow_blank=True, default="", source="Description")
    hospitalName = serializers.CharField(required=True, max_length=200)
    head = serializers.CharField(required=False, allow_blank=True, default="", source="Head of Department")
    roles = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    createdAt = serializers.DateTimeField(read_only=True, source="Created Date")
    updatedAt = serializers.DateTimeField(read_only=True)

    def validate_hospitalName(self, value):
        """Validate that hospital exists"""
        hospital = hospitals_collection.find_one({"name": value})
        if not hospital:
            raise serializers.ValidationError("Hospital not found")
        return value

    def validate_name(self, value):
        """Validate department name format"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Department name cannot be empty")
        return value

    def validate(self, attrs):
        """Check if department already exists in the hospital"""
        department_name = attrs.get("Department")
        hospital_name = attrs.get("hospitalName")
        instance_id = self.instance.get("_id") if self.instance else None
        
        query = {
            "Department": department_name,
            "hospitalName": hospital_name
        }
        if instance_id:
            query["_id"] = {"$ne": ObjectId(instance_id)}
        
        if departments_collection.find_one(query):
            raise serializers.ValidationError({
                "name": "Department already exists in this hospital"
            })
        return attrs

    def create(self, validated_data):
        """Create department using DepartmentDocument helper"""
        department_data = DepartmentDocument.create(
            name=validated_data["Department"],
            hospitalName=validated_data["hospitalName"],
            description=validated_data.get("Description", ""),
            head=validated_data.get("Head of Department", ""),
            roles=validated_data.get("roles", [])
        )
        result = departments_collection.insert_one(department_data)
        department_data["_id"] = str(result.inserted_id)
        return department_data

    def update(self, instance, validated_data):
        """Update department using DepartmentDocument helper"""
        update_data = DepartmentDocument.update(
            name=validated_data.get("Department"),
            description=validated_data.get("Description"),
            head=validated_data.get("Head of Department"),
            roles=validated_data.get("roles")
        )
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        departments_collection.update_one(
            {"_id": ObjectId(instance["_id"])},
            {"$set": update_data}
        )
        updated = departments_collection.find_one({"_id": ObjectId(instance["_id"])})
        updated["_id"] = str(updated["_id"])
        return updated

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if "_id" in instance:
            rep["id"] = str(instance["_id"])
        rep["name"] = instance.get("Department", "")
        rep["description"] = instance.get("Description", "")
        rep["head"] = instance.get("Head of Department", "")
        rep["createdAt"] = instance.get("Created Date")
        return rep


class DepartmentListSerializer(serializers.Serializer):
    """Minimal Department Serializer for List operations"""
    id = serializers.CharField(read_only=True, source="_id")
    name = serializers.CharField(source="Department")
    description = serializers.CharField(source="Description")
    head = serializers.CharField(source="Head of Department")
    hospitalName = serializers.CharField()
    createdAt = serializers.DateTimeField(source="Created Date")
    
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if "_id" in instance:
            rep["id"] = str(instance["_id"])
        return rep