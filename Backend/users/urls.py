from django.urls import path
from .views import (
    register_user, login_view, get_user_profile, update_user_profile, verify_email, logout_view,
    #doctor views
    get_doctors_by_hospital,get_doctors_by_department, get_doctor_details, update_doctor, delete_doctor, add_doctor,
    #patient views
    get_patient, add_patient, search_patient, update_patient, delete_patient,
    #appointment views
    get_appointments, book_appointment, approve_appointment,  get_pending_appointments,
    #hospital views
    get_hospitals, add_hospital, update_hospital, delete_hospital,
    #department views
    get_departments, add_department, update_department, delete_department,
    #product views
    get_products, add_product, update_product, delete_product,
    #stock views
    request_restock, check_stock_levels, supplier_get_products, add_stock,

)

urlpatterns = [
    path("register/", register_user, name="register_user"),
    path("verify-email/", verify_email, name="verify_email"),
    path("login/", login_view, name="login"),
    path('logout/', logout_view, name='logout'),
    path('profile/<str:user_type>/<str:email>/', get_user_profile, name='get_user_profile'),
    path('profile/update/', update_user_profile, name='update_user_profile'),

   
    #doctor views
    path('doctor_by_hospital/', get_doctors_by_hospital, name='doctor_by_hospital'),
    path('doctor_by_department/', get_doctors_by_department, name='doctor_by_department'),
    path('doctordetails', get_doctor_details, name='get_doctor_details'),
    path('update_doctor', update_doctor, name='update_doctor'),
    path('delete_doctor', delete_doctor, name='delete_doctor'),
    path('add_doctor', add_doctor, name='add_doctor'),

    #patient views
    path('get_patient', get_patient, name='get_patient'),
    path('add_patient', add_patient, name='add_patient'),
    path('search_patient', search_patient, name='search_patient'),
    path('update_patient', update_patient, name='update_patient'),
    path('delete_patient', delete_patient, name='delete_patient'),

    #appointment views
    path('get_appointment', get_appointments, name='get_appointment'),
    path('book_appointment', book_appointment, name='book_appointment'),
    path('approve_appointment', approve_appointment, name='approve_appointment'),
    #path('cancel_appointment', cancel_appointment, name='cancel_appointment'),

    path('get_pending_appointment', get_pending_appointments, name='get_pending_appointment'),

    #hospital views
    path('get_hospital', get_hospitals, name='get_hospital'),
    path('add_hospital', add_hospital, name='add_hospital'),
    path('update_hospital', update_hospital, name='update_hospital'),
    path('delete_hospital', delete_hospital, name='delete_hospital'),

    #department views
    path('get_department', get_departments, name='get_department'),
    path('add_department', add_department, name='add_department'),
    path('update_department', update_department, name='update_department'),
    path('delete_department', delete_department, name='delete_department'),

    #product views
    path('getproduct', get_products, name='getproduct'),
    path('add_product', add_product, name='add_product'),
    path('update_product', update_product, name='update_product'),
    path('delete_product', delete_product, name='delete_product'),
    #path('search_product', search_product, name='search_product'),
    
    #stock views
    path('restock', request_restock, name='restock'),
    path('checkStock', check_stock_levels, name='checkStock'),
    path('get_stock', supplier_get_products, name='get_stock'),
    path('add_stock', add_stock, name='add_stock'),
    # path('send_low_stock_notification', send_low_stock_notification, name='send_low_stock_notification'),

]