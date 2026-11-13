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
    PrescriptionPdfView,
    PrescriptionEmailView,
    #CreateINVOICEAPIView,
    )

urlpatterns = [
    path('book/', BookAppointmentAPIView.as_view(), name='book_appointment'),
    path('approve/<str:appointment_id>/', ApproveAppointmentAPIView.as_view(), name='approve_appointment'),
    path('my/', GetMyAppointmentsAPIView.as_view(), name='get_doctor_appointments'),
    path('pending/', GetPendingAppointmentsAPIView.as_view(), name='get_pending_appointments'),
    path('all/', GetAllAppointmentsAPIView.as_view() , name='get_all_appointments'),     
    path('save-prescription/', CreatePrescriptionAPIView.as_view(), name='save_prescription'),
    path('prescriptions/pending/', GetPendingPrescriptionsAPIView.as_view(),  name='get_pending_prescriptions'),
    path('prescriptions/my/', GetMyPrescriptionsAPIView.as_view(),  name='get_my_prescriptions'),
    path('prescriptions/all/', GetAllPrescriptionsAPIView.as_view(),  name='get_all_prescriptions'),
    path('prescriptions/<str:prescription_id>/pdf/', PrescriptionPdfView.as_view(), name='prescription_pdf'),
    path('prescriptions/<str:prescription_id>/email/', PrescriptionEmailView.as_view(), name='prescription_email'),
    
    path('get-hospital-medicines/<str:hospital_name>/', GetHospitalMedicinesAPIView.as_view(), name='get_hospital_medicines'),
    path('get-hospital-medicines/', GetHospitalMedicinesAPIView.as_view(), name='get_hospital_medicines_self'),


    # path('generate_invoice/', GenerateInvoiceAPIView.as_view(), name='generate_invoice'),
]