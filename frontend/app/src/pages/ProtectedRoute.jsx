import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = () => {
  const location = useLocation();
  const [isValidSession, setIsValidSession] = useState(null);
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    const validateSession = async () => {
      const sessionID = sessionStorage.getItem("session_Id");
      if (!sessionID) {
        setIsValidSession(false);
        return;
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/api/accounts/check_session/", {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": sessionID,
          },
        });

        const data = await response.json();
        if (response.ok && data.status === "success") {

          const userInfo = {
            userType: data.userData?.userType || data.userType || sessionStorage.getItem("userType"),
            email: data.userData?.email || data.email || sessionStorage.getItem("email")
          };

          console.log("Using normalized user data:", userInfo);
          setUserData(userInfo);
          setIsValidSession(true);

          sessionStorage.setItem("userType", userInfo.userType.toLowerCase());
          sessionStorage.setItem("email", userInfo.email);
        } else {
          setIsValidSession(false);
        }
      } catch (error) {
        console.error("Error validating session:", error);
        setIsValidSession(false);
      }
    };

    validateSession();
  }, [location.pathname]);

  if (isValidSession === null) return <p>Loading...</p>;
  if (!isValidSession) return <Navigate to="/" replace />;

// Replace the path authorization section with this improved version:

  const userType = userData?.userType?.toLowerCase();
  
  // Define allowed routes based on user type
  const allowedPaths = {
    doctor: ["/doctor", "/doctor/appointments", "/doctor/profile", "/doctor/medical_products"],
    patient: ["/patient", "/patient/appointments", "/patient/disease", "/patient/profile", "/patient/appointments/book"],
    admin: ["/admin", "/admin/newregister", "/admin/product", "/admin/departments", "/admin/reports", "/admin/givemedicine", "/admin/givemedicine/medicine"],
    supplier: ["/supplier", "/supplier/suppdashboard", "/supplier/suppproduct","/supplier/profile"],
    superadmin: ["/superadmin", "/superadmin/dashboard", "/superadmin/hospitals", "/superadmin/reports"],
  };

  // Check if current path is allowed for user type
  if (userType && allowedPaths[userType]) {
    const isPathAllowed = allowedPaths[userType].some(path => 
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  
    if (!isPathAllowed) {
      console.log(`Redirecting: ${location.pathname} is not allowed for ${userType}`);
      // Redirect to first allowed path for this user type
      return <Navigate to={allowedPaths[userType][0]} replace />;
    }
  } else {
    console.log("Unknown user type or no allowed paths:", userType);
  }

  return <Outlet context={{ userData }} />;
};

export default ProtectedRoute;
