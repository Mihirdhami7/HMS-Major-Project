from django.urls import path

# Authentication and User Management views
from users.userManageView import (
    register_user, verify_email, login_view, check_session, logout_view,
    get_user_profile, update_profile, get_company_name
)

# Doctor related views
from users.doctorView import (
    get_doctors_by_hospital, get_doctor_details, get_doctor_by_email,
    update_doctor, delete_doctor, add_doctor,
    get_pending_doctors, approve_doctor, reject_doctor
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
from users.orderManageView import (
    get_products, add_product, request_stock, get_new_products, approve_new_product,
    get_supplier_products, get_stocks_requests_by_hospital, get_stocks_requests_by_supplier, fulfill_request, complete_order
)
from users.paymentView import (
    create_payment, verify_payment, create_payment_products, verify_payment_products
)

#     # get_products, add_product, update_product, delete_product,
#     #  check_stock_levels, supplier_get_products, add_stock
# )I

urlpatterns = [
    # Authentication and User Management
    path("register/", register_user, name="register_user"),
    path("verify-email/", verify_email, name="verify_email"),
    path("login/", login_view, name="login"),
    path('check_session/', check_session, name='check_session'),
    path('logout/', logout_view, name='logout'),
    path('profile/<str:user_type>/<str:email>/', get_user_profile, name='get_user_profile'),
    
    path('get_company_name/<str:email>/', get_company_name, name='get_company_name'),
    path('profile/update_profile/<str:userType>/<str:emailToUse>/', update_profile, name='update_user_profile'),


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

    path('generate_invoice/', generate_invoice, name='generate_invoice'),
    
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

    # Doctor approval viewxs
    path('get_pending_doctors/<str:hospital_name>/', get_pending_doctors, name='get_pending_doctors'),
    path('approve_doctor/', approve_doctor, name='approve_doctor'),
    path('reject_doctor/', reject_doctor, name='reject_doctor'),

    # Order management views
    path('get_products/<str:hospital_name>/', get_products, name='get_products'),
    path('add_product/', add_product, name='add_product'),
    path('request_stock/', request_stock, name='request_stock'),
    path('get_new_products/<str:hospital_name>/', get_new_products, name='get_new_products'),
    path('approve_new_product/<str:product_id>/', approve_new_product, name='approve_new_product'),
    path('get_supplier_products/<str:companyName>/', get_supplier_products, name='get_supplier_products'),
    path('get_stock_request_by_supplier/<str:companyName>/', get_stocks_requests_by_supplier, name='get_stock_requests'),
    path('get_stocks_requests_by_hospital/<str:hospitalName>/', get_stocks_requests_by_hospital, name='get_stock_requests'),
    
    path('fulfill_request/', fulfill_request, name='fulfill_request'),
    path('complete_order/<str:order_id>/', complete_order, name='complete_order'),
    
    #Payment views
    path('create_payment/', create_payment, name='create_payment'),
    path('verify_payment/', verify_payment, name='verify_payment'),
    path('create_payment_products/', create_payment_products, name='create_payment_products'),
    path('verify_payment_products/', verify_payment_products, name='verify_payment_products'),


]