import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { NOTIFICATIONS } from "./endpoints";

/** GET my notifications → data: { unread, count, notifications: [{ id, title, message, type, referenceId, read, createdAt }] } */
export const getNotifications = (token, params = { limit: 20 }) =>
    handleRequest(() =>
        apiClient.get(NOTIFICATIONS.LIST, {
            headers: authHeaders(token),
            params,
        })
    );

/** Mark notifications as read. Pass ids, or nothing to mark all as read. */
export const markNotificationsRead = (token, ids = null) =>
    handleRequest(() =>
        apiClient.post(NOTIFICATIONS.MARK_READ, ids ? { ids } : {}, {
            headers: authHeaders(token),
        })
    );
