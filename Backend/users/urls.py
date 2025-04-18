from django.urls import path

# Authentication and User Management views
from users.userManageView import (
    register_user, verify_email, login_view, check_session, logout_view,
    get_user_profile, update_profile
)

# Doctor related views
from users.doctorView import (
    get_doctors_by_hospital, get_doctor_details, 
    update_doctor, delete_doctor, add_doctor
)

# Patient related views
from users.patientView import (
    get_patient, add_patient, search_patient, 
    update_patient, delete_patient, get_patient_by_email
)

# Appointment related views
from users.appointmentView import (
    get_appointments, book_appointment, approve_appointment, 
    get_pending_appointments, search_appointment, create_appointment, 
    get_doctor_appointments, save_prescription, get_hospital_medicines, get_prescriptions,
    generate_invoice
)

# Hospital and Department management
from users.multiHospitalView import (
    get_hospitals, add_hospital, update_hospital, delete_hospital
)
from users.MultiDepartmentView import (
    get_hospital_departments, get_department_doctors,
    get_department_patients, add_department, update_department, delete_department
)
from users.orderManageView import get_products
# Pharmacy and inventory management
# from users.orderManageView import (
#     # get_products, add_product, update_product, delete_product,
#     # request_restock, check_stock_levels, supplier_get_products, add_stock
# )I

urlpatterns = [
    # Authentication and User Management
    path("register/", register_user, name="register_user"),
    path("verify-email/", verify_email, name="verify_email"),
    path("login/", login_view, name="login"),
    path('check_session/', check_session, name='check_session'),
    path('logout/', logout_view, name='logout'),
    path('profile/<str:user_type>/<str:email>/', get_user_profile, name='get_user_profile'),
    
    # Remove this line if update_user_profile is not implemented
    path('update_profile/<str:userType>/<str:emailToUse>/', update_profile, name='update_user_profile'),
    # Doctor related routes - fixed to include doctor_id parameter
    path('doctor_by_hospital/<str:hospital_id>/', get_doctors_by_hospital, name='doctor_by_hospital'),
    path('get_doctor_details/', get_doctor_details, name='get_doctor_details'),
    path("add_doctor/", add_doctor, name="add_doctor"),
    path('update_doctor/<str:doctor_id>/', update_doctor, name='update_doctor'),
    
    path('delete_doctor/<str:doctorId>/', delete_doctor, name='delete_doctor'),

    # Patient views - fixed to include patient_id parameter
    path('get_patient/<str:patient_id>/', get_patient, name='get_patient'),
    path('add_patient/', add_patient, name='add_patient'),
    path('search_patient/', search_patient, name='search_patient'),
    path('update_patient/<str:patient_id>/', update_patient, name='update_patient'),
    
    path('delete_patient/<str:patient_id>/', delete_patient, name='delete_patient'),
    path('get-patient-by-email/', get_patient_by_email, name='get_patient_by_email'),

    # Appointment views
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

    path('generate-invoice/', generate_invoice, name='generate_invoice'),
    
    # Hospital views - fixed to include hospital_id parameter
    path('get_hospital/', get_hospitals, name='get_hospital'),
    path('add_hospital/', add_hospital, name='add_hospital'),
    path('update_hospital/<str:hospital_id>/', update_hospital, name='update_hospital'),
    path('delete_hospital/<str:hospital_id>/', delete_hospital, name='delete_hospital'),

    # Department views
    path('get_hospital_departments/<str:hospital_name>/', get_hospital_departments, name='get_hospital_departments'),

    path('get_hospital_doctors/<str:departmentId>/<str:hospital_name>/', get_department_doctors, name='get_department_doctors'),
    path('get_department_patients/<str:department_name>/', get_department_patients, name='get_department_patients'),
    path('add_department/', add_department, name='add_department'),
    path('update_department/<str:department_id>/', update_department, name='update_department'),
    path('delete_department/<str:department_id>/', delete_department, name='delete_department'),

    # # Product/Pharmacy views
    # path('get_product/', get_products, name='getproduct'),
    # path('add_product/', add_product, name='add_product'),
    # path('update_product/<str:product_id>/', update_product, name='update_product'),
    # path('delete_product/<str:product_id>/', delete_product, name='delete_product'),
    path('get_products/<str:hospital_name>/', get_products, name='get_products'),
    # # Stock views
    # path('restock/', request_restock, name='restock'),
    # path('checkStock/', check_stock_levels, name='checkStock'),
    # path('get_stock/', supplier_get_products, name='get_stock'),
    # path('add_stock/', add_stock, name='add_stock'),

    # Payment views
    # path('create_order/', create_order, name='create_order'),
    # path("verify_payment/", verify_payment, name="verify_payment"),
]