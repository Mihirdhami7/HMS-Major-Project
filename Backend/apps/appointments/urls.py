from django.urls import path
# Appointment related views
from .views import (
    BookAppointmentAPIView,
    ApproveAppointmentAPIView,
    GetMyAppointmentsAPIView,
    GetPendingAppointmentsAPIView,
    GetAllAppointmentsAPIView,
    GetHospitalMedicinesAPIView,
    CreatePrescriptionAPIView,
    GetAllPrescriptionsAPIView,
    GetMyPrescriptionsAPIView,
    GetPendingPrescriptionsAPIView,
    #CreateINVOICEAPIView,
    )

urlpatterns = [
    path('book/', BookAppointmentAPIView.as_view(), name='book_appointment'),
    path('approve/', ApproveAppointmentAPIView.as_view(), name='approve_appointment'),
    path('my/', GetMyAppointmentsAPIView.as_view(), name='get_doctor_appointments'),
    path('pending/', GetPendingAppointmentsAPIView.as_view(), name='get_pending_appointments'),
    path('all/', GetAllAppointmentsAPIView.as_view() , name='get_all_appointments'),     
    path('save-prescription/', CreatePrescriptionAPIView.as_view(), name='save_prescription'),
    path('prescriptions/pending/', GetPendingPrescriptionsAPIView.as_view(),  name='get_pending_prescriptions'),
    path('prescriptions/my/', GetMyPrescriptionsAPIView.as_view(),  name='get_my_prescriptions'),
    path('prescriptions/all/', GetAllPrescriptionsAPIView.as_view(),  name='get_all_prescriptions'),
    
    path('get-hospital-medicines/', GetHospitalMedicinesAPIView.as_view(), name='get_hospital_medicines'),


    # path('generate_invoice/', GenerateInvoiceAPIView.as_view(), name='generate_invoice'),
]