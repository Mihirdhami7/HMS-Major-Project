import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import DoctorAppointments from "../components/Doctors/Dappointments";
import Prescription from "../components/Doctors/Prescription";
import axios from "axios";

function DoctorSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null); // Store doctor information
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const email = sessionStorage.getItem("email");
    const userType = sessionStorage.getItem("userType");

    setUserData({
      name: email?.split("@")[0] || "Doctor",
      email: email,
      type: userType
    });
    fetchDoctorInfo(email);
  }, []);

  const fetchDoctorInfo = async (email) => {
    try {
      const hospitalName = sessionStorage.getItem("hospitalName");
      if (!email || !hospitalName) {
        setError("User email or hospital name not found in session storage.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const response = await axios.post("http://localhost:8000/api/get_doctor_by_email/", {
        email: email,
        hospitalName: hospitalName
      });

      if (response.data.status === "success") {
        setDoctorInfo(response.data.doctor);
      } else {
        setError(response.data.message || "Failed to fetch doctor information.");
      }
    } catch (err) {
      console.error("Error fetching doctor information:", err);
      setError("Failed to connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="doctor" />
      <div className="flex-1 p-8 mt-16">
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

              {/* Doctor Information */}
              {loading ? (
                <div className="w-full flex justify-center my-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <p>{error}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Doctor Details */}
                  <div className="bg-gradient-to-r from-blue-100 to-green-100 p-6 rounded-lg shadow-lg">
                    <h3 className="text-2xl font-bold text-blue-700 mb-4">Doctor Information</h3>
                    <p className="text-gray-700"><strong>Name:</strong> {doctorInfo?.name}</p>
                    <p className="text-gray-700"><strong>Email:</strong> {doctorInfo?.email}</p>
                    <p className="text-gray-700"><strong>Contact:</strong> {doctorInfo?.contectNo}</p>
                    <p className="text-gray-700"><strong>Description:</strong> {doctorInfo?.Description}</p>
                    <p className="text-gray-700"><strong>Hospital:</strong> {doctorInfo?.Hospital}</p>
                  </div>
                <div className="space-y-3">
                  {/* Ratings */}
                  <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg shadow-lg">
                    <h3 className="text-2xl font-bold text-green-700 mb-4">Ratings</h3>
                    <h1 className="text-4xl font-bold text-gray-800">{doctorInfo?.rating || "N/A"} / 5</h1>
                  </div>

          
                </div>

                </div>
              )}
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default DoctorSection;