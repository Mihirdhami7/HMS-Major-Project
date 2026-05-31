import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  getToken,
  getUserData,
  setToken,
  setUserData,
  verifyAuth,
  logoutUser,
  clearAuth,
} from "../services/authService";

// ═══════════════════════════════════════════════════════════
// CREATE AUTH CONTEXT
// ═══════════════════════════════════════════════════════════

const AuthContext = createContext();

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// ═══════════════════════════════════════════════════════════
// AUTH PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────────────────
  // Initialize auth on app load
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = getToken();
        const savedUser = getUserData();

        if (savedToken) {
          // Verify token with backend
          const result = await verifyAuth(savedToken);

          if (result.authenticated) {
            setTokenState(savedToken);
            setUser(savedUser);
            setIsAuthenticated(true);
            setError(null);
          } else {
            // Token invalid or expired
            clearAuth();
            setTokenState(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // No token, user not logged in
          setTokenState(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError(err.message);
        clearAuth();
        setTokenState(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Always finish loading
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Login action
  // ─────────────────────────────────────────────────────────
  const login = (token, userData) => {
    setToken(token);
    setUserData(userData);
    setTokenState(token);
    setUser(userData);
    setIsAuthenticated(true);
    setError(null);
  };

  // ─────────────────────────────────────────────────────────
  // Logout action
  // ─────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await logoutUser(token);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuth();
      setTokenState(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Update user data
  // ─────────────────────────────────────────────────────────
  const updateUser = (userData) => {
    setUserData(userData);
    setUser(userData);
  };

  // ─────────────────────────────────────────────────────────
  // Value object to provide
  // ─────────────────────────────────────────────────────────
  const value = {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
