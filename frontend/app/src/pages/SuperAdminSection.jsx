import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import Dashboard from "../components/SuperAdmin/AdminDashborad";
import Hospitals from "../components/SuperAdmin/Hospital";
import Reports from "../components/SuperAdmin/Reports";
import { FiUsers, FiBarChart2, FiHome, FiBriefcase } from "react-icons/fi";

function SuperAdminSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    setUserData({
      name: email?.split("@")[0] || "Admin",
      email: email
    });
  }, []);

  const stats = [
    { label: "Total Hospitals", value: "12", icon: <FiHome />, color: "blue" },
    { label: "Total Patients", value: "4,567", icon: <FiUsers />, color: "green" },
    { label: "Total Doctors", value: "345", icon: <FiBriefcase />, color: "blue" },
    { label: "Total Appointments", value: "678", icon: <FiBarChart2 />, color: "green" }
  ];

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="superadmin" />
      <div className="flex-1 p-8 mt-16">
        <Routes>
            <Route path="/superadmin/dashboard" element={<Dashboard />} />
            <Route path="/superadmin/hospitals" element={<Hospitals />} />
            <Route path="/superadmin/reports" element={<Reports />} />
            
            <Route path="*" element={
            <div>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-8 text-white mb-8">
                <h1 className="text-4xl font-bold mb-2">
                  Welcome Back, {userData?.name}! 🚀
                </h1>
                <p className="text-lg opacity-90">
                  Monitor and manage all hospital activities efficiently.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                    <div className={`text-${stat.color}-500 text-2xl mb-2`}>{stat.icon}</div>
                    <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Administrative Actions</h2>
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Add new hospital
                    </div>
                    <div className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Review new doctor applications
                    </div>
                    <div className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      View system reports
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">System Overview</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">System Health</span>
                      <span className="text-green-500">Stable</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Hospitals</span>
                      <span className="text-blue-500">{stats[0].value}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Patients</span>
                      <span className="text-green-500">{stats[1].value}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default SuperAdminSection;