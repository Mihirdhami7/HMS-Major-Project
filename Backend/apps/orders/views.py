from datetime import datetime
from bson.objectid import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status, exceptions
from rest_framework.permissions import IsAuthenticated

from backend.db import (products_collection, orders_collection, users_collection, payments_collection)

from .serializers import (
    ProductSerializer, OrderSerializer,
)
from .models import ProductDocument, OrderDocument
from apps.accounts.permissions import IsAdmin, IsSupplier, IsSuperAdmin
from apps.accounts.authentication import JWTAuthentication


def _parse_object_id(value, field_name):
    try:
        return ObjectId(value)
    except (TypeError, ValueError, InvalidId):
        raise exceptions.ValidationError({
            field_name: [f"A valid {field_name} is required."]
        })


def _get_supplier_company_from_user(user):
    user_email = str(getattr(user, "email", "") or "").strip().lower()
    if not user_email:
        return None
    supplier = users_collection.find_one({"email": user_email, "userType": "Supplier"})
    if not supplier:
        return None
    return supplier.get("companyName")


def _is_super_admin(user):
    return str(getattr(user, "userType", "") or "").strip().lower() == "superadmin"


class ProductListView(generics.ListAPIView):
    """
    GET /api/orders/products/?hospitalName=Zydus
    List all products for a specific hospital (APPROVED PRODUCTS ONLY)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        hospital_name = self.request.query_params.get('hospitalName') or self.request.query_params.get('hospital_name')
        if not hospital_name:
            return []
        products = list(products_collection.find({"hospitalName": hospital_name, "is_approved": True}))
        for product in products:
            product["_id"] = str(product["_id"])
        return products

    def list(self, request, *args, **kwargs):
        hospital_name = request.query_params.get('hospitalName') or request.query_params.get('hospital_name')
        if not hospital_name:
            return Response({
                "status": "error",
                "message": "hospitalName query parameter is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        queryset = self.get_queryset()
        if not queryset:
            return Response({
                "status": "success",
                "message": f"No approved products found for hospital '{hospital_name}'",
                "products": []
            }, status=status.HTTP_200_OK)
        return Response({"status": "success", "products": queryset}, status=status.HTTP_200_OK)


class ProductCreateView(generics.CreateAPIView):
    """
    POST /api/orders/products/create/
    Create a new product (Suppliers only)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsSupplier]
    authentication_classes = [JWTAuthentication]

    def create(self, request, *args, **kwargs):
        supplier_company = _get_supplier_company_from_user(request.user)
        if not supplier_company:
            return Response({
                "status": "error",
                "message": "Supplier profile/company not found"
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data["supplier_company"] = supplier_company
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        return Response({
            "status": "success",
            "message": "Product submitted for admin approval",
            "product": serializer.data
        }, status=status.HTTP_201_CREATED)


class OrderCreateView(generics.CreateAPIView):
    """
    POST /api/orders/create/
    Create a new stock request (Hospital Admins only)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]

    def create(self, request, *args, **kwargs):
        admin_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        data = request.data.copy()
        if admin_hospital:
            data["hospitalName"] = admin_hospital

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        return Response({
            "status": "success",
            "message": "Stock request created successfully",
            "order": serializer.data
        }, status=status.HTTP_201_CREATED)

class UnApprovedProductListView(generics.ListAPIView):
    """
    GET /api/orders/products/unapproved/?hospitalName=Zydus
    List pending product approvals (Admins only)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        hospital_name = self.request.query_params.get('hospitalName') or self.request.query_params.get('hospital_name')
        query = {"is_approved": False}
        if hospital_name and hospital_name.lower() != "all":
            query["hospitalName"] = hospital_name
        products = list(products_collection.find(query))
        for product in products:
            product["_id"] = str(product["_id"])
        return products

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        return Response({
            "status": "success",
            "count": len(queryset),
            "products": queryset
        }, status=status.HTTP_200_OK)

class ApproveProductView(APIView):
    """
    PUT /api/orders/products/<product_id>/
    Approve or reject a pending product (Admins only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]

    def put(self, request, product_id):
        product_oid = _parse_object_id(product_id, "productId")
        try:
            status_val = request.data.get("status")
            user_id = request.data.get("approved_by", request.user.id if hasattr(request, 'user') else None)
            
            if not status_val:
                return Response({
                    "status": "error",
                    "message": "status is required (approved or rejected)"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if status_val not in ["approved", "rejected"]:
                return Response({
                    "status": "error",
                    "message": "status must be 'approved' or 'rejected'"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            product = products_collection.find_one({"_id": product_oid, "is_approved": False})
            if not product:
                return Response({
                    "status": "error",
                    "message": "Pending product not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            admin_hospital = getattr(request.user, "hospitalName", None)
            
            if request.user.userType == "Admin" and product.get("hospitalName") != admin_hospital:
                return Response(
                    {"status": "error", "message": "You can only approve products for your own hospital"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if status_val == "approved":
                update_data = ProductDocument.update(
                    is_approved=True,
                    approved_by=user_id
                )
                products_collection.update_one(
                    {"_id": product_oid},
                    {"$set": update_data}
                )
                return Response({
                    "status": "success",
                    "message": "Product approved successfully",
                    "product_id": product_id
                }, status=status.HTTP_200_OK)
            else:
                # Delete rejected product instead of keeping it as unapproved
                products_collection.delete_one({"_id": product_oid})
                return Response({
                    "status": "success",
                    "message": "Product rejected and removed from system",
                    "product_id": product_id
                }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderListView(generics.ListAPIView):
    """
    GET /api/orders/list/?hospitalName=Zydus
    GET /api/orders/list/?supplier_company=MedPlus
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        query = {}
        user = self.request.user
        user_type = str(getattr(user, "userType", "") or "").strip().lower()

        if user_type == "supplier":
            supplier_company = _get_supplier_company_from_user(user)
            if not supplier_company:
                return []
            query["supplier_company"] = supplier_company
        elif user_type == "admin":
            admin_hospital = str(getattr(user, "hospitalName", "") or "").strip()
            if not admin_hospital:
                return []
            query["hospitalName"] = admin_hospital
        elif _is_super_admin(user):
            hospital_name = self.request.query_params.get('hospitalName') or self.request.query_params.get('hospital_name')
            supplier_company = self.request.query_params.get('supplier_company')
            if hospital_name:
                query["hospitalName"] = hospital_name
            if supplier_company:
                query["supplier_company"] = supplier_company
        else:
            return []

        orders = list(orders_collection.find(query))
        for order in orders:
            order["_id"] = str(order["_id"])
        return orders

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        return Response({
            "status": "success",
            "count": len(queryset),
            "orders": queryset
        }, status=status.HTTP_200_OK)




# NEW DRF API
class SupplierProductsView(generics.ListAPIView):
    """
    GET /api/orders/supplier-products/?supplier_company=MedPlus
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsSupplier]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        supplier_company = _get_supplier_company_from_user(self.request.user)
        if not supplier_company:
            return []
        products = list(products_collection.find({"supplier_company": supplier_company}))
        for product in products:
            product["_id"] = str(product["_id"])
        return products

    def list(self, request, *args, **kwargs):
        supplier_company = _get_supplier_company_from_user(request.user)
        if not supplier_company:
            return Response({
                "status": "error",
                "message": "Supplier profile/company not found"
            }, status=status.HTTP_403_FORBIDDEN)
        queryset = self.get_queryset()
        return Response({
            "status": "success",
            "count": len(queryset),
            "products": queryset
        }, status=status.HTTP_200_OK)


class SupplierOrdersView(generics.ListAPIView):
    """
    GET /api/orders/supplier-orders/?supplier_company=MedPlus
    List all orders for a specific supplier (Suppliers only)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsSupplier]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        supplier_company = _get_supplier_company_from_user(self.request.user)
        if not supplier_company:
            return []
        orders = list(orders_collection.find({"supplier_company": supplier_company}))
        for order in orders:
            order["_id"] = str(order["_id"])
        return orders

    def list(self, request, *args, **kwargs):
        supplier_company = _get_supplier_company_from_user(request.user)
        if not supplier_company:
            return Response({
                "status": "error",
                "message": "Supplier profile/company not found"
            }, status=status.HTTP_403_FORBIDDEN)
        queryset = self.get_queryset()
        return Response({
            "status": "success",
            "count": len(queryset),
            "orders": queryset
        }, status=status.HTTP_200_OK)


class FulfillOrderView(APIView):
    """
    POST /api/orders/<order_id>/fulfill/
    Fulfill a stock request (Suppliers only)
    """
    permission_classes = [IsAuthenticated, IsSupplier]
    authentication_classes = [JWTAuthentication]

    def post(self, request, order_id):
        order_oid = _parse_object_id(order_id, "orderId")
        try:
            supplier_company = _get_supplier_company_from_user(request.user)
            if not supplier_company:
                return Response({
                    "status": "error",
                    "message": "Supplier profile/company not found"
                }, status=status.HTTP_403_FORBIDDEN)

            # Validate required fields
            hospital_name = request.data.get("hospitalName") or request.data.get("hospital_name")
            quantity_fulfilled = request.data.get("quantity_fulfilled")
            price_per_strip = request.data.get("price_per_strip")
            
            if not all([hospital_name, quantity_fulfilled, price_per_strip]):
                return Response({
                    "status": "error",
                    "message": "hospitalName, quantity_fulfilled, and price_per_strip are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                quantity_fulfilled = int(quantity_fulfilled)
                price_per_strip = float(price_per_strip)
            except (ValueError, TypeError):
                return Response({
                    "status": "error",
                    "message": "quantity_fulfilled must be integer, price_per_strip must be float"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if quantity_fulfilled <= 0 or price_per_strip <= 0:
                return Response({
                    "status": "error",
                    "message": "quantity_fulfilled and price_per_strip must be greater than 0"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            expiry_date = request.data.get("expiry_date")
            fulfillment_notes = request.data.get("fulfillment_notes", "")

            order_doc = orders_collection.find_one({"_id": order_oid})
            if not order_doc:
                return Response({
                    "status": "error",
                    "message": "Order not found"
                }, status=status.HTTP_404_NOT_FOUND)
            if order_doc.get("supplier_company") != supplier_company:
                return Response({
                    "status": "error",
                    "message": "You can only fulfill your own supplier orders"
                }, status=status.HTTP_403_FORBIDDEN)
            if hospital_name and order_doc.get("hospitalName") != hospital_name:
                return Response({
                    "status": "error",
                    "message": "hospitalName does not match order hospital"
                }, status=status.HTTP_400_BAD_REQUEST)
            hospital_name = order_doc.get("hospitalName")
            
            total_price = quantity_fulfilled * price_per_strip
            
            update_data = OrderDocument.update(
                quantity_fulfilled=quantity_fulfilled,
                price_per_strip=price_per_strip,
                expiry_date=expiry_date,
                notes=fulfillment_notes,
                status="processing"
            )
            
            result = orders_collection.update_one(
                {"_id": order_oid, "hospitalName": hospital_name},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return Response({
                    "status": "error",
                    "message": "Order not found for this hospital"
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                "status": "success",
                "message": "Order fulfilled successfully",
                "order_id": order_id,
                "hospitalName": hospital_name,
                "quantity_fulfilled": quantity_fulfilled,
                "total_price": total_price
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CompleteOrderView(APIView):
    """
    POST /api/orders/<order_id>/complete/
    Mark order as completed after payment (Admins only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]

    def post(self, request, order_id):
        order_oid = _parse_object_id(order_id, "orderId")
        try:
            hospital_name = request.data.get('hospitalName') or request.data.get('hospital_name')
            payment_id = request.data.get('payment_id')
            
            if not hospital_name:
                return Response({
                    "status": "error",
                    "message": "hospitalName is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not payment_id:
                return Response({
                    "status": "error",
                    "message": "payment id is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            order_doc = orders_collection.find_one({"_id": order_oid})
            if not order_doc:
                return Response({
                    "status": "error",
                    "message": "Order not found"
                }, status=status.HTTP_404_NOT_FOUND)

            admin_hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
            order_hospital = str(order_doc.get("hospitalName", "") or "").strip()
            if admin_hospital and order_hospital and admin_hospital != order_hospital:
                return Response({
                    "status": "error",
                    "message": "You can only complete orders for your own hospital"
                }, status=status.HTTP_403_FORBIDDEN)
            if hospital_name and str(hospital_name).strip() != order_hospital:
                return Response({
                    "status": "error",
                    "message": "hospitalName does not match order hospital"
                }, status=status.HTTP_400_BAD_REQUEST)

            payment_query = {
                "$or": [
                    {"payment_id": payment_id},
                    {"paymentId": payment_id},
                    {"razorpay_payment_id": payment_id},
                ]
            }
            if ObjectId.is_valid(str(payment_id)):
                payment_query["$or"].append({"_id": ObjectId(str(payment_id))})

            payment = payments_collection.find_one(payment_query)
            if not payment:
                return Response({
                    "status": "error",
                    "message": "Payment not found"
                }, status=status.HTTP_404_NOT_FOUND)

            payment_status = str(payment.get("status", "") or "").strip().upper()
            if payment_status and payment_status not in {"SUCCESS", "COMPLETED", "PAID"}:
                return Response({
                    "status": "error",
                    "message": "Payment is not in a successful state"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            update_data = OrderDocument.update(status="completed")
            update_data["payment_id"] = payment_id
            
            result = orders_collection.update_one(
                {"_id": order_oid, "hospitalName": order_hospital},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return Response({
                    "status": "error",
                    "message": "Order not found for this hospital"
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                "status": "success",
                "message": "Order marked as completed",
                "order_id": order_id,
                "hospitalName": order_hospital,
                "payment_id": payment_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

