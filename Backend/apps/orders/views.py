from datetime import datetime
from bson.objectid import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status, exceptions
from rest_framework.permissions import IsAuthenticated

from backend.db import products_collection, orders_collection, users_collection

from .serializers import ProductSerializer
from .models import ProductDocument
from .purchase_orders import (
    OrderError, cancel_order, complete_purchase_order, create_orders, fulfil_order, list_orders,
    reconcile_paid_orders, serialize_order, successful_payment_for,
)
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
            # status always follows the stock (Out of Stock <= 0 < Low Stock < 40 <= In Stock)
            product["status"] = ProductDocument._calculate_status(int(product.get("stock") or 0))
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


class OrderCreateView(APIView):
    """
    POST /api/orders/orders/create/   (Hospital Admins only)
    { items: [{product_id, quantity}], notes }  -> one purchase order per supplier.
    Old single-product payload { product_id, quantity } is still accepted.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        hospital = str(getattr(request.user, "hospitalName", "") or "").strip()
        if not hospital:
            return Response({"status": "error", "message": "No hospital is linked to this admin account."},
                            status=status.HTTP_403_FORBIDDEN)
        items = request.data.get("items")
        if not items and request.data.get("product_id"):
            items = [{"product_id": request.data.get("product_id"), "quantity": request.data.get("quantity")}]
        try:
            orders = create_orders(hospital, items, request.data.get("notes"), getattr(request.user, "email", None))
        except OrderError as exc:
            return Response({"status": "error", "message": exc.message}, status=exc.code)
        suppliers = ", ".join(o["supplier_company"] for o in orders)
        return Response({
            "status": "success",
            "message": f"{len(orders)} order(s) sent to {suppliers}.",
            "orders": orders,
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
            # status always follows the stock (Out of Stock <= 0 < Low Stock < 40 <= In Stock)
            product["status"] = ProductDocument._calculate_status(int(product.get("stock") or 0))
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

class OrderListView(APIView):
    """
    GET /api/orders/orders/
    Admin -> own hospital, Supplier -> own company, SuperAdmin -> ?hospitalName= &supplier_company=
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        user_type = str(getattr(user, "userType", "") or "").strip().lower()
        query = {}
        if user_type == "supplier":
            company = _get_supplier_company_from_user(user)
            if not company:
                return Response({"status": "success", "count": 0, "orders": []})
            query["supplier_company"] = company
        elif user_type == "admin":
            hospital = str(getattr(user, "hospitalName", "") or "").strip()
            if not hospital:
                return Response({"status": "success", "count": 0, "orders": []})
            query["hospitalName"] = hospital
        elif _is_super_admin(user):
            for key in ("hospitalName", "supplier_company"):
                if request.query_params.get(key):
                    query[key] = request.query_params[key]
        else:
            return Response({"status": "success", "count": 0, "orders": []})
        reconcile_paid_orders(query)
        orders = list_orders(query)
        return Response({"status": "success", "count": len(orders), "orders": orders}, status=status.HTTP_200_OK)


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
            # status always follows the stock (Out of Stock <= 0 < Low Stock < 40 <= In Stock)
            product["status"] = ProductDocument._calculate_status(int(product.get("stock") or 0))
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


class SupplierOrdersView(APIView):
    """GET /api/orders/supplier-orders/  -> purchase orders for the supplier's company (Suppliers only)"""
    permission_classes = [IsAuthenticated, IsSupplier]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        company = _get_supplier_company_from_user(request.user)
        if not company:
            return Response({"status": "error", "message": "Supplier profile/company not found"},
                            status=status.HTTP_403_FORBIDDEN)
        reconcile_paid_orders({"supplier_company": company})
        orders = list_orders({"supplier_company": company})
        return Response({"status": "success", "count": len(orders), "orders": orders}, status=status.HTTP_200_OK)


class FulfillOrderView(APIView):
    """
    POST /api/orders/orders/fulfill/<order_id>/   (Suppliers only)
    { items: [{product_id, quantity_fulfilled, price_per_strip, expiry_date}], notes }
    """
    permission_classes = [IsAuthenticated, IsSupplier]
    authentication_classes = [JWTAuthentication]

    def post(self, request, order_id):
        company = _get_supplier_company_from_user(request.user)
        if not company:
            return Response({"status": "error", "message": "Supplier profile/company not found"},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            order = fulfil_order(order_id, company, request.data)
        except OrderError as exc:
            return Response({"status": "error", "message": exc.message}, status=exc.code)
        return Response({"status": "success",
                         "message": f"{order['orderNumber']} fulfilled. The hospital can now pay ₹{order['total_amount']:.2f}.",
                         "order": order}, status=status.HTTP_200_OK)


class CancelOrderView(APIView):
    """POST /api/orders/orders/cancel/<order_id>/  { reason }  -> admin cancels / supplier declines a requested order"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request, order_id):
        role = str(getattr(request.user, "userType", "") or "").strip().lower()
        if role not in ("admin", "supplier"):
            return Response({"status": "error", "message": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        company = _get_supplier_company_from_user(request.user) if role == "supplier" else None
        try:
            order = cancel_order(order_id, request.user, role, company, request.data.get("reason"))
        except OrderError as exc:
            return Response({"status": "error", "message": exc.message}, status=exc.code)
        word = "declined" if role == "supplier" else "cancelled"
        return Response({"status": "success", "message": f"{order['orderNumber']} {word}.", "order": order},
                        status=status.HTTP_200_OK)


class CompleteOrderView(APIView):
    """
    POST /api/orders/orders/complete/<order_id>/   (Admins only)
    Orders are completed automatically when the Razorpay payment is verified. This endpoint only
    re-checks: if a successful payment exists for the order, the order is completed (stock added).
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]

    def post(self, request, order_id):
        order_oid = _parse_object_id(order_id, "orderId")
        order = orders_collection.find_one({"_id": order_oid})
        if not order:
            return Response({"status": "error", "message": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        if order.get("hospitalName") != getattr(request.user, "hospitalName", None):
            return Response({"status": "error", "message": "You can only complete orders for your own hospital"},
                            status=status.HTTP_403_FORBIDDEN)
        if order.get("status") == "completed":
            return Response({"status": "success", "message": "Order already completed.",
                             "order": serialize_order(order)}, status=status.HTTP_200_OK)
        payment = successful_payment_for(order_oid)
        if not payment:
            return Response({"status": "error", "message": "No successful payment found for this order."},
                            status=status.HTTP_404_NOT_FOUND)
        order = complete_purchase_order(order_oid, payment)
        return Response({"status": "success", "message": "Order marked as completed",
                         "order": serialize_order(order)}, status=status.HTTP_200_OK)
