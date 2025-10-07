from django.urls import path
# Appointment related views
from .views import (
    get_appointments, book_appointment, approve_appointment, 
    get_pending_appointments, search_appointment, create_appointment, 
    get_doctor_appointments, save_prescription, get_hospital_medicines, get_prescriptions,
    generate_invoice
)

urlpatterns = [
    path('get_appointment/<str:user_id>/', get_appointments, name='get_appointment'),
  
    path('book_appointment/', book_appointment, name='book_appointment'),
  
    path('approve-appointment/', approve_appointment, name='approve_appointment'),
    path('search_appointment/', search_appointment, name='search_appointment'),     
    path('create-appointment/', create_appointment, name='create_appointment'),
    path('get_doctor_appointments/', get_doctor_appointments, name='get_doctor_appointments'),
    path('get_pending_appointment/', get_pending_appointments, name='get_pending_appointment'),
    path('get-hospital-medicines/', get_hospital_medicines, name='get_hospital_medicines'),
    path('save-prescription/', save_prescription, name='save_prescription'),
    path('get_prescriptions/', get_prescriptions,  name='get_prescriptions'),

    path('generate_invoice/', generate_invoice, name='generate_invoice'),
]