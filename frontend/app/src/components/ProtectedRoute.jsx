import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = () => {
  const location = useLocation();
  const userEmail = localStorage.getItem("userEmail");
  const userType = localStorage.getItem("userType");

  // Check if user is authenticated
  if (!userEmail || !userType) {
    console.log("No user data found, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  } 

  // Special case for superadmin
  if (userEmail.toLowerCase() === "21it402@bvmengineering.ac.in") {
    const path = location.pathname.toLowerCase();
    if (!path.startsWith('/superadmin')) {
      console.log("Superadmin redirected to dashboard");
      return <Navigate to="/superadmin" replace />;
    }
    return <Outlet />;
  }

  // Check if user is accessing their allowed routes
  const path = location.pathname.toLowerCase();
  const allowedPaths = {
    doctor: ['/doctor', '/doctor/appointments', '/doctor/profile', '/doctor/medical_products'],
    patient: ['/patient', '/patient/appointments', '/patient/disease', '/patient/profile', '/patient/appointments/book'],
    admin: ['/admin', '/admin/newregister', '/admin/product', '/admin/departments', '/admin/reports'],
    supplier: ['/supplier', '/supplier/suppdashboard', '/supplier/suppproduct']
  };

  const userAllowedPaths = allowedPaths[userType.toLowerCase()] || [];
  const isAllowedPath = userAllowedPaths.some(allowedPath => 
    path.startsWith(allowedPath.toLowerCase())
  );

  if (!isAllowedPath) {
    console.log(`User of type ${userType} attempted to access unauthorized path: ${path}`);
    return <Navigate to={`/${userType.toLowerCase()}`} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;