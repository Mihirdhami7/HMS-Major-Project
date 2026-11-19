/**
 * AuthContext.jsx
 *
 * Session handling — server sessions, ONE login per browser, nothing kept in browser storage:
 *   Login   → POST /api/accounts/login/ → server creates the session and sets an httpOnly
 *             cookie (JavaScript cannot read it); the response's token is kept only in memory
 *   Load    → GET /api/accounts/session/ → the server reads the cookie and answers who is logged in
 *   Tabs    → the cookie is shared by all tabs; a login / logout in one tab is told to the others
 *             (BroadcastChannel) and every tab re-checks the session when it becomes visible again
 *   Expiry  → the server session lasts 4 hours (token exp); then every tab is logged out
 *   401     → any API call answering 401 means the session ended on the server → logged out
 *   Logout  → POST /api/accounts/logout/ → server deletes the session and the cookie
 *
 * After a forced logout, `authNotice` explains why on the login page.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getSession, logoutUser } from "../services/authService";
import { setUnauthorizedHandler } from "../services/apiClient";
import { normalizeRole } from "../constants/roles";

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

/** Expiry time (ms) from the JWT's `exp`, or null. */
const tokenExpiry = (token) => {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload?.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

const normalizeUser = (userData) =>
    userData ? { ...userData, userType: normalizeRole(userData.userType) } : null;

// Tells the other open tabs about a login / logout (no data is stored anywhere).
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("hms_auth") : null;
const tellOtherTabs = (message) => channel?.postMessage(message);

// Older versions kept the login in browser storage — remove those copies once.
try {
    sessionStorage.removeItem("hms_auth");
    localStorage.removeItem("hms_auth");
} catch {
    /* storage not available */
}

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    // Until the server answers who is logged in, protected pages show a loader instead of redirecting.
    const [isLoading, setIsLoading] = useState(true);
    // Why the user was logged out (shown on the login page), e.g. "Your session expired."
    const [authNotice, setAuthNotice] = useState(null);
    const tokenRef = useRef(null);
    tokenRef.current = token;

    const isAuthenticated = !!token && !!user;

    const reset = useCallback((notice = null) => {
        setToken(null);
        setUser(null);
        if (notice) setAuthNotice(notice);
    }, []);

    const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

    /** Ask the server who is logged in on this browser. Returns the email or null. */
    const refreshSession = useCallback(async () => {
        const result = await getSession();
        if (!result.success) return tokenRef.current ? "unknown" : null; // network error: keep state
        const data = result.data || {};
        if (data.status === "success" && data.access) {
            setToken(data.access);
            setUser(normalizeUser(data.userData));
            return data.userData?.email || null;
        }
        if (tokenRef.current) reset("Your session has ended. Please log in again.");
        return null;
    }, [reset]);

    /**
     * Call after a successful login response (the server already set the session cookie).
     * @param {string} accessToken - JWT from backend (`access`), kept in memory only
     * @param {object} userData    - backend `userData`: { email, userType, hospitalName, name }
     */
    const login = useCallback((accessToken, userData) => {
        const normalized = normalizeUser(userData);
        // a different account was logged in → end its session on the server
        if (tokenRef.current && tokenRef.current !== accessToken) logoutUser(tokenRef.current);
        setAuthNotice(null);
        setToken(accessToken);
        setUser(normalized);
        tellOtherTabs({ type: "login", email: normalized?.email, userType: normalized?.userType });
    }, []);

    /** Kept for existing callers: re-check the session with the server. */
    const verify = useCallback(async () => !!(await refreshSession()), [refreshSession]);

    const logout = useCallback(async () => {
        const t = tokenRef.current;
        reset();
        await logoutUser(t); // server deletes the session and the cookie
        tellOtherTabs({ type: "logout" });
    }, [reset]);

    /** Update the in-memory user after a profile edit. */
    const updateUser = useCallback((userData) => {
        setUser((prev) => normalizeUser({ ...prev, ...userData }));
        tellOtherTabs({ type: "refresh" });
    }, []);

    // On page load: who is logged in on this browser?
    useEffect(() => {
        let cancelled = false;
        refreshSession().finally(() => {
            if (!cancelled) setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [refreshSession]);

    // Any 401 from the API: the session ended on the server.
    useEffect(() => {
        setUnauthorizedHandler(() => reset("Your session has ended. Please log in again."));
        return () => setUnauthorizedHandler(null);
    }, [reset]);

    // Expiry: log out when the token's time is up (the server allows 4 hours).
    useEffect(() => {
        if (!token) return undefined;
        const expiresAt = tokenExpiry(token);
        if (!expiresAt) return undefined;
        const left = expiresAt - Date.now();
        const expire = () => reset("Your session expired. Please log in again.");
        if (left <= 0) {
            expire();
            return undefined;
        }
        const timer = setTimeout(expire, Math.min(left, 2 ** 31 - 1));
        return () => clearTimeout(timer);
    }, [token, reset]);

    // Other tabs: follow their login / logout, so the whole browser shows one login.
    useEffect(() => {
        if (!channel) return undefined;
        const onMessage = ({ data }) => {
            if (data?.type === "logout") {
                reset("You were logged out in another tab.");
            } else if (data?.type === "login") {
                // another account (or a fresh login) in another tab → reload so every page shows it
                if (data.email !== user?.email || data.userType !== user?.userType) window.location.reload();
            } else if (data?.type === "refresh") {
                refreshSession();
            }
        };
        channel.addEventListener("message", onMessage);
        return () => channel.removeEventListener("message", onMessage);
    }, [user, reset, refreshSession]);

    // When this tab becomes visible again, make sure it still matches the browser's login.
    useEffect(() => {
        const onVisible = async () => {
            if (document.visibilityState !== "visible") return;
            const before = user?.email || null;
            const now = await refreshSession();
            if (now !== "unknown" && now && before && now !== before) window.location.reload();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [user, refreshSession]);

    const value = useMemo(
        () => ({ token, user, isAuthenticated, isLoading, login, logout, verify, updateUser, authNotice, clearAuthNotice }),
        [token, user, isAuthenticated, isLoading, login, logout, verify, updateUser, authNotice, clearAuthNotice]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
