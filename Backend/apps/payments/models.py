from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

class PaymentSource(str, Enum):
    PATIENT = "PATIENT"     # appointment / invoice / other patient payment
    SUPPLIER = "SUPPLIER"   # supplier / purchase / inventory payment

class PaymentCategory(str, Enum):
    APPOINTMENT_BOOKING = "APPOINTMENT_BOOKING"     # patient booking appointment
    PRESCRIPTION_INVOICE = "PRESCRIPTION_INVOICE"   # patient paying invoice/bill
    SUPPLIER_PURCHASE = "SUPPLIER_PURCHASE"

class PaymentStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
@dataclass
class Payment:
    payment_id: str
    order_id: str
    source: PaymentSource
    category: PaymentCategory

    amount: float
    currency: str = "INR"
    status: PaymentStatus = PaymentStatus.SUCCESS

    quantity: Optional[int] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None

    # optional product / company details
    company_name: Optional[str] = None
    product_name: Optional[str] = None

    # use when source is PATIENT
    patient_id: Optional[str] = None
    appointment_id: Optional[str] = None
    invoice_id: Optional[str] = None
    patient_name: Optional[str] = None

    # use when source is SUPPLIER
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    admin_id: Optional[str] = None            # which admin processed / approved
    admin_name: Optional[str] = None
    purchase_order_id: Optional[str] = None   # if linked to PO
    supplier_note: Optional[str] = None

    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)