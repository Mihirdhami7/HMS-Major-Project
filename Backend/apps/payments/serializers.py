from rest_framework import serializers

from .models import PaymentSource, PaymentCategory, PaymentStatus

class PaymentSerializer(serializers.Serializer):
    # core payment info
    payment_id = serializers.CharField()
    order_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(default="INR")
    status = serializers.ChoiceField(
        choices=[(s.value, s.value) for s in PaymentStatus],
        default=PaymentStatus.SUCCESS.value,
    )

    source = serializers.ChoiceField(choices=[(s.value, s.value) for s in PaymentSource])
    category = serializers.ChoiceField(choices=[(c.value, c.value) for c in PaymentCategory])

    quantity = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    hospital_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    hospital_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    # product / company
    company_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    product_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    # patient side
    patient_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    appointment_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    invoice_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    patient_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    # supplier side
    supplier_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    supplier_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    admin_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    admin_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    purchase_order_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    supplier_note = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    # read-only timestamps
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate(self, attrs):
        category = attrs.get("category")
        source = attrs.get("source")

        # appointment / invoice payments -> source must be PATIENT
        if category in (
            PaymentCategory.APPOINTMENT_BOOKING.value,
            PaymentCategory.PRESCRIPTION_INVOICE.value,
        ):
            if source != PaymentSource.PATIENT.value:
                raise serializers.ValidationError(
                    "For appointment or prescription invoice payments, source must be PATIENT."
                )

            if not attrs.get("patient_id"):
                raise serializers.ValidationError("patient_id is required for patient payments.")

            if category == PaymentCategory.APPOINTMENT_BOOKING.value:
                if not attrs.get("appointment_id"):
                    raise serializers.ValidationError(
                        "appointment_id is required for APPOINTMENT_BOOKING payments."
                    )

            if category == PaymentCategory.PRESCRIPTION_INVOICE.value:
                if not attrs.get("invoice_id"):
                    raise serializers.ValidationError(
                        "invoice_id is required for PRESCRIPTION_INVOICE payments."
                    )

        # supplier purchase -> source must be SUPPLIER
        if category == PaymentCategory.SUPPLIER_PURCHASE.value:
            if source != PaymentSource.SUPPLIER.value:
                raise serializers.ValidationError(
                    "For supplier purchase payments, source must be SUPPLIER."
                )

            if not attrs.get("purchase_order_id"):
                raise serializers.ValidationError("purchase_order_id is required for SUPPLIER_PURCHASE payments.")
            if not attrs.get("supplier_id"):
                raise serializers.ValidationError("supplier_id is required for SUPPLIER_PURCHASE payments.")
            if attrs.get("quantity") in (None, 0):
                raise serializers.ValidationError("quantity is required and must be >= 1 for SUPPLIER_PURCHASE.")

        return attrs


class RazorpayVerifySerializer(PaymentSerializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()