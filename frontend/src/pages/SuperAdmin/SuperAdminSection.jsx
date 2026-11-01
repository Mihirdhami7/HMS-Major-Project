import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { SystemOverview } from "./AdminDashboard";

function SuperAdminSection() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const displayName = user?.name || user?.email?.split("@")[0] || "Super Admin";

  return (
    <div className="flex bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="superadmin" />
      <div className="flex-1 p-8 mt-16">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-8 text-white mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome Back, {displayName}! 🚀</h1>
          <p className="text-lg opacity-90">Monitor and manage all hospital activities efficiently.</p>
        </div>

        {/* Real counts from the backend */}
        <div className="mb-8">
          <SystemOverview token={token} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Administrative Actions</h2>
          <div className="space-y-4">
            <Link to="/superadmin/hospitals" className="flex items-center text-gray-600 hover:text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Add or manage hospitals
            </Link>
            <Link to="/superadmin/dashboard" className="flex items-center text-gray-600 hover:text-blue-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              View system dashboard
            </Link>
            <Link to="/superadmin/reports" className="flex items-center text-gray-600 hover:text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              View system reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminSection;
