/**
 * Authentication Service
 * Handles all auth-related API calls and local storage management
 */

const API_BASE = "http://127.0.0.1:8000/api/accounts";

// ═══════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════

export const setToken = (token) => {
  localStorage.setItem("access_token", token);
};

export const getToken = () => {
  return localStorage.getItem("access_token");
};

export const removeToken = () => {
  localStorage.removeItem("access_token");
};

export const hasToken = () => {
  return !!getToken();
};

// ═══════════════════════════════════════════════════════════
// USER DATA MANAGEMENT
// ═══════════════════════════════════════════════════════════

export const setUserData = (userData) => {
  localStorage.setItem("userData", JSON.stringify(userData));
};

export const getUserData = () => {
  try {
    const data = localStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};

export const removeUserData = () => {
  localStorage.removeItem("userData");
};

// ═══════════════════════════════════════════════════════════
// AUTH OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Register new user
 * POST /api/accounts/register/
 */
export const registerUser = async (formData) => {
  try {
    const response = await fetch(`${API_BASE}/register/`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        // Don't set Content-Type, let browser set it for FormData
      },
      body: formData,
    });

    const data = await response.json();

    return {
      success: response.ok && data.status === "success",
      status: response.status,
      data: data,
      message: data.message || "Registration failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Network error during registration",
    };
  }
};

/**
 * Verify email with OTP
 * POST /api/accounts/verify-email/
 */
export const verifyEmail = async (email, otp) => {
  try {
    const response = await fetch(`${API_BASE}/verify-email/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    return {
      success: response.ok && data.status === "success",
      data: data,
      message: data.message || "Verification failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Network error during verification",
    };
  }
};

/**
 * Login user
 * POST /api/accounts/login/
 * Returns: { status, access, userData }
 */
export const loginUser = async (loginData) => {
  try {
    const response = await fetch(`${API_BASE}/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();

    if (response.ok && data.status === "success") {
      // Store token and user data
      setToken(data.access);
      setUserData({
        email: data.userData.email,
        userType: data.userData.userType,
        name: data.userData.name,
        hospitalName: data.userData.hospitalName,
      });

      return {
        success: true,
        token: data.access,
        user: data.userData,
        message: data.message,
      };
    } else {
      return {
        success: false,
        message: data.message || "Login failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Network error during login",
    };
  }
};

/**
 * Verify current session
 * GET /api/accounts/verify/
 * Requires: Authorization: Bearer <token>
 */
export const verifyAuth = async (token) => {
  if (!token) {
    return {
      success: false,
      authenticated: false,
      message: "No token provided",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/verify/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.status === "success") {
      return {
        success: true,
        authenticated: true,
        user: data.user,
        message: "Authentication verified",
      };
    } else {
      // Token invalid or expired
      removeToken();
      removeUserData();
      return {
        success: false,
        authenticated: false,
        message: data.message || "Authentication failed",
      };
    }
  } catch (error) {
    removeToken();
    removeUserData();
    return {
      success: false,
      authenticated: false,
      error: error.message,
      message: "Network error during verification",
    };
  }
};

/**
 * Logout user
 * POST /api/accounts/logout/
 * Requires: Authorization: Bearer <token>
 */
export const logoutUser = async (token) => {
  try {
    if (token) {
      await fetch(`${API_BASE}/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Always clear local storage
    removeToken();
    removeUserData();
  }
};

// ═══════════════════════════════════════════════════════════
// CLEAR ALL AUTH DATA
// ═══════════════════════════════════════════════════════════

export const clearAuth = () => {
  removeToken();
  removeUserData();
};
