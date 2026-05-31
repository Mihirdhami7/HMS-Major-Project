import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/accounts';

/**
 * Get current user profile
 * GET /api/accounts/profile/me/
 */
export const getUserProfile = async (token) => {
    try {
        const response = await axios.get(
            `${API_BASE}/profile/me/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.user || response.data
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Update user profile
 * PATCH /api/accounts/profile/me/update/
 */
export const updateUserProfile = async (token, formData) => {
    try {
        const response = await axios.patch(
            `${API_BASE}/profile/me/update/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.user || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Get company name for supplier
 * GET /api/accounts/get_company_name/<email>/
 */
export const getSupplierCompanyName = async (email, token) => {
    try {
        const response = await axios.get(
            `${API_BASE}/get_company_name/${email}/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            companyName: response.data.companyName
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

// ═══════════════════════════════════════════════════════════
// DOCTOR-SPECIFIC FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get doctor's appointments
 * GET /api/appointments/my/
 */
export const getDoctorAppointments = async (token) => {
    try {
        const response = await axios.get(
            'http://127.0.0.1:8000/api/appointments/my/',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.appointments || [],
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status,
            data: []
        };
    }
};

/**
 * Get hospital medicines
 * GET /api/appointments/get-hospital-medicines/<hospital_name>/
 */
export const getHospitalMedicines = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            `http://127.0.0.1:8000/api/appointments/get-hospital-medicines/${hospitalName}/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.medicines || [],
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status,
            data: []
        };
    }
};

/**
 * Get hospital products
 * GET /api/orders/products/?hospitalName=Zydus
 */
export const getHospitalProducts = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            `http://127.0.0.1:8000/api/orders/products/?hospitalName=${hospitalName}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.products || [],
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status,
            data: []
        };
    }
};

/**
 * Save prescription
 * POST /api/appointments/save-prescription/
 */
export const savePrescription = async (prescriptionData, token) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/api/appointments/save-prescription/',
            prescriptionData,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.data.message || 'Prescription saved successfully'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Get patient details by email
 * POST /api/users/get-patient-by-email/
 */
export const getPatientByEmail = async (email, token) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/api/users/get-patient-by-email/',
            { email },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.patient || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

// ===== ADMIN API FUNCTIONS =====

/**
 * Get approved doctors for a hospital
 * GET /api/users/doctors/<hospital_name>/
 */
export const getHospitalDepartments = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            `http://127.0.0.1:8000/api/users/doctors/${hospitalName}/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.doctors || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Get pending doctors awaiting approval
 * GET /api/users/doctors/<hospital_name>/pending/
 */
export const getPendingDoctors = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            `http://127.0.0.1:8000/api/users/doctors/${hospitalName}/pending/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.pending_doctors || response.data.doctors || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Approve doctor
 * POST /api/users/doctors/approve/
 */
export const approveDoctor = async (doctorData, token) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/api/users/doctors/approve/',
            doctorData,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.data.message || 'Doctor approved successfully'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Reject doctor
 * POST /api/users/doctors/reject/
 */
export const rejectDoctor = async (doctorData, token) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/api/users/doctors/reject/',
            doctorData,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.data.message || 'Doctor rejected'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Get hospital orders
 * GET /api/orders/orders/
 */
export const getHospitalStockRequests = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            'http://127.0.0.1:8000/api/orders/orders/',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.orders || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Get hospital prescriptions
 * GET /api/appointments/prescriptions/all/
 */
export const getHospitalPrescriptions = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            'http://127.0.0.1:8000/api/appointments/prescriptions/all/',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.prescriptions || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Create new patient
 * POST /api/users/add_patient/
 */
export const createPatient = async (patientData, token) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/api/users/add_patient/',
            { ...patientData, userType: 'Patient' },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.data.message || 'Patient created successfully'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Get hospital pending appointments
 * GET /api/appointments/pending/
 */
export const getHospitalAppointments = async (hospitalName, token) => {
    try {
        const response = await axios.get(
            'http://127.0.0.1:8000/api/appointments/pending/',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data.appointments || response.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Approve appointment
 * PATCH /api/appointments/approve/<appointment_id>/
 */
export const approveAppointment = async (appointmentId, token) => {
    try {
        const response = await axios.patch(
            `http://127.0.0.1:8000/api/appointments/approve/${appointmentId}/`,
            { action: 'approve' },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.data.message || 'Appointment approved'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};

/**
 * Reject appointment
 * PATCH /api/appointments/approve/<appointment_id>/
 */
export const rejectAppointment = async (appointmentId, token) => {
    try {
        const response = await axios.patch(
            `http://127.0.0.1:8000/api/appointments/approve/${appointmentId}/`,
            { action: 'reject' },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.data.message || 'Appointment rejected'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
};
