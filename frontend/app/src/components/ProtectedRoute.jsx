import { Navigate, Outlet, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // Using named import

const ProtectedRoute = () => {
  const token = localStorage.getItem("authToken");
  const userType = localStorage.getItem("userType");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decodedToken.exp < currentTime) {
      // Token has expired
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userType");
      return <Navigate to="/login" />;
    }

    // Check if user is accessing their allowed routes
    const path = location.pathname.toLowerCase();
    const allowedPaths = {
      doctor: ['/doctor', '/doctor/appointments', '/doctor/profile', '/doctor/medical_products'],
      patient: ['/patient', '/patient/appointments', '/patient/disease', '/patient/profile'],
      admin: ['/admin', '/admin/adddata', '/admin/product', '/admin/departments', '/admin/reports']
    };

    const userAllowedPaths = allowedPaths[userType] || [];
    const isAllowedPath = userAllowedPaths.some(allowedPath => 
      path.startsWith(allowedPath.toLowerCase())
    );

    if (!isAllowedPath) {
      console.log(`User of type ${userType} attempted to access unauthorized path: ${path}`);
      return <Navigate to={`/${userType}`} />;
    }

    return <Outlet />;
  } catch (_) { // Use underscore to indicate unused parameter
    // Invalid token
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userType");
    return <Navigate to="/login" />;
  }
};

export default ProtectedRoute;
