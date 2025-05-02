import { useState, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Slidebar from "../pages/Slidebar";
import Appointment from "../components/Patients/Appointments";
import Disease from "../components/Patients/Disease";


function PatientSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    // Get user data from localStorage
    const email = localStorage.getItem("userEmail");
    const userType = localStorage.getItem("userType");
    
    // In a real app, you'd fetch this from your API
    setUserData({
      name: "Patient",
      email: email,
      type: userType
    });
  }, []);



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
                <button 
                  className="mt-4 text-blue-500 hover:text-blue-600"
                  onClick={() => navigate("/patient/appointments")}
                >
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

             {/* EasyTreat Information Section */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">About EasyTreat</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-semibold text-blue-500 mb-2">What is EasyTreat?</h3>
                <p className="text-gray-600">
                  EasyTreat is your one-stop solution for managing your health. From booking appointments to accessing medical records, EasyTreat makes healthcare simple and accessible.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-semibold text-green-500 mb-2">Why Choose EasyTreat?</h3>
                <p className="text-gray-600">
                  With EasyTreat, you can enjoy seamless healthcare services, personalized health insights, and exclusive offers tailored to your needs.
                </p>
              </div>
            </div>

            {/* Features of EasyTreat */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Features of EasyTreat</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-semibold text-blue-500 mb-2">24/7 Appointment Booking</h3>
                <p className="text-gray-600">
                  Book appointments with top specialists anytime, anywhere.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-semibold text-blue-500 mb-2">Personalized Health Insights</h3>
                <p className="text-gray-600">
                  Get tailored health tips and recommendations .
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-semibold text-green-500 mb-2">Secure Medical Records</h3>
                <p className="text-gray-600">
                  Access and manage your medical records securely with just a few clicks.
                </p>
              </div>
             
            </div>

           
          </div>
        } />
        </Routes>
      </div>
    </div>
  );
}

export default PatientSection;
