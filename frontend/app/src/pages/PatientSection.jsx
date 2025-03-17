import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "../pages/Slidebar";
import Appointment from "../components/Patients/Appointments";
import Disease from "../components/Patients/Disease";
import { FiCalendar, FiActivity } from "react-icons/fi";

function PatientSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get user data from localStorage
    const email = localStorage.getItem("userEmail");
    const userType = localStorage.getItem("userType");
    
    // In a real app, you'd fetch this from your API
    setUserData({
      name: email?.split("@")[0] || "User",
      email: email,
      type: userType
    });
  }, []);

  const promotions = [
    {
      title: "Health Checkup",
      description: "Complete body checkup starting at $99. Book now and get 20% off!",
      icon: <FiActivity className="w-8 h-8 text-green-500" />
    },
    {
      title: "Upcoming Features",
      description: "Stay tuned for our new mobile app and 24/7 emergency support!",
      icon: <FiCalendar className="w-8 h-8 text-blue-500" />
    }
  ];

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />
      <div className="flex-1 p-8 mt-16">
        <Routes>
          <Route path="/patient/appointments" element={<Appointment />} />
          {/* <Route path="/patient/profiles" element={<Profiles />} /> */}
          <Route path="/patient/disease" element={<Disease />} />
          <Route path="*" element={
            <div>
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-lg p-8 text-white mb-8">
                <h1 className="text-4xl font-bold mb-2">
                  Welcome back, {userData?.name}! 👋
                </h1>
                <p className="text-lg opacity-90">
                  Your health is our priority. How can we help you today?
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-gray-800">Next Appointment</h3>
                  <p className="text-gray-600">No upcoming appointments</p>
                  <button className="mt-4 text-blue-500 hover:text-blue-600">
                    Schedule Now →
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-gray-800">Health Tips</h3>
                  <p className="text-gray-600">Daily health recommendations</p>
                  <button className="mt-4 text-blue-500 hover:text-blue-600">
                    Learn More →
                  </button>
                </div>
              </div>

              {/* Promotions */}
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Special Offers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {promotions.map((promo, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                    <div className="mb-4">
                      {promo.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {promo.title}
                    </h3>
                    <p className="text-gray-600">
                      {promo.description}
                    </p>
                    <button className="mt-4 text-blue-500 hover:text-blue-600">
                      Learn More →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default PatientSection;
