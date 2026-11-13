/**
 * orderService.js
 * All product and order (stock management) API calls.
 *
 * Routes used:
 *   GET    /api/orders/products/?hospitalName=X                     Authenticated
 *   POST   /api/orders/products/create/                             Supplier
 *   GET    /api/orders/products/unapproved/                         Admin
 *   PUT    /api/orders/products/approve/<productId>/                Admin
 *   GET    /api/orders/orders/                                       Admin | Supplier | SuperAdmin
 *   POST   /api/orders/orders/create/                               Admin
 *   POST   /api/orders/orders/fulfill/<orderId>/                    Supplier
 *   POST   /api/orders/orders/complete/<orderId>/                   Admin
 *   GET    /api/orders/supplier-products/                           Supplier
 *   GET    /api/orders/supplier-orders/                             Supplier
 */

import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { ORDERS } from "./endpoints";

// ─────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────

/**
 * List approved products for a hospital.
 * Accessible by: Any authenticated user.
 * @param {string} token
 * @param {string} hospitalName
 */
export const listProducts = (token, hospitalName) =>
    handleRequest(() =>
        apiClient.get(ORDERS.PRODUCTS, {
            headers: authHeaders(token),
            params: { hospitalName },
        })
    );

/**
 * Submit a new product for admin approval.
 * Accessible by: Supplier.
 * @param {string} token
 * @param {{ name: string, hospitalName: string, quantity: number, price: number, [key: string]: any }} data
 */
export const createProduct = (token, data) =>
    handleRequest(() =>
        apiClient.post(ORDERS.PRODUCT_CREATE, data, {
            headers: authHeaders(token),
        })
    );

/**
 * List products awaiting approval.
 * Accessible by: Admin.
 * @param {string} token
 * @param {string} [hospitalName]  - Optional hospital filter
 */
export const listUnapprovedProducts = (token, hospitalName) =>
    handleRequest(() =>
        apiClient.get(ORDERS.PRODUCTS_UNAPPROVED, {
            headers: authHeaders(token),
            params: hospitalName ? { hospitalName } : {},
        })
    );

/**
 * Approve or reject a pending product.
 * Accessible by: Admin.
 * @param {string} token
 * @param {string} productId
 * @param {{ status: "approved"|"rejected" }} data
 */
export const approveProduct = (token, productId, data) =>
    handleRequest(() =>
        apiClient.put(ORDERS.PRODUCT_APPROVE(productId), data, {
            headers: authHeaders(token),
        })
    );

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────

/**
 * List orders.
 * - Admin     → sees orders for their hospital automatically.
 * - Supplier  → sees orders for their company automatically.
 * - SuperAdmin → optionally filter by hospitalName or supplier_company query params.
 * Accessible by: Admin, Supplier, SuperAdmin.
 * @param {string} token
 * @param {{ hospitalName?: string, supplier_company?: string }} [params={}]
 */
export const listOrders = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(ORDERS.ORDERS_LIST, {
            headers: authHeaders(token),
            params,
        })
    );

/**
 * Create a stock request / order.
 * Accessible by: Admin.
 * @param {string} token
 * @param {{ productId: string, quantity: number, supplier_company: string, [key: string]: any }} data
 */
export const createOrder = (token, data) =>
    handleRequest(() =>
        apiClient.post(ORDERS.ORDER_CREATE, data, {
            headers: authHeaders(token),
        })
    );

/**
 * Fulfill an order (supplier ships the stock).
 * Accessible by: Supplier.
 * @param {string} token
 * @param {string} orderId
 * @param {{ hospitalName: string, quantity_fulfilled: number, price_per_strip: number, expiry_date?: string, fulfillment_notes?: string }} data
 */
export const fulfillOrder = (token, orderId, data) =>
    handleRequest(() =>
        apiClient.post(ORDERS.ORDER_FULFILL(orderId), data, {
            headers: authHeaders(token),
        })
    );

/**
 * Mark an order as completed after payment is verified.
 * Accessible by: Admin.
 * @param {string} token
 * @param {string} orderId
 * @param {{ hospitalName: string, payment_id: string }} data
 */
export const completeOrder = (token, orderId, data) =>
    handleRequest(() =>
        apiClient.post(ORDERS.ORDER_COMPLETE(orderId), data, {
            headers: authHeaders(token),
        })
    );

// ─────────────────────────────────────────────────────────────
// SUPPLIER SPECIFIC
// ─────────────────────────────────────────────────────────────

/**
 * Get all products belonging to the logged-in supplier's company.
 * Accessible by: Supplier.
 * @param {string} token
 */
export const getSupplierProducts = (token) =>
    handleRequest(() =>
        apiClient.get(ORDERS.SUPPLIER_PRODUCTS, {
            headers: authHeaders(token),
        })
    );

/**
 * Get all orders assigned to the logged-in supplier's company.
 * Accessible by: Supplier.
 * @param {string} token
 */
export const getSupplierOrders = (token) =>
    handleRequest(() =>
        apiClient.get(ORDERS.SUPPLIER_ORDERS, {
            headers: authHeaders(token),
        })
    );

// ─────────────────────────────────────────────────────────────
// MEDICINE REQUESTS (doctor asks pharmacy to stock a medicine)
// ─────────────────────────────────────────────────────────────

/** Doctor: request a medicine that is not in the hospital inventory. */
export const createMedicineRequest = (token, data) =>
    handleRequest(() =>
        apiClient.post(ORDERS.MEDICINE_REQUESTS, data, {
            headers: authHeaders(token),
        })
    );

/** Doctor: own requests. Admin: hospital requests. params: { status } */
export const listMedicineRequests = (token, params = {}) =>
    handleRequest(() =>
        apiClient.get(ORDERS.MEDICINE_REQUESTS, {
            headers: authHeaders(token),
            params,
        })
    );

/** Admin: set status open | ordered | done | rejected */
export const updateMedicineRequest = (token, requestId, status) =>
    handleRequest(() =>
        apiClient.patch(ORDERS.MEDICINE_REQUEST(requestId), { status }, {
            headers: authHeaders(token),
        })
    );

