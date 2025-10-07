from django.urls import path

# Doctor related views
from .views import (
    get_doctors_by_hospital, get_doctor_details, get_doctor_by_email,
    update_doctor, delete_doctor, add_doctor,
    get_pending_doctors, approve_doctor, reject_doctor
)

# Patient related views
from .views import (
    get_patient, add_patient, search_patient, 
    update_patient, delete_patient, get_patient_by_email
)

urlpatterns = [
    # Doctor related routes - fixed to include doctor_id parameter
    path('doctor_by_hospital/<str:hospital_id>/', get_doctors_by_hospital, name='doctor_by_hospital'),
    path('get_doctor_details/', get_doctor_details, name='get_doctor_details'),
    path("add_doctor/", add_doctor, name="add_doctor"),
    path('update_doctor/<str:doctor_id>/', update_doctor, name='update_doctor'),
    path('get_doctor_by_email/', get_doctor_by_email, name='get_doctor_by_email'),
    path('delete_doctor/<str:doctorId>/', delete_doctor, name='delete_doctor'),

    # Patient views - fixed to include patient_id parameter
    path('get_patient/<str:patient_id>/', get_patient, name='get_patient'),
    path('add_patient/', add_patient, name='add_patient'),
    path('search_patient/', search_patient, name='search_patient'),
    path('update_patient/<str:patient_id>/', update_patient, name='update_patient'),
    
    path('delete_patient/<str:patient_id>/', delete_patient, name='delete_patient'),
    path('get-patient-by-email/', get_patient_by_email, name='get_patient_by_email'),

    
    # Doctor approval viewxs
    path('get_pending_doctors/<str:hospital_name>/', get_pending_doctors, name='get_pending_doctors'),
    path('approve_doctor/', approve_doctor, name='approve_doctor'),
    path('reject_doctor/', reject_doctor, name='reject_doctor'),

]