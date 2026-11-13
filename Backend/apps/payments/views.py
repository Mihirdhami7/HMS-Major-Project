"""
Razorpay payments.

Flow:
  1. POST /api/payments/razorpay/order/   -> server validates what is being paid for, decides the
     amount itself, creates the Razorpay order and stores a payment record (status CREATED).
  2. Browser opens Razorpay Checkout with the returned key + order id.
  3. POST /api/payments/razorpay/verify/  -> server checks the signature, fetches the payment from
     Razorpay (status / order / amount), marks the record SUCCESS and applies the effect:
       APPOINTMENT_BOOKING  -> new booking: the appointment is CREATED now (pay first, then booked);
                               existing unpaid appointment: payment added to appointment.payments
       PRESCRIPTION_INVOICE -> invoice saved, prescription marked invoiced
       SUPPLIER_PURCHASE    -> payment record is what "complete order" looks up

The amount sent by the browser is never trusted for appointment / supplier payments.
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import razorpay
from bson import ObjectId
from bson.errors import InvalidId
from django.conf import settings
from razorpay.errors import BadRequestError, ServerError, SignatureVerificationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.appointments.models import AppointmentDocument, NotificationDocument
from apps.appointments.serializers import BookAppointmentSerializer
from apps.appointments.views import BookingError, create_booking, prepare_booking
from backend.db import (
    appointments_collection, invoices_collection, notifications_collection,
    orders_collection, payments_collection, prescriptions_collection, users_collection,
)
from .models import PaymentCategory
from .serializers import PaymentSerializer, RazorpayVerifySerializer
from .invoices import InvoiceError, create_invoice, load_prescription_for_admin, price_items

logger = logging.getLogger(__name__)

MAX_INVOICE_AMOUNT = Decimal("100000")  # sanity limit for a counter bill (INR)


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_razorpay_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"status": "error", "message": message}, status=code)


def _role(user):
    return str(getattr(user, "userType", "") or "").strip().lower()


def _oid(value):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None


class RazorpayOrderCreateAPIView(APIView):
    """Step 1: validate what is being paid for, decide the amount, create the Razorpay order."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            return _error("Online payment is not configured on the server.", status.HTTP_503_SERVICE_UNAVAILABLE)

        serializer = PaymentSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = dict(serializer.validated_data)

        user = request.user
        role = _role(user)
        email = getattr(user, "email", None)
        user_hospital = getattr(user, "hospitalName", None)
        is_admin = role in ("admin", "superadmin")
        category = data["category"]

        record = {
            "category": category,
            "source": data["source"],
            "currency": "INR",
            "status": "CREATED",
            "created_by": email,
            "created_by_role": role,
            "created_at": _now(),
            "updated_at": _now(),
        }

        # ---------------- decide WHAT is paid and HOW MUCH (server side) ----------------
        if category == PaymentCategory.APPOINTMENT_BOOKING.value and data.get("booking"):
            # Pay-first booking: validate everything now, create the appointment only after payment.
            booking_ser = BookAppointmentSerializer(data=data["booking"])
            if not booking_ser.is_valid():
                return Response({"status": "error", "errors": booking_ser.errors}, status=status.HTTP_400_BAD_REQUEST)
            try:
                booking, patient, doctor = prepare_booking(booking_ser.validated_data, email, role, user_hospital)
            except BookingError as exc:
                return _error(exc.message, exc.code)
            amount = Decimal(settings.APPOINTMENT_BOOKING_FEE)
            record.update({
                "booking": booking,
                "booked_by_role": role,
                "patient_id": str(patient["_id"]),
                "patient_email": patient["email"],
                "patient_name": patient.get("name"),
                "hospital_name": booking["hospitalName"],
                "description": f"Appointment booking fee - {booking['department']} with {doctor.get('name')}",
            })

        elif category == PaymentCategory.APPOINTMENT_BOOKING.value:
            appt = appointments_collection.find_one({"_id": _oid(data.get("appointment_id"))}) if _oid(data.get("appointment_id")) else None
            if not appt:
                return _error("Appointment not found.", status.HTTP_404_NOT_FOUND)
            if role == "patient":
                if appt.get("patient", {}).get("email") != email or appt.get("hospitalName") != user_hospital:
                    return _error("You can only pay for your own appointments.", status.HTTP_403_FORBIDDEN)
            elif not (is_admin and (role == "superadmin" or appt.get("hospitalName") == user_hospital)):
                return _error("You are not allowed to pay for this appointment.", status.HTTP_403_FORBIDDEN)
            if appt.get("status") in ("rejected", "cancelled"):
                return _error(f"This appointment is {appt.get('status')}; it cannot be paid.")
            if any(str(p.get("status", "")).lower() in ("completed", "success", "paid") for p in appt.get("payments", [])):
                return _error("This appointment is already paid.")
            amount = Decimal(settings.APPOINTMENT_BOOKING_FEE)
            record.update({
                "appointment_id": str(appt["_id"]),
                "patient_id": appt.get("patient", {}).get("patientId"),
                "patient_email": appt.get("patient", {}).get("email"),
                "patient_name": appt.get("patient", {}).get("name"),
                "hospital_name": appt.get("hospitalName"),
                "description": f"Appointment booking fee - {appt.get('department')}",
            })

        elif category == PaymentCategory.PRESCRIPTION_INVOICE.value:
            if not is_admin:
                return _error("Only hospital staff can collect a medicine bill.", status.HTTP_403_FORBIDDEN)
            try:
                presc = load_prescription_for_admin(data.get("order_id"), request.user)
                if data.get("items"):
                    # dispensed cart items, priced from the hospital's products
                    items, priced_amount = price_items(presc.get("hospitalName"), data["items"])
                    amount = Decimal(str(priced_amount))
                    record["items"] = items
                else:
                    amount = Decimal(str(data["amount"]))
            except InvoiceError as exc:
                return _error(exc.message, exc.code)
            except (InvalidOperation, KeyError):
                return _error("Invalid amount.")
            if amount <= 0 or amount > MAX_INVOICE_AMOUNT:
                return _error("Bill amount must be between ₹1 and ₹1,00,000.")
            record.update({
                "prescription_id": str(presc["_id"]),
                "invoice_id": data.get("invoice_id") or f"INV-{presc['_id']}",
                "patient_id": presc.get("patient", {}).get("patientId"),
                "patient_email": presc.get("patient", {}).get("email"),
                "patient_name": presc.get("patient", {}).get("name"),
                "hospital_name": presc.get("hospitalName"),
                "description": "Medicine bill",
            })

        elif category == PaymentCategory.SUPPLIER_PURCHASE.value:
            if not is_admin:
                return _error("Only admins can pay suppliers.", status.HTTP_403_FORBIDDEN)
            order = orders_collection.find_one({"_id": _oid(data.get("purchase_order_id"))}) if _oid(data.get("purchase_order_id")) else None
            if not order:
                return _error("Stock order not found.", status.HTTP_404_NOT_FOUND)
            if role != "superadmin" and order.get("hospitalName") != user_hospital:
                return _error("This order belongs to another hospital.", status.HTTP_403_FORBIDDEN)
            if order.get("status") == "completed":
                return _error("This order is already completed.")
            qty = int(order.get("quantity_fulfilled") or order.get("quantity_ordered") or 0)
            amount = Decimal(str(order.get("price_per_strip") or 0)) * qty
            if amount <= 0:
                return _error("The supplier has not fulfilled this order yet.")
            record.update({
                "purchase_order_id": str(order["_id"]),
                "company_name": order.get("supplier_company"),
                "product_name": order.get("product_name"),
                "quantity": qty,
                "hospital_name": order.get("hospitalName"),
                "description": f"Stock purchase - {order.get('product_name')} x {qty}",
            })
        else:
            return _error("Unknown payment category.")

        amount = amount.quantize(Decimal("0.01"))
        record["amount"] = float(amount)

        # ---------------- create the Razorpay order ----------------
        try:
            rp_order = get_razorpay_client().order.create({
                "amount": int(amount * 100),          # paise
                "currency": "INR",
                "receipt": f"{category[:4]}-{_now():%Y%m%d%H%M%S%f}"[:40],
                "notes": {k: str(record.get(k) or "") for k in (
                    "category", "appointment_id", "prescription_id", "purchase_order_id", "created_by")},
            })
        except (BadRequestError, ServerError) as exc:
            logger.error("Razorpay order create failed: %s", exc)
            return _error("Could not start the payment with Razorpay. Please try again.", status.HTTP_502_BAD_GATEWAY)

        record["razorpay_order_id"] = rp_order["id"]
        payments_collection.insert_one(record)

        return Response({
            "status": "success",
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "razorpay_order": rp_order,
            "payment_meta": {k: v for k, v in record.items() if k != "_id" and not isinstance(v, datetime)},
        }, status=status.HTTP_201_CREATED)


class RazorpayPaymentVerifyAPIView(APIView):
    """Step 2: verify with Razorpay, mark the payment SUCCESS and apply its effect (idempotent)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = RazorpayVerifySerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        order_id = data["razorpay_order_id"]
        payment_id = data["razorpay_payment_id"]

        record = payments_collection.find_one({"razorpay_order_id": order_id})
        if not record:
            return _error("Unknown payment order.", status.HTTP_404_NOT_FOUND)
        if record.get("created_by") != getattr(request.user, "email", None):
            return _error("This payment belongs to another user.", status.HTTP_403_FORBIDDEN)
        if record.get("status") == "SUCCESS":
            if record.get("razorpay_payment_id") == payment_id:
                return Response({"status": "success", "message": "Payment already verified.",
                                 "payment_id": payment_id, "appointment_id": record.get("appointment_id")},
                                status=status.HTTP_200_OK)
            return _error("This order is already paid.")

        client = get_razorpay_client()
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": data["razorpay_signature"],
            })
        except SignatureVerificationError:
            payments_collection.update_one({"_id": record["_id"]}, {"$set": {"status": "FAILED", "updated_at": _now(),
                                                                          "failure_reason": "invalid signature"}})
            return _error("Payment signature is invalid.")

        try:
            rp_payment = client.payment.fetch(payment_id)
        except (BadRequestError, ServerError) as exc:
            logger.error("Razorpay payment fetch failed: %s", exc)
            return _error("Could not confirm the payment with Razorpay. Please contact the hospital.",
                          status.HTTP_502_BAD_GATEWAY)

        expected_paise = int(round(record["amount"] * 100))
        if (rp_payment.get("order_id") != order_id or int(rp_payment.get("amount", 0)) != expected_paise
                or rp_payment.get("status") not in ("captured", "authorized")):
            payments_collection.update_one({"_id": record["_id"]}, {"$set": {
                "status": "FAILED", "updated_at": _now(),
                "failure_reason": f"razorpay status={rp_payment.get('status')} amount={rp_payment.get('amount')}"}})
            return _error("Payment was not completed.")

        paid_at = _now()
        # Atomic: only the first verify call for this order flips it to SUCCESS and applies the
        # effect (prevents a double-click from creating two appointments).
        claimed = payments_collection.update_one({"_id": record["_id"], "status": {"$ne": "SUCCESS"}}, {"$set": {
            "status": "SUCCESS",
            "razorpay_payment_id": payment_id,
            "payment_id": payment_id,              # field used by "complete order"
            "method": rp_payment.get("method"),
            "paid_at": paid_at,
            "updated_at": paid_at,
        }})
        if claimed.modified_count == 0:
            latest = payments_collection.find_one({"_id": record["_id"]}) or {}
            return Response({"status": "success", "message": "Payment already verified.",
                             "payment_id": payment_id, "appointment_id": latest.get("appointment_id")},
                            status=status.HTTP_200_OK)

        appointment_id = self._apply_effect(record, payment_id, paid_at)
        message = "Payment successful."
        if record.get("booking"):
            message = ("Payment successful. Your appointment is booked and waiting for the doctor's approval."
                       if appointment_id else
                       "Payment successful, but the appointment could not be created. Please contact the hospital.")
        return Response({"status": "success", "message": message, "payment_id": payment_id,
                         "appointment_id": appointment_id, "amount": record["amount"],
                         "category": record["category"]}, status=status.HTTP_200_OK)

    @staticmethod
    def _apply_effect(record, payment_id, paid_at):
        category = record["category"]
        try:
            if category == PaymentCategory.APPOINTMENT_BOOKING.value and record.get("booking"):
                entry = AppointmentDocument.add_payment(payment_id, record["amount"], "consultation", "completed")
                booking = record["booking"]
                patient = users_collection.find_one({"email": record["patient_email"], "userType": "Patient",
                                                     "hospitalName": booking["hospitalName"]})
                doctor = users_collection.find_one({"email": booking["doctorEmail"], "userType": "Doctor",
                                                    "hospitalName": booking["hospitalName"]})
                if not patient or not doctor:
                    raise RuntimeError("patient or doctor no longer exists")
                created = create_booking(booking, patient, doctor, booked_by=record.get("created_by"),
                                         admin_booking=record.get("booked_by_role") == "admin", payments=[entry])
                appointment_id = created["_id"]
                payments_collection.update_one({"_id": record["_id"]}, {"$set": {"appointment_id": appointment_id}})
                notifications_collection.insert_one(NotificationDocument.create(
                    user_email=record.get("patient_email"),
                    title="Payment Received",
                    message=f"We received ₹{record['amount']:.0f}. Your appointment on {booking['appointmentDate']} at {booking['appointmentTime']} is booked.",
                    notification_type="payment",
                    reference_id=appointment_id,
                ))
                return appointment_id

            if category == PaymentCategory.APPOINTMENT_BOOKING.value:
                entry = AppointmentDocument.add_payment(payment_id, record["amount"], "consultation", "completed")
                appointments_collection.update_one(
                    {"_id": ObjectId(record["appointment_id"]), "payments.paymentId": {"$ne": payment_id}},
                    {"$push": {"payments": entry}, "$set": {"updatedAt": paid_at}},
                )
                notifications_collection.insert_one(NotificationDocument.create(
                    user_email=record.get("patient_email"),
                    title="Payment Received",
                    message=f"We received ₹{record['amount']:.0f} for your appointment booking. Thank you!",
                    notification_type="payment",
                    reference_id=record["appointment_id"],
                ))

            elif category == PaymentCategory.PRESCRIPTION_INVOICE.value:
                presc = prescriptions_collection.find_one({"_id": ObjectId(record["prescription_id"])})
                if presc:
                    items = record.get("items") or [
                        {"medicineId": m.get("medicineId"), "name": m.get("name"), "quantity": int(m.get("quantity") or 1),
                         "price": float(m.get("price") or 0), "total": float(m.get("price") or 0) * int(m.get("quantity") or 1)}
                        for m in presc.get("medicines", []) if m.get("medicineId")
                    ]
                    create_invoice(presc, items, record["amount"], "online", payment_id=payment_id,
                                   created_by=record.get("created_by"))
            # SUPPLIER_PURCHASE: the SUCCESS payment record is used by "complete order".
            return record.get("appointment_id")
        except Exception as exc:  # payment is already recorded as SUCCESS; log the follow-up failure
            logger.error("Payment %s succeeded but follow-up update failed: %s", payment_id, exc, exc_info=True)
            payments_collection.update_one({"_id": record["_id"]}, {"$set": {"follow_up_error": str(exc)}})
            return None
