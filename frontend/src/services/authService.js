/**
 * authService.js
 * All authentication-related API calls.
 *
 * Routes used:
 *   POST   /api/accounts/register/
 *   POST   /api/accounts/verify-email/
 *   POST   /api/accounts/login/
 *   POST   /api/accounts/logout/          (requires token)
 *   GET    /api/accounts/verify/           (requires token)
 *   GET    /api/accounts/profile/me/       (requires token)
 *   PATCH  /api/accounts/profile/me/update/ (requires token)
 *   GET    /api/accounts/get_company_name/<email>/ (requires token)
 */

import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { ACCOUNTS } from "./endpoints";

// ─────────────────────────────────────────────────────────────
// PUBLIC — no token required
// ─────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Accepts multipart/form-data (FormData) for photo / certificate uploads.
 * @param {FormData} formData
 */
export const registerUser = (formData) =>
    handleRequest(() =>
        apiClient.post(ACCOUNTS.REGISTER, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        })
    );

/**
 * Verify email with OTP sent during registration.
 * @param {string} email
 * @param {string} otp
 */
export const verifyEmail = (email, otp) =>
    handleRequest(() =>
        apiClient.post(ACCOUNTS.VERIFY_EMAIL, { email, otp })
    );

/**
 * Login user.
 * Returns access token + userData on success.
 * @param {{ email: string, password: string, category: string, hospitalName?: string }} loginData
 */
export const loginUser = (loginData) =>
    handleRequest(() =>
        apiClient.post(ACCOUNTS.LOGIN, loginData)
    );

/** Forgot password step 1: email a 6-digit reset code. */
export const requestPasswordReset = (email) =>
    handleRequest(() =>
        apiClient.post(ACCOUNTS.PASSWORD_RESET_REQUEST, { email })
    );

/** Forgot password step 2: code from the email + new password. */
export const confirmPasswordReset = (email, otp, newPassword) =>
    handleRequest(() =>
        apiClient.post(ACCOUNTS.PASSWORD_RESET_CONFIRM, { email, otp, newPassword })
    );

// ─────────────────────────────────────────────────────────────
// AUTHENTICATED — token required
// ─────────────────────────────────────────────────────────────

/**
 * Verify the current JWT session.
 * Returns { email, userType, hospitalName } on success.
 * @param {string} token
 */
export const verifyAuth = (token) =>
    handleRequest(() =>
        apiClient.get(ACCOUNTS.VERIFY, {
            headers: authHeaders(token),
        })
    );

/**
 * Logout — invalidates the session on the server.
 * @param {string} token
 */
export const logoutUser = (token) =>
    handleRequest(() =>
        apiClient.post(ACCOUNTS.LOGOUT, {}, {
            headers: authHeaders(token),
        })
    );

/**
 * Get the authenticated user's profile.
 * @param {string} token
 */
export const getUserProfile = (token) =>
    handleRequest(() =>
        apiClient.get(ACCOUNTS.PROFILE_ME, {
            headers: authHeaders(token),
        })
    );

/**
 * Update the authenticated user's profile.
 * Accepts multipart/form-data for photo / certificate uploads.
 * @param {string} token
 * @param {FormData} formData
 */
export const updateUserProfile = (token, formData) =>
    handleRequest(() =>
        apiClient.patch(ACCOUNTS.PROFILE_UPDATE, formData, {
            headers: authHeaders(token, { "Content-Type": "multipart/form-data" }),
        })
    );

/**
 * Get a supplier's company name by email.
 * Accessible by: Admin, SuperAdmin.
 * @param {string} token
 * @param {string} email  - Supplier email
 */
export const getCompanyName = (token, email) =>
    handleRequest(() =>
        apiClient.get(ACCOUNTS.COMPANY_NAME(email), {
            headers: authHeaders(token),
        })
    );
