from django.urls import path

from .views import (
    ProductListView, ProductCreateView, ApproveProductView,
    UnApprovedProductListView,
    OrderListView, OrderCreateView,
    SupplierProductsView, SupplierOrdersView,
    FulfillOrderView, CompleteOrderView
)

urlpatterns = [
    # Product Endpoints
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/create/', ProductCreateView.as_view(), name='product-create'),
    path('products/approve/<str:product_id>/', ApproveProductView.as_view(), name='approve-product'),
    path('products/unapproved/', UnApprovedProductListView.as_view(), name='unapproved-products'),
    # Order Endpoints
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/create/', OrderCreateView.as_view(), name='order-create'),
    path('orders/fulfill/<str:order_id>/', FulfillOrderView.as_view(), name='fulfill-order'),
    path('orders/complete/<str:order_id>/', CompleteOrderView.as_view(), name='complete-order'),
    # Supplier-specific Endpoints
    path('supplier-products/', SupplierProductsView.as_view(), name='supplier-products'),
    path('supplier-orders/', SupplierOrdersView.as_view(), name='supplier-orders'),
    
    
    
    # ========== OLD FUNCTION-BASED ENDPOINTS (COMMENTED - FOR REFERENCE) ==========
    # path('get_products/<str:hospital_name>/', get_products, name='get_products'),
    # path('add_product/', add_product, name='add_product'),
    # path('request_stock/', request_stock, name='request_stock'),
    # path('get_new_products/<str:hospital_name>/', get_new_products, name='get_new_products'),
    # path('approve_new_product/<str:product_id>/', approve_new_product, name='approve_new_product'),
    # path('get_supplier_products/<str:companyName>/', get_supplier_products, name='get_supplier_products'),
    # path('get_stock_request_by_supplier/<str:companyName>/', get_stocks_requests_by_supplier, name='get_stock_requests'),
    # path('get_stocks_requests_by_hospital/<str:hospitalName>/', get_stocks_requests_by_hospital, name='get_stock_requests'),
    # path('fulfill_request/', fulfill_request, name='fulfill_request'),
    # path('complete_order/<str:order_id>/', complete_order, name='complete_order'),
]
