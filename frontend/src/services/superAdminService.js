/**
 * superAdminService.js — platform-wide data for the super admin (all hospitals).
 *
 *   GET    /api/superadmin/dashboard/?period&hospital           SuperAdmin
 *   GET    /api/superadmin/hospitals/                           SuperAdmin
 *   POST   /api/superadmin/hospitals/                           SuperAdmin
 *   PATCH  /api/superadmin/hospitals/<id>/                      SuperAdmin
 *   DELETE /api/superadmin/hospitals/<id>/                      SuperAdmin
 *   POST   /api/superadmin/admins/                              SuperAdmin  (returns inviteLink)
 *   PATCH  /api/superadmin/admins/<id>/                         SuperAdmin
 *   POST   /api/superadmin/admins/<id>/invite/                  SuperAdmin
 *   GET    /api/superadmin/suppliers/?period                    SuperAdmin
 *   POST   /api/superadmin/suppliers/                           SuperAdmin  (returns inviteLink)
 *   PATCH  /api/superadmin/suppliers/<id>/                      SuperAdmin
 *   DELETE /api/superadmin/suppliers/<id>/                      SuperAdmin
 *   POST   /api/superadmin/suppliers/<id>/invite/               SuperAdmin
 *   GET    /api/superadmin/finance/?period&hospital             SuperAdmin
 *   GET    /api/superadmin/settings/                            SuperAdmin
 *   PUT    /api/superadmin/settings/                            SuperAdmin
 *   POST   /api/superadmin/settings/test-razorpay/              SuperAdmin
 *   GET    /api/superadmin/public-settings/                     public
 *   GET    /api/accounts/set-password/?token=                   public
 *   POST   /api/accounts/set-password/                          public
 */
import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { SUPERADMIN } from "./endpoints";

const get = (token, url, params) => handleRequest(() => apiClient.get(url, { headers: authHeaders(token), params }));
const post = (token, url, data = {}) => handleRequest(() => apiClient.post(url, data, { headers: authHeaders(token) }));
const patch = (token, url, data) => handleRequest(() => apiClient.patch(url, data, { headers: authHeaders(token) }));
const put = (token, url, data) => handleRequest(() => apiClient.put(url, data, { headers: authHeaders(token) }));
const del = (token, url) => handleRequest(() => apiClient.delete(url, { headers: authHeaders(token) }));
const withHospital = (period, hospital) => ({ period, ...(hospital ? { hospital } : {}) });

// dashboard
export const getSuperAdminDashboard = (token, { period = "month", hospital = "" } = {}) =>
    get(token, SUPERADMIN.DASHBOARD, withHospital(period, hospital));

// hospitals + admins
export const getSaHospitals = (token) => get(token, SUPERADMIN.HOSPITALS);
export const createSaHospital = (token, data) => post(token, SUPERADMIN.HOSPITALS, data);
export const updateSaHospital = (token, id, data) => patch(token, SUPERADMIN.HOSPITAL(id), data);
export const deleteSaHospital = (token, id) => del(token, SUPERADMIN.HOSPITAL(id));
export const createSaAdmin = (token, data) => post(token, SUPERADMIN.ADMINS, data);
export const updateSaAdmin = (token, id, data) => patch(token, SUPERADMIN.ADMIN(id), data);
export const resendAdminInvite = (token, id) => post(token, SUPERADMIN.ADMIN_INVITE(id));

// suppliers
export const getSaSuppliers = (token, period = "year") => get(token, SUPERADMIN.SUPPLIERS, { period });
/** data: FormData with companyName, name, email, contactNo, companyStartingDate, companyLicense (PDF) */
export const createSaSupplier = (token, data) =>
    handleRequest(() => apiClient.post(SUPERADMIN.SUPPLIERS, data, {
        headers: authHeaders(token, { "Content-Type": "multipart/form-data" }),
    }));
export const updateSaSupplier = (token, id, data) => patch(token, SUPERADMIN.SUPPLIER(id), data);
export const deleteSaSupplier = (token, id) => del(token, SUPERADMIN.SUPPLIER(id));
export const resendSupplierInvite = (token, id) => post(token, SUPERADMIN.SUPPLIER_INVITE(id));

// finance
export const getSaFinance = (token, { period = "month", hospital = "" } = {}) =>
    get(token, SUPERADMIN.FINANCE, withHospital(period, hospital));

// settings
export const getSaSettings = (token) => get(token, SUPERADMIN.SETTINGS);
export const saveSaSettings = (token, data) => put(token, SUPERADMIN.SETTINGS, data);
export const testRazorpayKeys = (token, data = {}) => post(token, SUPERADMIN.TEST_RAZORPAY, data);

// public (no login)
export const getPublicSettings = () => handleRequest(() => apiClient.get(SUPERADMIN.PUBLIC_SETTINGS));
export const getInviteInfo = (inviteToken) =>
    handleRequest(() => apiClient.get(SUPERADMIN.SET_PASSWORD, { params: { token: inviteToken } }));
export const setPasswordWithInvite = (inviteToken, password) =>
    handleRequest(() => apiClient.post(SUPERADMIN.SET_PASSWORD, { token: inviteToken, password }));
