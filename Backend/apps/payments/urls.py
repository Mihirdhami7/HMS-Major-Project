from django.urls import path
from .views import RazorpayOrderCreateAPIView, RazorpayPaymentVerifyAPIView
from .invoices import InvoiceListView, CashInvoiceView

urlpatterns = [
    path("razorpay/order/", RazorpayOrderCreateAPIView.as_view(), name="razorpay-order-create"),
    path("razorpay/verify/", RazorpayPaymentVerifyAPIView.as_view(), name="razorpay-payment-verify"),
    path("invoices/", InvoiceListView.as_view(), name="invoice-list"),
    path("invoices/cash/", CashInvoiceView.as_view(), name="invoice-cash"),
]