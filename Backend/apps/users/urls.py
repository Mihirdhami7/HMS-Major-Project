from django.urls import path

# Import new DRF class-based views
from .views import (
    DoctorListAPIView, DoctorDetailAPIView, DoctorRoleAPIView, DoctorPendingListAPIView, 
    DoctorSearchAPIView, DoctorApproveAPIView, DoctorRejectAPIView, DoctorByDepartmentAPIView,
    PatientListAPIView, PatientDetailAPIView, PatientSearchAPIView, PatientByDepartmentAPIView
)

urlpatterns = [
    path('doctors/search/', DoctorSearchAPIView.as_view(), name='doctor-search'),       # GET ?email=&hospital=
    path('doctors/approve/', DoctorApproveAPIView.as_view(), name='doctor-approve'),    # POST approve pending doctor
    path('doctors/reject/', DoctorRejectAPIView.as_view(), name='doctor-reject'),       # POST reject pending doctor

    path('doctors/<str:hospital_name>/pending/', DoctorPendingListAPIView.as_view(), name='doctor-pending'),
    path('doctors/<str:hospital_name>/department/<str:department_name>/', DoctorByDepartmentAPIView.as_view(), name='doctor-by-department'),
    path('doctors/<str:hospital_name>/', DoctorListAPIView.as_view(), name='doctor-list-create'),   # GET list / POST create

    path('doctors/<str:doctor_id>/role/', DoctorRoleAPIView.as_view(), name='doctor-role'),      # PUT assign roles
    path('doctors/<str:doctor_id>/', DoctorDetailAPIView.as_view(), name='doctor-detail'),       # GET / PUT / DELETE

    path('patients/search/', PatientSearchAPIView.as_view(), name='patient-search'),    # GET ?email=&hospital=

    path('patients/<str:hospital_name>/department/<str:department_name>/', PatientByDepartmentAPIView.as_view(), name='patient-by-department'),
    path('patients/<str:hospital_name>/', PatientListAPIView.as_view(), name='patient-list-create'), # GET list / POST create

    path('patients/<str:patient_id>/', PatientDetailAPIView.as_view(), name='patient-detail'),   # GET / PUT / DELETE
]