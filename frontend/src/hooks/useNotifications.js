import { useCallback, useEffect, useRef, useState } from "react";
import { getNotifications, markNotificationsRead } from "../services/notificationService";
import { pickList } from "../services/apiClient";

const POLL_MS = 30000;

/** Show an OS-level notification if the user allowed it (works while the tab is in the background). */
const showBrowserNotification = (n) => {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(n.title || "EasyTreat", { body: n.message, tag: n.id });
    }
  } catch {
    /* some browsers block Notification outside secure contexts — ignore */
  }
};

/**
 * Notifications for the logged-in user, refreshed every 30 s (and when the tab regains focus).
 * New unread notifications that arrive after the first load are returned in `fresh`
 * (for an in-app popup) and shown as a browser notification when permitted.
 *
 * @param {string|null} token
 */
export const useNotifications = (token) => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [fresh, setFresh] = useState([]);
  const seenIds = useRef(null); // null until the first load completes

  const refresh = useCallback(async () => {
    if (!token) return;
    const result = await getNotifications(token, { limit: 20 });
    if (!result.success) return;
    const list = pickList(result, "notifications");
    setItems(list);
    setUnread(result.data?.unread ?? list.filter((n) => !n.read).length);

    if (seenIds.current === null) {
      seenIds.current = new Set(list.map((n) => n.id));
      return;
    }
    const newOnes = list.filter((n) => !n.read && !seenIds.current.has(n.id));
    list.forEach((n) => seenIds.current.add(n.id));
    if (newOnes.length) {
      setFresh(newOnes);
      newOnes.forEach(showBrowserNotification);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setUnread(0);
      seenIds.current = null;
      return undefined;
    }
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, refresh]);

  const markRead = useCallback(
    async (ids = null) => {
      if (!token) return;
      // optimistic update
      setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
      const result = await markNotificationsRead(token, ids);
      if (result.success && typeof result.data?.unread === "number") setUnread(result.data.unread);
      else refresh();
    },
    [token, refresh]
  );

  const canAskPermission = typeof Notification !== "undefined" && Notification.permission === "default";
  const askPermission = async () => {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  };

  const clearFresh = useCallback(() => setFresh([]), []);

  return { items, unread, fresh, clearFresh, refresh, markRead, canAskPermission, askPermission };
};

/** "5 min ago", "2 h ago", "3 d ago" or a date. */
export const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(diff)) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
};
