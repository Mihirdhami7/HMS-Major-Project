from django.urls import path
from .views import register_user, login_view, get_user_profile, update_user_profile, verify_email, get_doctors

urlpatterns = [
    path("register/", register_user, name="register_user"),
    path("verify-email/", verify_email, name="verify_email"),
    path("login/", login_view, name="login"),
    path('profile/<str:user_type>/<str:email>/', get_user_profile, name='get_user_profile'),
    path('profile/update/', update_user_profile, name='update_user_profile'),
    path('doctors/', get_doctors, name='get_doctors'),
]