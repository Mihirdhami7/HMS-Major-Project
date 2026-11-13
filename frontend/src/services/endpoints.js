/**
 * API Endpoints
 * All backend route constants organized by domain.
 * Base URL is read from the environment variable VITE_API_BASE_URL.
 * Falls back to localhost for local development.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

// ─────────────────────────────────────────────────────────────
// ACCOUNTS  →  /api/accounts/
// ─────────────────────────────────────────────────────────────
export const ACCOUNTS = {
    REGISTER:        `${API_BASE}/accounts/register/`,
    VERIFY_EMAIL:    `${API_BASE}/accounts/verify-email/`,
    LOGIN:           `${API_BASE}/accounts/login/`,
    LOGOUT:          `${API_BASE}/accounts/logout/`,
    VERIFY:          `${API_BASE}/accounts/verify/`,
    PROFILE_ME:      `${API_BASE}/accounts/profile/me/`,
    PROFILE_UPDATE:  `${API_BASE}/accounts/profile/me/update/`,
    PASSWORD_RESET_REQUEST: `${API_BASE}/accounts/password-reset/request/`,
    PASSWORD_RESET_CONFIRM: `${API_BASE}/accounts/password-reset/confirm/`,
    /** @param {string} email */
    COMPANY_NAME:    (email) => `${API_BASE}/accounts/get_company_name/${email}/`,
};

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS  →  /api/appointments/
// ─────────────────────────────────────────────────────────────
export const APPOINTMENTS = {
    BOOK:                   `${API_BASE}/appointments/book/`,
    /** @param {string} appointmentId */
    APPROVE:                (appointmentId) => `${API_BASE}/appointments/approve/${appointmentId}/`,
    MY:                     `${API_BASE}/appointments/my/`,
    PENDING:                `${API_BASE}/appointments/pending/`,
    ALL:                    `${API_BASE}/appointments/all/`,
    SAVE_PRESCRIPTION:      `${API_BASE}/appointments/save-prescription/`,
    PRESCRIPTIONS_PENDING:  `${API_BASE}/appointments/prescriptions/pending/`,
    PRESCRIPTIONS_MY:       `${API_BASE}/appointments/prescriptions/my/`,
    PRESCRIPTIONS_ALL:      `${API_BASE}/appointments/prescriptions/all/`,
    /** @param {string} prescriptionId */
    PRESCRIPTION_PDF:       (prescriptionId) => `${API_BASE}/appointments/prescriptions/${prescriptionId}/pdf/`,
    /** @param {string} prescriptionId */
    PRESCRIPTION_EMAIL:     (prescriptionId) => `${API_BASE}/appointments/prescriptions/${prescriptionId}/email/`,
    /** @param {string} hospitalName */
    HOSPITAL_MEDICINES:     (hospitalName) => `${API_BASE}/appointments/get-hospital-medicines/${hospitalName}/`,
    HOSPITAL_MEDICINES_SELF:`${API_BASE}/appointments/get-hospital-medicines/`,
};

// ─────────────────────────────────────────────────────────────
// HOSPITALS  →  /api/hospitals/
// ─────────────────────────────────────────────────────────────
export const HOSPITALS = {
    LIST_CREATE:    `${API_BASE}/hospitals/`,
    /** @param {string} hospitalId */
    UPDATE:         (hospitalId) => `${API_BASE}/hospitals/${hospitalId}/update/`,
    /** @param {string} hospitalId */
    DELETE:         (hospitalId) => `${API_BASE}/hospitals/${hospitalId}/`,
    /** @param {string} hospitalId */
    DEPARTMENTS:    (hospitalId) => `${API_BASE}/hospitals/${hospitalId}/departments/`,
    /** @param {string} hospitalId @param {string} departmentId */
    DEPARTMENT_UPDATE: (hospitalId, departmentId) => `${API_BASE}/hospitals/${hospitalId}/departments/${departmentId}/update/`,
    /** @param {string} hospitalId @param {string} departmentId */
    DEPARTMENT_DELETE: (hospitalId, departmentId) => `${API_BASE}/hospitals/${hospitalId}/departments/${departmentId}/`,
};

// ─────────────────────────────────────────────────────────────
// ORDERS  →  /api/orders/
// ─────────────────────────────────────────────────────────────
export const ORDERS = {
    PRODUCTS:               `${API_BASE}/orders/products/`,
    PRODUCT_CREATE:         `${API_BASE}/orders/products/create/`,
    PRODUCTS_UNAPPROVED:    `${API_BASE}/orders/products/unapproved/`,
    /** @param {string} productId */
    PRODUCT_APPROVE:        (productId) => `${API_BASE}/orders/products/approve/${productId}/`,
    ORDERS_LIST:            `${API_BASE}/orders/orders/`,
    ORDER_CREATE:           `${API_BASE}/orders/orders/create/`,
    /** @param {string} orderId */
    ORDER_FULFILL:          (orderId) => `${API_BASE}/orders/orders/fulfill/${orderId}/`,
    /** @param {string} orderId */
    ORDER_COMPLETE:         (orderId) => `${API_BASE}/orders/orders/complete/${orderId}/`,
    SUPPLIER_PRODUCTS:      `${API_BASE}/orders/supplier-products/`,
    SUPPLIER_ORDERS:        `${API_BASE}/orders/supplier-orders/`,
    MEDICINE_REQUESTS:      `${API_BASE}/orders/medicine-requests/`,
    /** @param {string} requestId */
    MEDICINE_REQUEST:       (requestId) => `${API_BASE}/orders/medicine-requests/${requestId}/`,
};

// ─────────────────────────────────────────────────────────────
// PAYMENTS  →  /api/payments/
// ─────────────────────────────────────────────────────────────
export const PAYMENTS = {
    RAZORPAY_ORDER:  `${API_BASE}/payments/razorpay/order/`,
    RAZORPAY_VERIFY: `${API_BASE}/payments/razorpay/verify/`,
    INVOICES:        `${API_BASE}/payments/invoices/`,
    INVOICE_CASH:    `${API_BASE}/payments/invoices/cash/`,
};

// ─────────────────────────────────────────────────────────────
// USERS  →  /api/users/
// ─────────────────────────────────────────────────────────────
export const USERS = {
    // Doctors
    DOCTOR_SEARCH:          `${API_BASE}/users/doctors/search/`,
    DOCTOR_APPROVE:         `${API_BASE}/users/doctors/approve/`,
    DOCTOR_REJECT:          `${API_BASE}/users/doctors/reject/`,
    /** @param {string} hospitalName */
    DOCTOR_LIST:            (hospitalName) => `${API_BASE}/users/doctors/${hospitalName}/`,
    /** @param {string} hospitalName */
    DOCTOR_PENDING:         (hospitalName) => `${API_BASE}/users/doctors/${hospitalName}/pending/`,
    /** @param {string} hospitalName @param {string} departmentName */
    DOCTOR_BY_DEPARTMENT:   (hospitalName, departmentName) => `${API_BASE}/users/doctors/${hospitalName}/department/${departmentName}/`,
    /** @param {string} doctorId */
    DOCTOR_DETAIL:          (doctorId) => `${API_BASE}/users/doctors/id/${doctorId}/`,
    /** @param {string} doctorId */
    DOCTOR_ROLE:            (doctorId) => `${API_BASE}/users/doctors/${doctorId}/role/`,

    // Patients
    PATIENT_SEARCH:         `${API_BASE}/users/patients/search/`,
    /** @param {string} hospitalName */
    PATIENT_LIST:           (hospitalName) => `${API_BASE}/users/patients/${hospitalName}/`,
    /** @param {string} hospitalName @param {string} departmentName */
    PATIENT_BY_DEPARTMENT:  (hospitalName, departmentName) => `${API_BASE}/users/patients/${hospitalName}/department/${departmentName}/`,
    /** @param {string} patientId */
    PATIENT_DETAIL:         (patientId) => `${API_BASE}/users/patients/id/${patientId}/`,
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS  →  /api/notifications/
// ─────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
    LIST:      `${API_BASE}/notifications/`,
    MARK_READ: `${API_BASE}/notifications/read/`,
};

// ─────────────────────────────────────────────────────────────
// DISEASES (health info catalogue)  →  /api/diseases/
// ─────────────────────────────────────────────────────────────
export const DISEASES = {
    LIST_CREATE: `${API_BASE}/diseases/`,
    /** @param {string} diseaseId */
    DETAIL:      (diseaseId) => `${API_BASE}/diseases/${diseaseId}/`,
};
