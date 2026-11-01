/**
 * apiClient.js
 * Base axios instance + helpers shared by every service.
 * Token is passed explicitly by each service function.
 *
 * RULE: only files in src/services/ may import axios or this client.
 * Pages call service functions and receive the normalised result shape:
 *   { success, data, message, status, error }
 */

import axios from "axios";
import { API_BASE } from "./endpoints";

const apiClient = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Called whenever the backend answers 401 (token expired / session deleted).
 * AuthContext registers a handler here so the user is logged out globally.
 */
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
    unauthorizedHandler = fn;
};

/**
 * Returns headers with Bearer token for authenticated requests.
 * @param {string} token
 * @param {object} [extra={}] - Additional headers to merge
 */
export const authHeaders = (token, extra = {}) => ({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
});

/**
 * Turn any backend error body into ONE readable string.
 * Backend may send: { message }, { error }, { detail }, { errors: { field: [msg] } },
 * or a DRF validation dict { field: [msg] }.
 */
export const toErrorMessage = (body, fallback = "An error occurred") => {
    if (!body) return fallback;
    if (typeof body === "string") return body;
    if (typeof body.message === "string" && body.message) return body.message;
    if (typeof body.error === "string" && body.error) return body.error;
    if (typeof body.detail === "string" && body.detail) return body.detail;

    const source = body.errors && typeof body.errors === "object" ? body.errors : body;
    const parts = [];
    Object.entries(source).forEach(([field, value]) => {
        if (field === "status") return;
        const text = Array.isArray(value)
            ? value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(" ")
            : typeof value === "string"
                ? value
                : value && typeof value === "object"
                    ? toErrorMessage(value, "")
                    : "";
        if (text) parts.push(field === "non_field_errors" ? text : `${field}: ${text}`);
    });
    return parts.length ? parts.join(" | ") : fallback;
};

/**
 * Normalises every API call into a consistent shape:
 * { success, data, message, status, error }
 * `message` is ALWAYS a string (safe to render in JSX).
 *
 * @param {() => Promise} requestFn - An async function that calls axios
 */
export const handleRequest = async (requestFn) => {
    try {
        const response = await requestFn();
        return {
            success: true,
            data: response.data,
            message: typeof response.data?.message === "string" ? response.data.message : null,
            status: response.status,
        };
    } catch (err) {
        const status = err.response?.status || null;
        if (status === 401 && unauthorizedHandler) {
            unauthorizedHandler();
        }
        const message = err.response
            ? toErrorMessage(err.response.data, `Request failed (${status})`)
            : err.code === "ECONNABORTED"
                ? "The server took too long to respond. Please try again."
                : "Cannot reach the server. Check that the backend is running.";
        return {
            success: false,
            data: null,
            message,
            error: err.response?.data || err.message,
            status,
        };
    }
};

/**
 * Extract a list from a backend response.
 * Backend wraps lists, e.g. { status, count, appointments: [...] }.
 * Usage: pickList(result, "appointments")
 */
export const pickList = (result, key) => {
    const data = result?.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (key && Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.data)) return data.data;
    return [];
};

/**
 * Build an absolute URL for a media path returned by the backend
 * (e.g. "/media/abc@x.com/photos/a.png"). Leaves absolute URLs untouched.
 */
export const mediaUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const origin = API_BASE.replace(/\/api\/?$/, "");
    return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default apiClient;
