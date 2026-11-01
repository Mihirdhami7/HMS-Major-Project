/**
 * AuthContext.jsx
 *
 * Session handling:
 *   Login   → POST /api/accounts/login/ → { access, userData } → saved in state + sessionStorage
 *   Reload  → token restored from sessionStorage → GET /api/accounts/verify/ confirms it is still valid
 *   401     → any API call answering 401 logs the user out (see apiClient.setUnauthorizedHandler)
 *   Logout  → POST /api/accounts/logout/ (backend deletes session) → state + storage cleared
 *
 * sessionStorage (not localStorage) keeps the login for the browser tab only.
 * Later (production) this should move to an httpOnly refresh cookie issued by the backend.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { verifyAuth, logoutUser } from "../services/authService";
import { setUnauthorizedHandler } from "../services/apiClient";
import { normalizeRole } from "../constants/roles";

const STORAGE_KEY = "hms_auth";

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

const readStored = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token ? parsed : null;
    } catch {
        return null;
    }
};

const writeStored = (value) => {
    try {
        if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* storage unavailable (private mode) — session simply won't survive reload */
    }
};

const normalizeUser = (userData) =>
    userData ? { ...userData, userType: normalizeRole(userData.userType) } : null;

export const AuthProvider = ({ children }) => {
    const stored = readStored();
    const [token, setToken] = useState(stored?.token ?? null);
    const [user, setUser] = useState(normalizeUser(stored?.user));
    // While a stored token is being verified, protected routes show a loader instead of redirecting.
    const [isLoading, setIsLoading] = useState(!!stored?.token);

    const isAuthenticated = !!token && !!user;

    const reset = useCallback(() => {
        setToken(null);
        setUser(null);
        writeStored(null);
    }, []);

    /**
     * Call after a successful login response.
     * @param {string} accessToken - JWT from backend (`access`)
     * @param {object} userData    - backend `userData`: { email, userType, hospitalName, name }
     */
    const login = useCallback((accessToken, userData) => {
        const normalized = normalizeUser(userData);
        setToken(accessToken);
        setUser(normalized);
        writeStored({ token: accessToken, user: normalized });
    }, []);

    /** Re-check the current token with the backend. Returns true when still valid. */
    const verify = useCallback(async (tokenToCheck) => {
        const t = tokenToCheck ?? token;
        if (!t) return false;
        const result = await verifyAuth(t);
        if (result.success && result.data?.status === "success") {
            setUser((prev) => {
                const merged = normalizeUser({ ...prev, ...result.data.user });
                writeStored({ token: t, user: merged });
                return merged;
            });
            return true;
        }
        // Only drop the session when the server actually rejected it (not on network errors).
        if (result.status === 401 || result.status === 403) reset();
        return false;
    }, [token, reset]);

    const logout = useCallback(async () => {
        const t = token;
        reset();
        if (t) await logoutUser(t);
    }, [token, reset]);

    /** Update local user object after a profile edit. */
    const updateUser = useCallback((userData) => {
        setUser((prev) => {
            const merged = normalizeUser({ ...prev, ...userData });
            writeStored(token ? { token, user: merged } : null);
            return merged;
        });
    }, [token]);

    // Verify a restored session once on app load.
    useEffect(() => {
        if (!stored?.token) return;
        let cancelled = false;
        verify(stored.token).finally(() => {
            if (!cancelled) setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Any 401 from the API logs the user out.
    useEffect(() => {
        setUnauthorizedHandler(() => reset());
        return () => setUnauthorizedHandler(null);
    }, [reset]);

    const value = useMemo(
        () => ({ token, user, isAuthenticated, isLoading, login, logout, verify, updateUser }),
        [token, user, isAuthenticated, isLoading, login, logout, verify, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
