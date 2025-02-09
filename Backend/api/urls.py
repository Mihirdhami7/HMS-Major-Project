from django.urls import path
from .views import register_user, login_user, get_all_users

urlpatterns = [
    path('register/', register_user, name='register_user'),
    path('login/', login_user, name='login_user'),
    path('users/', get_all_users, name='get_all_users'),
]