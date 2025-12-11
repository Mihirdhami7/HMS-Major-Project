from django.urls import path

# Authentication and User Management views
from .views import (
    RegisterUserAPIView, VerifyEmailAPIView, LoginAPIView,
    LogoutAPIView, GetUserProfileAPIView, UpdateUserProfileAPIView,  GetCompanyNameAPIView
)
urlpatterns = [
    # Authentication and User Management
    path("register/", RegisterUserAPIView.as_view(), name="register_user"),
    path("verify-email/", VerifyEmailAPIView.as_view(), name="verify_email"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('profile/<str:userType>/<str:email>/', GetUserProfileAPIView.as_view(), name='get_user_profile'),
    path('profile/<str:userType>/<str:email>/update/', UpdateUserProfileAPIView.as_view(), name='update_user_profile'),
    
    path('get_company_name/<str:email>/', GetCompanyNameAPIView.as_view(), name='get_company_name'),
]
