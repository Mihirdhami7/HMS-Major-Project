import PropTypes from "prop-types"
import Link from "react-router-dom"
import { FiHome, FiCalendar, FiUsers, FiUserPlus, FiSettings } from "react-icons/fi"

const menuItems = [
  { icon: FiHome, label: "Dashboard", value: "dashboard" },
  { icon: FiCalendar, label: "Appointments", value: "appointments" },
  { icon: FiUsers, label: "Patients", value: "patients" },
  { icon: FiUserPlus, label: "Doctors", value: "doctors" },
  { icon: FiSettings, label: "Settings", value: "settings" },
]

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 bg-white shadow-md dark:bg-gray-800">
      <div className="p-4">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">HMS Admin</h2>
      </div>
      <nav className="mt-8">
        {menuItems.map((item) => (
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
  )
}
Sidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

