import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import { FiUsers, FiActivity, FiCalendar, FiBriefcase, FiTrendingUp, FiClock} from "react-icons/fi";
import { MdLocalHospital, MdOutlineMedicalServices } from "react-icons/md";

function AdminSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  
  useEffect(() => {
    const email = sessionStorage.getItem("email");
   // const userType = sessionStorage.getItem("userType");
    const hospitalName = sessionStorage.getItem("hospitalName");
    
    setUserData({
      name: email?.split("@")[0] || "Admin",
      email: email
    });
    
    // Set hospital info based on hospital name
    if (hospitalName === "Zydus") {
      setHospitalInfo({
        name: "Zydus Hospital",
        address: "Zydus Hospital Rd, Thaltej, Ahmedabad, Gujarat 380054",
        founded: 2007,
        type: "Multispecialty",
        contactNumber: "+91 79 6617 7777",
        website: "www.zydushospitals.com"
      });
    } else {
      setHospitalInfo({
        name: hospitalName || "Hospital Management System",
        address: "Healthcare Avenue, Medical District",
        type: "General Hospital"
      });
    }
  }, []);

  // Real-time stats that would be fetched from backend in production
  const stats = [
    { label: "Total Patients", value: "100+", icon: <FiUsers />, color: "blue", change: "+12% ↑" },
    { label: "Active Doctors", value: "35+", icon: <FiActivity />, color: "green", change: "+3% ↑" },
    { label: "Today's Appointments", value: "50+", icon: <FiCalendar />, color: "blue", change: "+7% ↑" },
    { label: "Departments", value: "5+", icon: <FiBriefcase />, color: "green", change: "" }
  ];

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />
      <div className="flex-1 p-8 mt-16">
        <Routes>
  
          <Route path="*" element={
            <div>
              {/* Welcome Banner with Hospital Info */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl p-8 text-white mb-8 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      Welcome, {userData?.name}! <span className="ml-2">👋</span>
                    </h1>
                    <p className="text-lg opacity-90 mb-3">
                      {hospitalInfo?.name} Administration Portal
                    </p>
                    {hospitalInfo && hospitalInfo.name === "Zydus Hospital" && (
                      <div className="mt-2 text-white/80 text-sm space-y-1">
                        <p><span className="font-semibold">Address:</span> {hospitalInfo.address}</p>
                        <p><span className="font-semibold">Contact:</span> {hospitalInfo.contactNumber}</p>
                        <p><span className="font-semibold">Established:</span> {hospitalInfo.founded} | <span className="font-semibold">Website:</span> {hospitalInfo.website}</p>
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center space-x-3 bg-white/10 backdrop-blur-sm py-2 px-4 rounded-lg">
                    <MdLocalHospital className="text-3xl" />
                    <div>
                      <p className="font-semibold">System Status</p>
                      <p className="text-sm text-green-200">All Systems Operational</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg border-l-4 border-l-blue-500">
                    <div className="flex justify-between">
                      <div className={`text-${stat.color}-500 text-2xl mb-2 bg-${stat.color}-50 p-3 rounded-lg`}>
                        {stat.icon}
                      </div>
                      {stat.change && (
                        <span className="text-green-500 text-sm font-semibold">{stat.change}</span>
                      )}
                    </div>
                    <div className="text-3xl font-bold text-gray-800 my-2">
                      {stat.value}
                    </div>
                    <div className="text-gray-500 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hospital Overview & Critical Alerts */}
              <div className=" mb-8">
                <div className="bg-white rounded-xl shadow-md p-6 md:col-span-2">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <MdOutlineMedicalServices className="text-blue-500 mr-2" /> Hospital Overview
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-700 font-medium">Patient Satisfaction</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-2xl font-bold text-gray-800">92%</span>
                        <span className="text-green-500 text-sm">↑ 5%</span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-700 font-medium">Average Wait Time</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-2xl font-bold text-gray-800">14 min</span>
                        <span className="text-red-500 text-sm">↑ 2 min</span>
                      </div>
                    </div>
                    
                  
                  </div>
                </div>

              
              </div>

              {/* Recent Activities & System Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FiClock className="text-blue-500 mr-2" /> Recent Activities
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center p-3 border-b border-gray-100">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-gray-800 font-medium">Dr. Patel added to Cardiology</p>
                        <p className="text-gray-500 text-sm">Today, 10:45 AM</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 border-b border-gray-100">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-gray-800 font-medium">Updated emergency protocols</p>
                        <p className="text-gray-500 text-sm">Yesterday, 3:30 PM</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 border-b border-gray-100">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-gray-800 font-medium">New equipment received - Radiology</p>
                        <p className="text-gray-500 text-sm">Yesterday, 11:15 AM</p>
                      </div>
                    </div>
                    

                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FiTrendingUp className="text-green-500 mr-2" /> Performance Metrics
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-medium">System Health</span>
                      <span className="text-green-500 font-medium">98%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-medium">Patient Records Accuracy</span>
                      <span className="text-green-500 font-medium">99.7%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.7%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-medium">Server Uptime</span>
                      <span className="text-green-500 font-medium">99.9%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-medium">Staff Efficiency</span>
                      <span className="text-blue-500 font-medium">87%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }}></div>
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

export default AdminSection;