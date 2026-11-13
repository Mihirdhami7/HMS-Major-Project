import { useLocation, useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiUserPlus, FiFileText, FiCalendar, FiUser, FiPackage, FiTruck } from "react-icons/fi";
import PropTypes from "prop-types";
import { useAuthStorage } from "../hooks/useAuthStorage";


// Sidebar Navigation Items for Different User Types
const slidebars = {
  admin: [
    { icon: FiHome, label: "Dashboard", value: "home" },
    { icon: FiUserPlus, label: "Reception", value: "reception" },
    { icon: FiUserPlus, label: "Products", value: "product" },
    { icon: FiUsers, label: "Departments", value: "department" }, 
    { icon: FiUsers, label: "GiveMedicine", value: "givemedicine" }, 
    { icon: FiUser, label: "Profile", value: "profile" },
  ],
  doctor: [
    { icon: FiHome, label: "Home", value: "home" },
    { icon: FiCalendar, label: "Appointments", value: "appointments" },
    { icon: FiPackage, label: "Medical Products", value: "medical_products" },
    { icon: FiUser, label: "Profile", value: "profile" },
  ],
  patient: [
    { icon: FiHome, label: "Home", value: "home" },
    { icon: FiCalendar, label: "Appointments", value: "appointments" },
    { icon: FiFileText, label: "Disease", value: "disease" },
    { icon: FiUser, label: "Profile", value: "profile" },
  ],
  supplier: [
    { icon: FiHome, label: "Dashboard", value: "home" },
    { icon: FiPackage, label: "Products", value: "suppproduct" },
    { icon: FiTruck, label: "Orders", value: "orders" },
    { icon: FiUser, label: "Profile", value: "profile" },
  ],
  superadmin: [
    { icon: FiCalendar, label: "Dashboard", value: "dashboard" },
    { icon: FiFileText, label: "Hospitals Data", value: "hospitals" },
    { icon: FiUser, label: "Reports", value: "reports" },
  ],
};

// Generate Navigation Link Based on User Type
const getLinkPath = (userType, value) => {
  // "home" = the role's landing dashboard (e.g. /patient)
  if (value === "home") {
    return `/${userType.toLowerCase()}`;
  }
  // Special case for profile links - remove email param
  if (value === "profile") {
    return `/${userType.toLowerCase()}/profile`;
  }
  return `/${userType.toLowerCase()}/${value}`;
};


function Slidebar({ activeTab = "dashboard", setActiveTab = () => {}, userType: userTypeProp }) {
  const { userType: authUserType, isAuthenticated } = useAuthStorage();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Logged-in role is the source of truth; the prop is only a fallback hint.
  const userType = authUserType || userTypeProp || null;
  const currentUserType = userType?.toLowerCase() || "patient";
  const navItems = slidebars[currentUserType] || [];
  
  // If not authenticated or userType not loaded yet, show minimal sidebar
  if (!isAuthenticated || !userType) {
    return (
      <aside className="w-64 shrink-0 h-screen bg-white shadow-md dark:bg-gray-800 flex flex-col items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </aside>
    );
  }


  
  const handleNavigation = (path, value) => {
    // Prevent default navigation
    const allowedPaths = {
      doctor: ['home', 'appointments', 'medical_products','profile',],
      patient: ['home', 'appointments', 'disease', 'profile'],
      admin: ['home', 'reception', 'product', 'department', 'givemedicine', 'profile'],
      supplier: ['home', 'suppproduct', 'orders', 'profile'],
      superadmin: ['dashboard', 'hospitals', 'reports']
    };

    // Validate currentUserType exists and has allowed paths
    if (allowedPaths[currentUserType] && allowedPaths[currentUserType].includes(value)) {
      setActiveTab(value);
      navigate(path);
    } else {
      console.error(`Navigation to ${path} not allowed for ${currentUserType}. Allowed paths: ${allowedPaths[currentUserType]?.join(', ')}`);
    }
  };

  


  // Highlight the item matching the current URL; fall back to the page's activeTab.
  const currentPath = pathname.replace(/\/$/, "");
  const urlMatchesItem = navItems.some((n) => getLinkPath(currentUserType, n.value) === currentPath);

  return (
    <aside className="w-64 shrink-0 h-screen bg-white shadow-md dark:bg-gray-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          HMS {userType.charAt(0).toUpperCase() + userType.slice(1)}
        </h2>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-4 flex-1">
        {navItems.map((item) => {
          const linkPath = getLinkPath(currentUserType, item.value);
          const isActive = urlMatchesItem ? currentPath === linkPath : activeTab === item.value;
          return (
            <div
              key={item.value}
              className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 cursor-pointer ${
                isActive
                  ? "bg-blue-100 dark:bg-blue-900 border-r-4 border-blue-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => handleNavigation(linkPath, item.value)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// Define Prop Types for Validation
Slidebar.propTypes = {
  activeTab: PropTypes.string,
  setActiveTab: PropTypes.func,
  userType: PropTypes.string,
};

export default Slidebar;
