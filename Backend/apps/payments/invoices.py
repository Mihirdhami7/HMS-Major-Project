"""
Medicine bills (invoices) for dispensed prescriptions.

Used by:
  - POST /api/payments/invoices/cash/  -> admin takes a cash payment at the pharmacy counter
  - online PRESCRIPTION_INVOICE payments (apps/payments/views.py) after Razorpay verification
  - GET  /api/payments/invoices/       -> billing history for the admin's hospital

Prices always come from the hospital's products (never from the browser). Creating an invoice
marks the prescription as invoiced and reduces product stock for every dispensed item.
"""
import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.appointments.models import NotificationDocument
from backend.db import (
    invoices_collection, notifications_collection, prescriptions_collection, products_collection,
)

logger = logging.getLogger(__name__)
MAX_QTY = 1000


class InvoiceError(Exception):
    def __init__(self, message, code=status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.code = code


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _oid(value):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None


def _role(user):
    return str(getattr(user, "userType", "") or "").strip().lower()


def load_prescription_for_admin(prescription_id, user):
    """Prescription of the admin's hospital that has not been billed yet."""
    presc = prescriptions_collection.find_one({"_id": _oid(prescription_id)}) if _oid(prescription_id) else None
    if not presc:
        raise InvoiceError("Prescription not found.", status.HTTP_404_NOT_FOUND)
    if _role(user) != "superadmin" and presc.get("hospitalName") != getattr(user, "hospitalName", None):
        raise InvoiceError("This prescription belongs to another hospital.", status.HTTP_403_FORBIDDEN)
    if presc.get("invoiceId"):
        raise InvoiceError("This prescription is already billed.")
    return presc


def price_items(hospital_name, items):
    """
    items: [{medicineId, quantity}] -> ([{medicineId, name, quantity, price, total}], amount)
    Each medicine must be an approved product of the hospital with enough stock.
    """
    if not isinstance(items, list) or not items:
        raise InvoiceError("Add at least one medicine to the bill.")
    priced, amount, seen = [], 0.0, set()
    for item in items:
        pid = _oid((item or {}).get("medicineId"))
        try:
            qty = int((item or {}).get("quantity"))
        except (TypeError, ValueError):
            qty = 0
        if not pid or qty <= 0 or qty > MAX_QTY:
            raise InvoiceError("Each medicine needs a valid id and a quantity of at least 1.")
        if pid in seen:
            continue
        seen.add(pid)
        product = products_collection.find_one({"_id": pid, "hospitalName": hospital_name, "is_approved": True})
        if not product:
            raise InvoiceError("A selected medicine is not available in this hospital's pharmacy.")
        if int(product.get("stock") or 0) < qty:
            raise InvoiceError(f"Only {product.get('stock', 0)} of {product.get('product_name')} left in stock.")
        price = float(product.get("price_per_strip") or 0)
        total = round(price * qty, 2)
        priced.append({"medicineId": str(pid), "name": product.get("product_name"), "quantity": qty,
                       "price": price, "total": total})
        amount += total
    return priced, round(amount, 2)


def _reduce_stock(items):
    """Take dispensed quantities out of stock (never below zero) and refresh the stock status."""
    for item in items:
        pid = _oid(item.get("medicineId"))
        if not pid:
            continue
        updated = products_collection.find_one_and_update(
            {"_id": pid, "stock": {"$gte": item["quantity"]}},
            {"$inc": {"stock": -item["quantity"]}, "$set": {"updated_at": _now()}},
            return_document=True,
        )
        if updated:
            stock = int(updated.get("stock") or 0)
            label = "Out of Stock" if stock <= 0 else ("Low Stock" if stock < 40 else "In Stock")
            products_collection.update_one({"_id": pid}, {"$set": {"status": label}})
        else:
            logger.warning("Stock not reduced for %s (insufficient stock)", item.get("name"))


def create_invoice(presc, items, amount, method, payment_id=None, created_by=None):
    """Save the invoice, mark the prescription billed, reduce stock, notify the patient."""
    invoice_id = f"INV-{presc['_id']}"
    now = _now()
    patient = presc.get("patient") or {}
    doc = {
        "invoiceId": invoice_id,
        "prescriptionId": str(presc["_id"]),
        "appointmentId": presc.get("appointmentId"),
        "patient": {"patientId": patient.get("patientId"), "name": patient.get("name"), "email": patient.get("email")},
        "doctor": {"name": (presc.get("doctor") or {}).get("name"), "email": (presc.get("doctor") or {}).get("email")},
        "department": presc.get("department"),
        "hospitalName": presc.get("hospitalName"),
        "medicines": items,
        "totalAmount": amount,
        "paymentId": payment_id,
        "paymentMethod": method,
        "status": "paid",
        "createdBy": created_by,
        "createdAt": now,
        "updatedAt": now,
    }
    result = invoices_collection.update_one({"invoiceId": invoice_id}, {"$setOnInsert": doc}, upsert=True)
    if not result.upserted_id:  # already billed (e.g. duplicate verify) -> do nothing twice
        return invoices_collection.find_one({"invoiceId": invoice_id})
    prescriptions_collection.update_one(
        {"_id": presc["_id"]},
        {"$set": {"invoiceId": invoice_id, "status": "invoiced", "invoicedAt": now, "updatedAt": now}},
    )
    _reduce_stock(items)
    if patient.get("email"):
        notifications_collection.insert_one(NotificationDocument.create(
            user_email=patient["email"],
            title="Medicine Bill Paid",
            message=f"Your medicine bill of ₹{amount:.0f} has been paid ({method}). Thank you!",
            notification_type="payment",
            reference_id=str(presc["_id"]),
        ))
    return invoices_collection.find_one({"invoiceId": invoice_id})


def serialize_invoice(doc):
    created = doc.get("createdAt") or doc.get("created_at")
    patient = doc.get("patient") or {"name": doc.get("patientName"), "email": doc.get("patientEmail")}
    return {
        "id": str(doc["_id"]),
        "invoiceId": doc.get("invoiceId") or str(doc["_id"])[-8:].upper(),
        "prescriptionId": doc.get("prescriptionId"),
        "patient": patient,
        "doctor": doc.get("doctor") or {},
        "department": doc.get("department"),
        "medicines": doc.get("medicines") or [],
        "totalAmount": float(doc.get("totalAmount") or 0),
        "paymentId": doc.get("paymentId"),
        "paymentMethod": doc.get("paymentMethod") or ("online" if doc.get("paymentId") else "cash"),
        "status": doc.get("status") or "paid",
        "createdAt": created.isoformat() + "Z" if isinstance(created, datetime) else created,
    }


class InvoiceListView(APIView):
    """GET /api/payments/invoices/?range=today|7d|30d|all  -> billing history of the admin's hospital."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = _role(request.user)
        if role not in ("admin", "superadmin"):
            return Response({"status": "error", "message": "Only hospital staff can view bills."},
                            status=status.HTTP_403_FORBIDDEN)
        query = {}
        if role == "admin":
            query["hospitalName"] = request.user.hospitalName
        days = {"today": 0, "7d": 7, "30d": 30}.get(request.query_params.get("range", "all"))
        if days is not None:
            start = _now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
            query["$or"] = [{"createdAt": {"$gte": start}}, {"created_at": {"$gte": start}}]
        docs = list(invoices_collection.find(query).sort([("createdAt", -1), ("created_at", -1)]).limit(500))
        items = [serialize_invoice(d) for d in docs]
        return Response({
            "status": "success",
            "count": len(items),
            "total": round(sum(i["totalAmount"] for i in items), 2),
            "invoices": items,
        }, status=status.HTTP_200_OK)


class CashInvoiceView(APIView):
    """POST /api/payments/invoices/cash/  { prescriptionId, items: [{medicineId, quantity}] }"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if _role(request.user) not in ("admin", "superadmin"):
            return Response({"status": "error", "message": "Only hospital staff can take payments."},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            presc = load_prescription_for_admin(request.data.get("prescriptionId"), request.user)
            items, amount = price_items(presc.get("hospitalName"), request.data.get("items"))
            invoice = create_invoice(presc, items, amount, "cash", created_by=request.user.email)
        except InvoiceError as exc:
            return Response({"status": "error", "message": exc.message}, status=exc.code)
        except Exception as exc:
            logger.error("CashInvoiceView: %s", exc, exc_info=True)
            return Response({"status": "error", "message": "Could not save the bill. Please try again."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"status": "success", "message": f"Cash payment of ₹{amount:.2f} recorded.",
                         "invoice": serialize_invoice(invoice)}, status=status.HTTP_201_CREATED)
