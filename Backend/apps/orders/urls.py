from django.urls import path

from .views import (
    get_products, add_product, request_stock, get_new_products, approve_new_product,
    get_supplier_products, get_stocks_requests_by_hospital, get_stocks_requests_by_supplier, fulfill_request, complete_order
)
urlpatterns = [
    
    # Order management views
    path('get_products/<str:hospital_name>/', get_products, name='get_products'),
    path('add_product/', add_product, name='add_product'),
    path('request_stock/', request_stock, name='request_stock'),
    path('get_new_products/<str:hospital_name>/', get_new_products, name='get_new_products'),
    path('approve_new_product/<str:product_id>/', approve_new_product, name='approve_new_product'),
    path('get_supplier_products/<str:companyName>/', get_supplier_products, name='get_supplier_products'),
    path('get_stock_request_by_supplier/<str:companyName>/', get_stocks_requests_by_supplier, name='get_stock_requests'),
    path('get_stocks_requests_by_hospital/<str:hospitalName>/', get_stocks_requests_by_hospital, name='get_stock_requests'),
    
    path('fulfill_request/', fulfill_request, name='fulfill_request'),
    path('complete_order/<str:order_id>/', complete_order, name='complete_order'),
]
