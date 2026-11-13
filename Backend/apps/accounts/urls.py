from django.urls import path

# Authentication and User Management views
from .views import (
    RegisterUserAPIView, VerifyEmailAPIView, LoginAPIView,
    LogoutAPIView, VerifyUserAPIView, GetUserProfileAPIView, UpdateUserProfileAPIView,  GetCompanyNameAPIView,
    PasswordResetRequestAPIView, PasswordResetConfirmAPIView,
)
urlpatterns = [
    # Authentication and User Management
    path("register/", RegisterUserAPIView.as_view(), name="register_user"),
    path("verify-email/", VerifyEmailAPIView.as_view(), name="verify_email"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('verify/', VerifyUserAPIView.as_view(), name='verify_user'),
    path('profile/me/', GetUserProfileAPIView.as_view(), name='get_user_profile'),
    path('profile/me/update/', UpdateUserProfileAPIView.as_view(), name='update_user_profile'),
    
    path('password-reset/request/', PasswordResetRequestAPIView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmAPIView.as_view(), name='password_reset_confirm'),

    path('get_company_name/<str:email>/', GetCompanyNameAPIView.as_view(), name='get_company_name'),
]
