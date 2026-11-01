/**
 * paymentService.js
 * Razorpay payment flow — create order then verify signature.
 *
 * Routes used:
 *   POST  /api/payments/razorpay/order/    Authenticated (Patient/Admin for bookings; Admin for supplier)
 *   POST  /api/payments/razorpay/verify/   Authenticated
 *
 * Typical flow:
 *   1. Call createRazorpayOrder()  → get razorpay_order + razorpay_key_id
 *   2. Open Razorpay checkout modal with those details
 *   3. On modal success call verifyRazorpayPayment() with the callback params
 */

import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { PAYMENTS } from "./endpoints";

/**
 * Step 1 — Create a Razorpay order on the server.
 * Accessible by: Patient or Admin (appointment/invoice), Admin only (supplier purchase).
 *
 * @param {string} token
 * @param {{
 *   payment_id: string,
 *   order_id: string,
 *   source: string,
 *   category: "APPOINTMENT_BOOKING"|"PRESCRIPTION_INVOICE"|"SUPPLIER_PURCHASE",
 *   amount: number,
 *   currency?: string,
 *   patient_id?: string,
 *   hospital_id?: string,
 *   appointment_id?: string,
 *   invoice_id?: string,
 *   supplier_id?: string,
 *   purchase_order_id?: string,
 * }} data
 *
 * @returns {{ razorpay_key_id, razorpay_order, payment_meta }}
 */
export const createRazorpayOrder = (token, data) =>
    handleRequest(() =>
        apiClient.post(PAYMENTS.RAZORPAY_ORDER, data, {
            headers: authHeaders(token),
        })
    );

/**
 * Step 2 — Verify Razorpay payment signature and record the payment.
 * Call this inside the Razorpay checkout `handler` callback.
 * Accessible by: Authenticated.
 *
 * @param {string} token
 * @param {{
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   payment_id: string,
 *   order_id: string,
 *   source: string,
 *   category: string,
 *   amount: number,
 *   currency?: string,
 *   hospital_id?: string,
 *   hospital_name?: string,
 *   company_name?: string,
 *   product_name?: string,
 *   patient_id?: string,
 *   patient_name?: string,
 *   appointment_id?: string,
 *   invoice_id?: string,
 *   supplier_id?: string,
 *   supplier_name?: string,
 *   purchase_order_id?: string,
 *   quantity?: number,
 * }} data
 */
export const verifyRazorpayPayment = (token, data) =>
    handleRequest(() =>
        apiClient.post(PAYMENTS.RAZORPAY_VERIFY, data, {
            headers: authHeaders(token),
        })
    );
