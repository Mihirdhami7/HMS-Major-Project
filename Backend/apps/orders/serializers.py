from rest_framework import serializers
from bson.objectid import ObjectId
from backend.db import products_collection, orders_collection, hospitals_collection
from .models import ProductDocument, OrderDocument


class ProductSerializer(serializers.Serializer):
    """Serializer for creating and updating products"""
    id = serializers.CharField(read_only=True, source="_id")
    product_name = serializers.CharField(required=True, max_length=200)
    product_type = serializers.CharField(required=True, max_length=100)
    price_per_strip = serializers.FloatField(required=True)
    stock = serializers.IntegerField(required=True)
    supplier_company = serializers.CharField(required=True, max_length=200)
    hospitalName = serializers.CharField(required=True, max_length=200)
    department = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.CharField(read_only=True)  # Auto from model
    expiry_date = serializers.DateTimeField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    is_approved = serializers.BooleanField(read_only=True)  # Auto from model
    approved_at = serializers.DateTimeField(read_only=True, allow_null=True)
    approved_by = serializers.CharField(read_only=True, allow_null=True)

    def validate_price_per_strip(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative")
        return value

    def validate_hospitalName(self, value):
        hospital = hospitals_collection.find_one({"name": value})
        if not hospital:
            raise serializers.ValidationError(f"Hospital '{value}' not found")
        return value

    def create(self, validated_data):
        """Create product using ProductDocument (status auto-calculated)"""
        product_data = ProductDocument.create(
            product_name=validated_data["product_name"],
            product_type=validated_data["product_type"],
            price_per_strip=validated_data["price_per_strip"],
            stock=validated_data["stock"],
            supplier_company=validated_data["supplier_company"],
            hospital_name=validated_data["hospitalName"],
            department=validated_data.get("department", ""),
            description=validated_data.get("description", ""),
            expiry_date=validated_data.get("expiry_date"),
            is_approved=False,
        )

        result = products_collection.insert_one(product_data)
        product_data["_id"] = str(result.inserted_id)
        return product_data

    def update(self, instance, validated_data):
        """Update product with auto status recalculation"""
        update_data = ProductDocument.update(
            stock=validated_data.get("stock"),
            product_name=validated_data.get("product_name"),
            product_type=validated_data.get("product_type"),
            price_per_strip=validated_data.get("price_per_strip"),
            supplier_company=validated_data.get("supplier_company"),
            hospital_name=validated_data.get("hospitalName"),
            department=validated_data.get("department"),
            description=validated_data.get("description"),
            expiry_date=validated_data.get("expiry_date"),
            is_approved=validated_data.get("is_approved"),
            approved_by=validated_data.get("approved_by"),
        )

        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        products_collection.update_one(
            {"_id": ObjectId(instance["_id"])},
            {"$set": update_data}
        )

        instance.update(update_data)
        return instance

class OrderSerializer(serializers.Serializer):
    """Serializer for creating and managing orders"""
    product_id = serializers.CharField(required=True)
    product_name = serializers.CharField(required=True, max_length=200)
    product_type = serializers.CharField(required=True, max_length=100)

    supplier_company = serializers.CharField(required=True, max_length=200)
    hospitalName = serializers.CharField(required=True, max_length=200)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    quantity = serializers.IntegerField(required=True, write_only=True)
    price_per_strip = serializers.FloatField(required=True)

    expiry_date = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    quantity_fulfilled = serializers.IntegerField(read_only=True)
    total_price = serializers.FloatField(read_only=True)
    status = serializers.CharField(read_only=True)
    order_date = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value

    def validate_price_per_strip(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value

    def validate_hospitalName(self, value):
        hospital = hospitals_collection.find_one({"name": value})
        if not hospital:
            raise serializers.ValidationError(f"Hospital '{value}' not found")
        return value

    def create(self, validated_data):
        """Create order using new structured OrderDocument"""
        order_data = OrderDocument.create(
            product_id=validated_data["product_id"],
            product_name=validated_data["product_name"],
            product_type=validated_data["product_type"],
            supplier_company=validated_data["supplier_company"],  # ✅ FIXED
            hospital_name=validated_data["hospitalName"],
            quantity=validated_data["quantity"],
            price_per_strip=validated_data["price_per_strip"],
            department=validated_data.get("department"),
            expiry_date=validated_data.get("expiry_date"),
            notes=validated_data.get("notes", ""),
        )

        result = orders_collection.insert_one(order_data)
        order_data["_id"] = str(result.inserted_id)
        return order_data