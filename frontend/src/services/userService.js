/**
 * userService.js
 * All doctor and patient management API calls.
 *
 * Routes used (DOCTORS):
 *   GET    /api/users/doctors/search/?email=&hospitalName=         Doctor | Admin
 *   POST   /api/users/doctors/approve/                             SuperAdmin | Admin (own)
 *   POST   /api/users/doctors/reject/                              SuperAdmin | Admin (own)
 *   GET    /api/users/doctors/<hospitalName>/                      Public (approved) | Admin (all)
 *   GET    /api/users/doctors/<hospitalName>/pending/              SuperAdmin | Admin (own)
 *   GET    /api/users/doctors/<hospitalName>/department/<dept>/    Public (approved) | Admin (all)
 *   GET    /api/users/doctors/<doctorId>/                          SuperAdmin | Admin (own)
 *   PUT    /api/users/doctors/<doctorId>/                          SuperAdmin | Admin (own)
 *   DELETE /api/users/doctors/<doctorId>/                          SuperAdmin | Admin (own)
 *   PUT    /api/users/doctors/<doctorId>/role/                     SuperAdmin | Admin (own)
 *
 * Routes used (PATIENTS):
 *   GET    /api/users/patients/search/?email=&hospitalName=        Doctor | Admin
 *   GET    /api/users/patients/<hospitalName>/                     SuperAdmin | Admin (own)
 *   POST   /api/users/patients/<hospitalName>/                     SuperAdmin | Admin (own)
 *   GET    /api/users/patients/<hospitalName>/department/<dept>/   SuperAdmin | Admin (own)
 *   GET    /api/users/patients/<patientId>/                        Doctor | Admin
 *   PUT    /api/users/patients/<patientId>/                        Doctor | Admin
 *   DELETE /api/users/patients/<patientId>/                        SuperAdmin | Admin (own)
 */

import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { USERS } from "./endpoints";

// ─────────────────────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────────────────────

/**
 * Search for a doctor by email (and optionally hospital).
 * Accessible by: Doctor, Admin.
 * @param {string} token
 * @param {string} email
 * @param {string} [hospitalName]
 */
export const searchDoctor = (token, email, hospitalName) =>
    handleRequest(() =>
        apiClient.get(USERS.DOCTOR_SEARCH, {
            headers: authHeaders(token),
            params: { email, ...(hospitalName && { hospitalName }) },
        })
    );

/**
 * List doctors for a hospital.
 * Public access returns approved doctors only.
 * Admin access returns all doctors.
 * @param {string} token
 * @param {string} hospitalName
 */
export const listDoctors = (token, hospitalName) =>
    handleRequest(() =>
        apiClient.get(USERS.DOCTOR_LIST(hospitalName), {
            headers: authHeaders(token),
        })
    );

/**
 * List doctors awaiting approval for a hospital.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalName
 */
export const listPendingDoctors = (token, hospitalName) =>
    handleRequest(() =>
        apiClient.get(USERS.DOCTOR_PENDING(hospitalName), {
            headers: authHeaders(token),
        })
    );

/**
 * List doctors in a specific department.
 * Public access returns approved doctors only.
 * Admin access returns all doctors.
 * @param {string} token
 * @param {string} hospitalName
 * @param {string} departmentName
 */
export const listDoctorsByDepartment = (token, hospitalName, departmentName) =>
    handleRequest(() =>
        apiClient.get(USERS.DOCTOR_BY_DEPARTMENT(hospitalName, departmentName), {
            headers: authHeaders(token),
        })
    );

/**
 * Get a single doctor's details by ID.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} doctorId
 */
export const getDoctorDetail = (token, doctorId) =>
    handleRequest(() =>
        apiClient.get(USERS.DOCTOR_DETAIL(doctorId), {
            headers: authHeaders(token),
        })
    );

/**
 * Update a doctor's details.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} doctorId
 * @param {object} data
 */
export const updateDoctor = (token, doctorId, data) =>
    handleRequest(() =>
        apiClient.put(USERS.DOCTOR_DETAIL(doctorId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Delete a doctor.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} doctorId
 */
export const deleteDoctor = (token, doctorId) =>
    handleRequest(() =>
        apiClient.delete(USERS.DOCTOR_DETAIL(doctorId), {
            headers: authHeaders(token),
        })
    );

/**
 * Assign roles to a doctor (e.g. "Department Head").
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} doctorId
 * @param {string[]} roles
 */
export const assignDoctorRoles = (token, doctorId, roles) =>
    handleRequest(() =>
        apiClient.put(USERS.DOCTOR_ROLE(doctorId), { roles }, {
            headers: authHeaders(token),
        })
    );

/**
 * Approve a pending doctor and create their staff record.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {{ email: string, hospitalName: string, department?: string, experience?: number }} data
 */
export const approveDoctor = (token, data) =>
    handleRequest(() =>
        apiClient.post(USERS.DOCTOR_APPROVE, data, {
            headers: authHeaders(token),
        })
    );

/**
 * Reject and remove a pending doctor application.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {{ email: string, hospitalName: string }} data
 */
export const rejectDoctor = (token, data) =>
    handleRequest(() =>
        apiClient.post(USERS.DOCTOR_REJECT, data, {
            headers: authHeaders(token),
        })
    );

// ─────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────

/**
 * Search for a patient by email (and optionally hospital).
 * Accessible by: Doctor, Admin.
 * @param {string} token
 * @param {string} email
 * @param {string} [hospitalName]
 */
export const searchPatient = (token, email, hospitalName) =>
    handleRequest(() =>
        apiClient.get(USERS.PATIENT_SEARCH, {
            headers: authHeaders(token),
            params: { email, ...(hospitalName && { hospitalName }) },
        })
    );

/**
 * List all patients for a hospital.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalName
 */
export const listPatients = (token, hospitalName) =>
    handleRequest(() =>
        apiClient.get(USERS.PATIENT_LIST(hospitalName), {
            headers: authHeaders(token),
        })
    );

/**
 * Create a new patient directly (admin-side registration, no OTP).
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalName
 * @param {{ email, name, contactNo, gender, dateOfBirth }} data
 */
export const createPatient = (token, hospitalName, data) =>
    handleRequest(() =>
        apiClient.post(USERS.PATIENT_LIST(hospitalName), data, {
            headers: authHeaders(token),
        })
    );

/**
 * List patients in a specific department.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalName
 * @param {string} departmentName
 */
export const listPatientsByDepartment = (token, hospitalName, departmentName) =>
    handleRequest(() =>
        apiClient.get(USERS.PATIENT_BY_DEPARTMENT(hospitalName, departmentName), {
            headers: authHeaders(token),
        })
    );

/**
 * Get a single patient's details by ID.
 * Accessible by: Doctor, Admin.
 * @param {string} token
 * @param {string} patientId
 */
export const getPatientDetail = (token, patientId) =>
    handleRequest(() =>
        apiClient.get(USERS.PATIENT_DETAIL(patientId), {
            headers: authHeaders(token),
        })
    );

/**
 * Update a patient's details.
 * Accessible by: Doctor, Admin.
 * @param {string} token
 * @param {string} patientId
 * @param {object} data
 */
export const updatePatient = (token, patientId, data) =>
    handleRequest(() =>
        apiClient.put(USERS.PATIENT_DETAIL(patientId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Delete a patient.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} patientId
 */
export const deletePatient = (token, patientId) =>
    handleRequest(() =>
        apiClient.delete(USERS.PATIENT_DETAIL(patientId), {
            headers: authHeaders(token),
        })
    );
