from dataclasses import asdict
from decimal import Decimal

from django.conf import settings
import razorpay
from razorpay.errors import SignatureVerificationError

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Payment, PaymentSource, PaymentCategory, PaymentStatus
from .serializers import PaymentSerializer, RazorpayVerifySerializer


def get_razorpay_client():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


class RazorpayOrderCreateAPIView(APIView):
    """
    Step 1: Create Razorpay Order after business validation.

    - patient or admin can pay for APPOINTMENT_BOOKING / PRESCRIPTION_INVOICE
    - only admin can pay for SUPPLIER_PURCHASE
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = PaymentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)

        user = request.user
        user_type = str(getattr(user, "userType", "") or "")
        is_admin = user_type.lower() in ("admin", "superadmin")

        category = data["category"]

        # ---- patient vs admin rules ----
        if category in (
            PaymentCategory.APPOINTMENT_BOOKING.value,
            PaymentCategory.PRESCRIPTION_INVOICE.value,
        ):
            if not is_admin:
                patient_id = data.get("patient_id")
                if not patient_id or str(patient_id) != str(user.id):
                    raise ValidationError("Patients can only pay for their own appointments/invoices.")

            user_hospital_id = getattr(user, "hospital_id", None)
            if user_hospital_id is not None:
                pay_hospital_id = data.get("hospital_id")
                if pay_hospital_id is not None and str(pay_hospital_id) != str(user_hospital_id):
                    raise ValidationError("Payment hospital does not match user's hospital.")

        if category == PaymentCategory.SUPPLIER_PURCHASE.value:
            if not is_admin:
                raise PermissionDenied("Only admins can make supplier purchase payments.")
            data.setdefault("admin_id", str(user.id))
            full_name = getattr(user, "get_full_name", None)
            if callable(full_name):
                admin_name = full_name() or getattr(user, "username", "") or ""
            else:
                admin_name = getattr(user, "username", "") or ""
            data.setdefault("admin_name", admin_name)

        # ---- create Razorpay order ----
        client = get_razorpay_client()
        amount = Decimal(data["amount"])
        amount_paise = int(amount * 100)

        rp_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": data.get("currency", "INR"),
                "receipt": data["order_id"],
                "payment_capture": 1,
                "notes": {
                    "category": data["category"],
                    "source": data["source"],
                    "patient_id": data.get("patient_id"),
                    "appointment_id": data.get("appointment_id"),
                    "invoice_id": data.get("invoice_id"),
                    "supplier_id": data.get("supplier_id"),
                    "purchase_order_id": data.get("purchase_order_id"),
                },
            }
        )

        # return order info + your meta so frontend can start Razorpay checkout
        return Response(
            {
                "razorpay_key_id": settings.RAZORPAY_KEY_ID,
                "razorpay_order": rp_order,
                "payment_meta": data,
            },
            status=status.HTTP_201_CREATED,
        )


class RazorpayPaymentVerifyAPIView(APIView):
    """
    Step 2: Verify Razorpay signature and create Payment record.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = RazorpayVerifySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)

        client = get_razorpay_client()

        params_dict = {
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_signature": data["razorpay_signature"],
        }

        try:
            client.utility.verify_payment_signature(params_dict)
        except SignatureVerificationError:
            raise ValidationError("Invalid Razorpay payment signature.")

        # Payment verified -> create domain object (here just dataclass)
        payment = Payment(
            payment_id=data["payment_id"],
            order_id=data["order_id"],
            source=PaymentSource(data["source"]),
            category=PaymentCategory(data["category"]),
            amount=float(data["amount"]),
            currency=data.get("currency", "INR"),
            status=PaymentStatus.SUCCESS,  # verified success
            quantity=data.get("quantity"),
            hospital_id=data.get("hospital_id"),
            hospital_name=data.get("hospital_name"),
            company_name=data.get("company_name"),
            product_name=data.get("product_name"),
            patient_id=data.get("patient_id"),
            appointment_id=data.get("appointment_id"),
            invoice_id=data.get("invoice_id"),
            patient_name=data.get("patient_name"),
            supplier_id=data.get("supplier_id"),
            supplier_name=data.get("supplier_name"),
            admin_id=data.get("admin_id"),
            admin_name=data.get("admin_name"),
            purchase_order_id=data.get("purchase_order_id"),
            supplier_note=data.get("supplier_note"),
        )

        return Response(asdict(payment), status=status.HTTP_201_CREATED)