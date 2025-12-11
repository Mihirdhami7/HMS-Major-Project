from django.urls import path
from .views import (
    # get_hospital_departments, get_department_doctors,
    # get_department_patients, add_department, update_department, delete_department
    HospitalListCreateView,
    HospitalUpdateView,
    HospitalDestroyView,
    DepartmentListCreateView,
    DepartmentUpdateView,
    DepartmentDestroyView,
)
urlpatterns = [
    # Hospital URLs
    path('', HospitalListCreateView.as_view(), name='hospital_list_create'),
    path('<str:hospital_id>/', HospitalUpdateView.as_view(), name='hospital_update'),
    path('<str:hospital_id>/delete/', HospitalDestroyView.as_view(), name='hospital_destroy'),

    # Department URLs
    path('<str:hospital_id>/departments/', DepartmentListCreateView.as_view(), name='department_list_create'),
    path('<str:hospital_id>/departments/<str:department_id>/', DepartmentUpdateView.as_view(), name='department_update'),
    path('<str:hospital_id>/departments/<str:department_id>/delete/', DepartmentDestroyView.as_view(), name='department_destroy'),

    # # Hospital views - fixed to include hospital_id parameter
    # path('get_hospital/', get_hospitals, name='get_hospital'),
    # path('add_hospital/', add_hospital, name='add_hospital'),
    # path('update_hospital/<str:hospital_id>/', update_hospital, name='update_hospital'),
    # path('delete_hospital/<str:hospital_id>/', delete_hospital, name='delete_hospital'),

    # # Department views
    # path('get_hospital_departments/<str:hospital_name>/', get_hospital_departments, name='get_hospital_departments'),
    
    # path('get_hospital_doctors/<str:departmentId>/<str:hospital_name>/', get_department_doctors, name='get_department_doctors'),
    # path('get_department_patients/<str:department_name>/', get_department_patients, name='get_department_patients'),
    # path('add_department/', add_department, name='add_department'),
    # path('update_department/<str:department_id>/', update_department, name='update_department'),
    # path('delete_department/<str:department_id>/', delete_department, name='delete_department'),

]
