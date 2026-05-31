import { useAuth } from '../context/AuthContext';

/**
 * useAuthStorage Hook
 * Provides backward compatibility for components using sessionStorage
 * Bridges old sessionStorage calls with new AuthContext
 * 
 * Usage:
 * const { userType, email, name, hospitalName } = useAuthStorage();
 */
export const useAuthStorage = () => {
  const { user, isAuthenticated } = useAuth();
  
  return {
    // User authentication data
    userType: user?.userType || null,
    email: user?.email || null,
    name: user?.name || null,
    hospitalName: user?.hospitalName || null,
    isAuthenticated,
    
    // Fallback for token (from localStorage)
    token: localStorage.getItem('access_token'),
    
    // Helper method to get token with Bearer prefix
    getAuthHeader: () => {
      const token = localStorage.getItem('access_token');
      return token ? `Bearer ${token}` : null;
    },
  };
};

/**
 * Direct compatibility wrapper for sessionStorage calls
 * For use in components not yet updated to use hooks
 * 
 * USAGE:
 * Instead of: sessionStorage.getItem('userType')
 * Use: getAuthStorageValue('userType')
 */
export const getAuthStorageValue = (key) => {
  // Map old sessionStorage keys to new auth system
  const keyMap = {
    'session_Id': localStorage.getItem('access_token'),
    'userType': null, // Will be set by context
    'email': null,
    'name': null,
    'hospitalName': null,
  };
  
  // First try localStorage (new system)
  if (key === 'session_Id') {
    const token = localStorage.getItem('access_token');
    if (token) return token;
  }
  
  // Fallback to sessionStorage (during migration)
  return sessionStorage.getItem(key);
};
