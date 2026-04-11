from django.urls import path
from .views import RazorpayOrderCreateAPIView, RazorpayPaymentVerifyAPIView

urlpatterns = [
    path("razorpay/order/", RazorpayOrderCreateAPIView.as_view(), name="razorpay-order-create"),
    path("razorpay/verify/", RazorpayPaymentVerifyAPIView.as_view(), name="razorpay-payment-verify"),
]