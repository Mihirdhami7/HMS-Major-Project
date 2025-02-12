import Link from "next/link";
import { FiHome, FiUsers, FiUserPlus, FiFileText, FiCalendar, FiUser, FiPackage } from "react-icons/fi";
import PropTypes from "prop-types";

const sidebars = {
  admin: [
    { icon: FiHome, label: "Dashboard", value: "dashboard" },
    { icon: FiUserPlus, label: "Doctors", value: "doctors" },
    { icon: FiUsers, label: "Departments", value: "departments" },
    { icon: FiFileText, label: "Reports", value: "reports" },
  ],
  doctor: [
    { icon: FiCalendar, label: "Appointments", value: "appointments" },
    { icon: FiUser, label: "Profiles", value: "profiles" },
    { icon: FiPackage, label: "Medical Products", value: "medical_products" },
  ],
  patient: [
    { icon: FiCalendar, label: "Appointments", value: "appointments" },
    { icon: FiFileText, label: "Brief Disease", value: "brief_disease" },
    { icon: FiUser, label: "Profiles", value: "profiles" },
  ],
};

function Sidebar({ activeTab, setActiveTab, userType }) {
  return (
    <aside className="w-64 bg-white shadow-md dark:bg-gray-800">
      <div className="p-4">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">HMS {userType.charAt(0).toUpperCase() + userType.slice(1)}</h2>
      </div>
      <nav className="mt-8">
        {sidebars[userType]?.map((item) => (
          <Link
            key={item.value}
            href="#"
            className={`flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 ${
              activeTab === item.value
                ? "bg-blue-100 dark:bg-blue-900 border-r-4 border-blue-600"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab(item.value)}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

Sidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  userType: PropTypes.oneOf(["admin", "doctor", "patient"]).isRequired,
};

export default Sidebar;
