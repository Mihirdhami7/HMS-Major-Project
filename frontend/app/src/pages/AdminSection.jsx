import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import Dashboard from "../components/Admin/Dashboard";
import NewRegister from "../components/Admin/NewRegister";
import { FiUsers, FiActivity, FiBarChart2, FiSettings } from "react-icons/fi";

function AdminSection() {
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
    { label: "Total Users", value: "1,234", icon: <FiUsers />, color: "blue" },
    { label: "Active Doctors", value: "45", icon: <FiActivity />, color: "green" },
    { label: "Appointments", value: "89", icon: <FiBarChart2 />, color: "blue" },
    { label: "Departments", value: "8", icon: <FiSettings />, color: "green" }
  ];

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />
      <div className="flex-1 p-8 mt-16">
        <Routes>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/newRegister" element={<NewRegister />} />
          <Route path="*" element={
            <div>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-8 text-white mb-8">
                <h1 className="text-4xl font-bold mb-2">
                  Welcome Back, {userData?.name}! 🚀
                </h1>
                <p className="text-lg opacity-90">
                  Here&apos;s what&apos;s happening in your hospital today
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                    <div className={`text-${stat.color}-500 text-2xl mb-2`}>
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {stat.value}
                    </div>
                    <div className="text-gray-600">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Recent Activities
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      New doctor registration
                    </div>
                    <div className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Updated department schedule
                    </div>
                    <div className="flex items-center text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      New appointment request
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    System Status
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">System Health</span>
                      <span className="text-green-500">Excellent</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Last Backup</span>
                      <span className="text-blue-500">2 hours ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Server Status</span>
                      <span className="text-green-500">Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Updates */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  System Updates
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800">New Features Released</h3>
                    <p className="text-gray-600">Enhanced appointment scheduling system</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800">Maintenance Schedule</h3>
                    <p className="text-gray-600">System maintenance scheduled for next week</p>
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

export default AdminSection;
