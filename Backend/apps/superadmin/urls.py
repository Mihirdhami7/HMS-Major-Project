from django.urls import path

from .finance import FinanceView
from .manage import (
    AdminDetailView, AdminInviteView, AdminsView, HospitalDetailView, HospitalsView, SupplierDetailView,
    SuppliersView,
)
from .settings_views import PublicSettingsView, SettingsView, TestRazorpayView
from .views import DashboardView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="superadmin-dashboard"),
    # hospitals + their admins
    path("hospitals/", HospitalsView.as_view(), name="superadmin-hospitals"),
    path("hospitals/<str:hospital_id>/", HospitalDetailView.as_view(), name="superadmin-hospital"),
    path("admins/", AdminsView.as_view(), name="superadmin-admins"),
    path("admins/<str:admin_id>/", AdminDetailView.as_view(), name="superadmin-admin"),
    path("admins/<str:admin_id>/invite/", AdminInviteView.as_view(), name="superadmin-admin-invite"),
    # suppliers (the invite view also works for suppliers)
    path("suppliers/", SuppliersView.as_view(), name="superadmin-suppliers"),
    path("suppliers/<str:supplier_id>/", SupplierDetailView.as_view(), name="superadmin-supplier"),
    path("suppliers/<str:admin_id>/invite/", AdminInviteView.as_view(), name="superadmin-supplier-invite"),
    # money + settings
    path("finance/", FinanceView.as_view(), name="superadmin-finance"),
    path("settings/", SettingsView.as_view(), name="superadmin-settings"),
    path("settings/test-razorpay/", TestRazorpayView.as_view(), name="superadmin-test-razorpay"),
    path("public-settings/", PublicSettingsView.as_view(), name="public-settings"),
]
