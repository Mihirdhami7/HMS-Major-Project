import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute Component
 * 
 * Wraps protected routes to:
 * 1. Check if user is authenticated
 * 2. Verify token with backend
 * 3. Redirect to login if not authenticated
 * 4. Show loading state while verifying
 */
export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while verifying token
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-blue-800 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if required role matches user's role
  if (requiredRole && user?.userType?.toLowerCase() !== requiredRole.toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  // Render protected component
  return children;
};

export default ProtectedRoute;
