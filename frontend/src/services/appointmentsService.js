/**
 * appointmentsService.js
 * All appointment and prescription related API calls.
 *
 * Routes used:
 *   POST   /api/appointments/book/                              Patient | Admin
 *   PATCH  /api/appointments/approve/<appointmentId>/          Doctor  | Admin
 *   GET    /api/appointments/my/                               Patient | Doctor
 *   GET    /api/appointments/pending/                          Doctor  | Admin
 *   GET    /api/appointments/all/                              Admin
 *   POST   /api/appointments/save-prescription/               Doctor
 *   GET    /api/appointments/prescriptions/pending/            Admin
 *   GET    /api/appointments/prescriptions/my/                Patient | Doctor
 *   GET    /api/appointments/prescriptions/all/               Admin
 *   GET    /api/appointments/get-hospital-medicines/<name>/   Doctor  | Admin
 *   GET    /api/appointments/get-hospital-medicines/          Doctor  | Admin  (self — uses token hospital)
 */

import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { APPOINTMENTS } from "./endpoints";

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

/**
 * Book a new appointment.
 * Accessible by: Patient, Admin.
 * @param {string} token
 * @param {{ patientEmail, doctorEmail, hospitalName, department, appointmentDate, appointmentTime, symptoms? }} data
 */
export const bookAppointment = (token, data) =>
    handleRequest(() =>
        apiClient.post(APPOINTMENTS.BOOK, data, {
            headers: authHeaders(token),
        })
    );

/**
 * Approve or reject a pending appointment.
 * Accessible by: Doctor, Admin.
 * @param {string} token
 * @param {string} appointmentId
 * @param {{ action: "approve"|"reject", confirmedDate?: string, confirmedTime?: string, rejectionReason?: string }} data
 */
export const approveAppointment = (token, appointmentId, data) =>
    handleRequest(() =>
        apiClient.patch(APPOINTMENTS.APPROVE(appointmentId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Get appointments for the logged-in user (Patient or Doctor).
 * Accessible by: Patient, Doctor.
 * @param {string} token
 * @param {{ status?: "all"|"pending"|"approved"|"completed"|"rejected" }} [params={}]
 */
export const getMyAppointments = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.MY, {
            headers: authHeaders(token),
            params,
        })
    );

/**
 * Get all pending appointments for the user's hospital.
 * Accessible by: Doctor (own only), Admin (entire hospital).
 * @param {string} token
 */
export const getPendingAppointments = (token) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.PENDING, {
            headers: authHeaders(token),
        })
    );

/**
 * Get all appointments for the admin's hospital (all statuses).
 * Accessible by: Admin.
 * @param {string} token
 * @param {{ status?: string, date?: string, doctor?: string }} [params={}]
 */
export const getAllAppointments = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.ALL, {
            headers: authHeaders(token),
            params,
        })
    );

// ─────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Create / save a prescription for an approved appointment.
 * Accessible by: Doctor.
 * @param {string} token
 * @param {{ appointmentId, medicines, vitals?, suggestions?, reports?, patientAge?, patientPhone?, patientAddress? }} data
 */
export const savePrescription = (token, data) =>
    handleRequest(() =>
        apiClient.post(APPOINTMENTS.SAVE_PRESCRIPTION, data, {
            headers: authHeaders(token),
        })
    );

/**
 * Get prescriptions that are pending invoice generation.
 * Accessible by: Admin.
 * @param {string} token
 * @param {{ status?: string, appointmentId?: string }} [params={}]
 */
export const getPendingPrescriptions = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.PRESCRIPTIONS_PENDING, {
            headers: authHeaders(token),
            params,
        })
    );

/**
 * Get prescriptions for the logged-in Patient or Doctor.
 * Accessible by: Patient, Doctor.
 * @param {string} token
 * @param {{ status?: string }} [params={}]
 */
export const getMyPrescriptions = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.PRESCRIPTIONS_MY, {
            headers: authHeaders(token),
            params,
        })
    );

/**
 * Get all prescriptions for the admin's hospital.
 * Accessible by: Admin.
 * @param {string} token
 * @param {{ status?, invoiceId?, doctorEmail?, patientEmail?, date? }} [params={}]
 */
export const getAllPrescriptions = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.PRESCRIPTIONS_ALL, {
            headers: authHeaders(token),
            params,
        })
    );

// ─────────────────────────────────────────────────────────────
// MEDICINES
// ─────────────────────────────────────────────────────────────

/**
 * Get approved medicines in stock for a specific hospital.
 * Accessible by: Doctor, Admin.
 * @param {string} token
 * @param {string} hospitalName
 */
export const getHospitalMedicines = (token, hospitalName) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.HOSPITAL_MEDICINES(hospitalName), {
            headers: authHeaders(token),
        })
    );

/**
 * Get medicines for the hospital derived from the token (no explicit hospital name).
 * Accessible by: Doctor, Admin.
 * @param {string} token
 */
export const getMyHospitalMedicines = (token) =>
    handleRequest(() =>
        apiClient.get(APPOINTMENTS.HOSPITAL_MEDICINES_SELF, {
            headers: authHeaders(token),
        })
    );
