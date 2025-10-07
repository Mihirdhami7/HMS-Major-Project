from django.urls import path

# Authentication and User Management views
from .views import (
    register_user, verify_email, login_view, check_session, logout_view,
    get_user_profile, update_profile, get_company_name
)
urlpatterns = [
    # Authentication and User Management
    path("register/", register_user, name="register_user"),
    path("verify-email/", verify_email, name="verify_email"),
    path("login/", login_view, name="login"),
    path('check_session/', check_session, name='check_session'),
    path('logout/', logout_view, name='logout'),
    path('profile/<str:user_type>/<str:email>/', get_user_profile, name='get_user_profile'),
    
    path('get_company_name/<str:email>/', get_company_name, name='get_company_name'),
    path('profile/update_profile/<str:userType>/<str:emailToUse>/', update_profile, name='update_user_profile')
]
