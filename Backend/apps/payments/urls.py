from django.urls import path
from .views import (
    create_payment, verify_payment, create_payment_products, verify_payment_products
)

urlpatterns = [
    #Payment views
    path('create_payment/', create_payment, name='create_payment'),
    path('verify_payment/', verify_payment, name='verify_payment'),
    path('create_payment_products/', create_payment_products, name='create_payment_products'),
    path('verify_payment_products/', verify_payment_products, name='verify_payment_products'),
]
