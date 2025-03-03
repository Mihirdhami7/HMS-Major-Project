import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import DoctorAppointments from "../components/Doctors/Dappointments";
import Prescription from "../components/Doctors/Prescription";
import { FiUsers, FiClock, FiAward } from "react-icons/fi";

function DoctorSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    const userType = localStorage.getItem("userType");
    
    setUserData({
      name: email?.split("@")[0] || "Doctor",
      email: email,
      type: userType
    });
  }, []);

  const stats = [
    { label: "Total Patients", value: "150+", icon: <FiUsers className="w-6 h-6" /> },
    { label: "Experience", value: "5+ Years", icon: <FiClock className="w-6 h-6" /> },
    { label: "Rating", value: "4.8/5", icon: <FiAward className="w-6 h-6" /> },
  ];

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="doctor" />
      <div className="flex-1 p-8">
        <Routes>
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/appointments/prescription" element={<Prescription />} />
          <Route path="*" element={
            <div>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-8 text-white mb-8">
                <h1 className="text-4xl font-bold mb-2">
                  Welcome Dr. {userData?.name}! 👨‍⚕️
                </h1>
                <p className="text-lg opacity-90">
                  Your dedication to patient care makes a difference every day.
                </p>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-blue-500">
                        {stat.icon}
                      </div>
                      <span className="text-2xl font-bold text-gray-800">
                        {stat.value}
                      </span>
                    </div>
                    <h3 className="text-gray-600">{stat.label}</h3>
                  </div>
                ))}
              </div>

              {/* Today's Schedule */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Today&apos;s Schedule</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-800">Morning Session</h3>
                      <p className="text-gray-600">09:00 AM - 01:00 PM</p>
                    </div>
                    <span className="text-blue-500">4 Appointments</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-800">Evening Session</h3>
                      <p className="text-gray-600">05:00 PM - 09:00 PM</p>
                    </div>
                    <span className="text-green-500">3 Appointments</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Patients</h3>
                  <p className="text-gray-600">View and manage your recent patient consultations</p>
                  <button className="mt-4 text-blue-500 hover:text-blue-600">
                    View All Patients →
                  </button>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Medical Resources</h3>
                  <p className="text-gray-600">Access the latest medical journals and research</p>
                  <button className="mt-4 text-green-500 hover:text-green-600">
                    Browse Resources →
                  </button>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default DoctorSection;
