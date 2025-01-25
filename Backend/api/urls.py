from django.urls import path
from .views import login_view, signup_view, verify_email

urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('verify-email/', verify_email, name='verify_email'),
]