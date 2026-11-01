/**
 * hospitalService.js
 * All hospital and department CRUD API calls.
 *
 * Routes used:
 *   GET    /api/hospitals/                                          Authenticated
 *   POST   /api/hospitals/                                          SuperAdmin
 *   PATCH  /api/hospitals/<hospitalId>/update/                      SuperAdmin | Admin (own)
 *   DELETE /api/hospitals/<hospitalId>/                             SuperAdmin
 *   GET    /api/hospitals/<hospitalId>/departments/                 Authenticated
 *   POST   /api/hospitals/<hospitalId>/departments/                 SuperAdmin | Admin (own)
 *   PATCH  /api/hospitals/<hospitalId>/departments/<deptId>/update/ SuperAdmin | Admin (own)
 *   DELETE /api/hospitals/<hospitalId>/departments/<deptId>/        SuperAdmin | Admin (own)
 */

import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { HOSPITALS } from "./endpoints";

// ─────────────────────────────────────────────────────────────
// HOSPITALS
// ─────────────────────────────────────────────────────────────

/**
 * List all hospitals.
 * Accessible by: Any authenticated user.
 * @param {string} token
 */
export const listHospitals = (token) =>
    handleRequest(() =>
        apiClient.get(HOSPITALS.LIST_CREATE, {
            headers: authHeaders(token),
        })
    );

/**
 * Create a new hospital.
 * Accessible by: SuperAdmin.
 * @param {string} token
 * @param {{ name: string, address?: string, contactNo?: string, [key: string]: any }} data
 */
export const createHospital = (token, data) =>
    handleRequest(() =>
        apiClient.post(HOSPITALS.LIST_CREATE, data, {
            headers: authHeaders(token),
        })
    );

/**
 * Update a hospital's details (partial update).
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalId
 * @param {object} data
 */
export const updateHospital = (token, hospitalId, data) =>
    handleRequest(() =>
        apiClient.patch(HOSPITALS.UPDATE(hospitalId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Delete a hospital.
 * Accessible by: SuperAdmin.
 * Hospital must have no departments before deletion.
 * @param {string} token
 * @param {string} hospitalId
 */
export const deleteHospital = (token, hospitalId) =>
    handleRequest(() =>
        apiClient.delete(HOSPITALS.DELETE(hospitalId), {
            headers: authHeaders(token),
        })
    );

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────

/**
 * List all departments for a hospital.
 * Accessible by: Any authenticated user.
 * @param {string} token
 * @param {string} hospitalId
 */
export const listDepartments = (token, hospitalId) =>
    handleRequest(() =>
        apiClient.get(HOSPITALS.DEPARTMENTS(hospitalId), {
            headers: authHeaders(token),
        })
    );

/**
 * Create a new department in a hospital.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalId
 * @param {{ name: string, [key: string]: any }} data
 */
export const createDepartment = (token, hospitalId, data) =>
    handleRequest(() =>
        apiClient.post(HOSPITALS.DEPARTMENTS(hospitalId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Update a department (partial update).
 * Accessible by: SuperAdmin, Admin (own hospital).
 * @param {string} token
 * @param {string} hospitalId
 * @param {string} departmentId
 * @param {object} data
 */
export const updateDepartment = (token, hospitalId, departmentId, data) =>
    handleRequest(() =>
        apiClient.patch(HOSPITALS.DEPARTMENT_UPDATE(hospitalId, departmentId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Delete a department.
 * Accessible by: SuperAdmin, Admin (own hospital).
 * Department must have no doctors assigned before deletion.
 * @param {string} token
 * @param {string} hospitalId
 * @param {string} departmentId
 */
export const deleteDepartment = (token, hospitalId, departmentId) =>
    handleRequest(() =>
        apiClient.delete(HOSPITALS.DEPARTMENT_DELETE(hospitalId, departmentId), {
            headers: authHeaders(token),
        })
    );
