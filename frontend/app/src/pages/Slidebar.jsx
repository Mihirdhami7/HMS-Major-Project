import { useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiUserPlus, FiFileText, FiCalendar, FiUser, FiPackage} from "react-icons/fi";
import PropTypes from "prop-types";


// Sidebar Navigation Items for Different User Types
const slidebars = {
  admin: [
    { icon: FiHome, label: "Dashboard", value: "dashboard" },
    { icon: FiUserPlus, label: "New Register", value: "newRegister" },
    { icon: FiUserPlus, label: "Products", value: "product" },
    { icon: FiUsers, label: "Departments", value: "department" }, 
    { icon: FiUsers, label: "GiveMedicine", value: "givemedicine" }, 
    { icon: FiFileText, label: "Reports", value: "reports" },
  ],
  doctor: [
    { icon: FiCalendar, label: "Appointments", value: "appointments" },
    { icon: FiUser, label: "Profile", value: "profile" },
    { icon: FiPackage, label: "Medical Products", value: "medical_products" },
  ],
  patient: [
    { icon: FiCalendar, label: "Appointments", value: "appointments" },
    { icon: FiFileText, label: "Disease", value: "disease" },
    { icon: FiUser, label: "Profile", value: "profile" },
  ],
  supplier: [
    { icon: FiCalendar, label: "Dashboard", value: "suppdashboard" },
    { icon: FiFileText, label: "Products", value: "suppproduct" },
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
  // Special case for profile links
  if (value === "profile") {
    const userEmail = sessionStorage.getItem("userEmail");
    const storedUserType = sessionStorage.getItem("userType");
    return `/${storedUserType}/profile/${userEmail}`;
  }
  return `/${userType}/${value}`;
};


function Slidebar({ activeTab = "dashboard", setActiveTab = () => {} }) {
  const userType = sessionStorage.getItem("userType") || "patient";
  const navigate = useNavigate();
  const navItems = slidebars[userType] || [];


  
  const handleNavigation = (path, value) => {
    // Prevent default navigation
    const allowedPaths = {
      doctor: ['appointments', 'profile', 'medical_products'],
      patient: ['appointments', 'disease', 'profile'],
      admin: ['dashboard', 'newRegister', 'product', 'department', 'reports','givemedicine'],
      supplier: ['suppdashboard', 'suppproduct'],
      superadmin: ['dashboard', 'hospitals', 'reports']
    };

    if (allowedPaths[userType]?.includes(value)) {
      setActiveTab(value);
      navigate(path);
    } else {
      console.log(`Navigation to ${path} not allowed for ${userType}`);
    }
  };

  


  return (
    <aside className="w-64 h-screen bg-white shadow-md dark:bg-gray-800 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          HMS {userType.charAt(0).toUpperCase() + userType.slice(1)}
        </h2>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-4 flex-1">
        {navItems.map((item) => {
          const linkPath = getLinkPath(userType, item.value);
          return (
            <div
              key={item.value}
              className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 cursor-pointer ${
                activeTab === item.value
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
};

export default Slidebar;
