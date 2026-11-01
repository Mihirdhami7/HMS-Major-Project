import { useAuth } from '../context/AuthContext';

/**
 * useAuthStorage
 * Convenience wrapper so older components can keep their destructuring
 * without knowing about AuthContext directly.
 *
 * Data comes from AuthContext (React state, persisted per-tab in sessionStorage).
 *
 * Usage:
 *   const { userType, email, name, hospitalName, token } = useAuthStorage();
 */
export const useAuthStorage = () => {
    const { user, token, isAuthenticated } = useAuth();

    return {
        userType:     user?.userType     ?? null,
        email:        user?.email        ?? null,
        name:         user?.name         ?? null,
        hospitalName: user?.hospitalName ?? null,
        token,
        isAuthenticated,
        // Convenience header string for any component still building it manually
        getAuthHeader: () => token ? `Bearer ${token}` : null,
    };
};
