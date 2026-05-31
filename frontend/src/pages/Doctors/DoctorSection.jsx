import { useState, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Slidebar from "../../components/Sidebar";
import DoctorAppointments from "./DoctorAppointments";
import Prescription from "./Prescription";
import { getUserProfile } from "../../services/userService";
import { getToken } from "../../services/authService";

function DoctorSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        setError("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      const result = await getUserProfile(token);
      
      if (result.success) {
        setUserData(result.data);
        setError(null);
      } else {
        if (result.status === 401) {
          navigate("/login");
        }
        setError(result.error || "Failed to fetch user profile");
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to fetch user information");
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
              ) : userData ? (
                <div className="space-y-6">
                  {/* Doctor Details */}
                  <div className="bg-gradient-to-r from-blue-100 to-green-100 p-6 rounded-lg shadow-lg">
                    <h3 className="text-2xl font-bold text-blue-700 mb-4">Doctor Information</h3>
                    <p className="text-gray-700"><strong>Name:</strong> {userData?.name}</p>
                    <p className="text-gray-700"><strong>Email:</strong> {userData?.email}</p>
                    <p className="text-gray-700"><strong>Contact:</strong> {userData?.contactNo || "N/A"}</p>
                    <p className="text-gray-700"><strong>Specialization:</strong> {userData?.doctorSpecialization || "N/A"}</p>
                    <p className="text-gray-700"><strong>Qualification:</strong> {userData?.doctorQualification || "N/A"}</p>
                    <p className="text-gray-700"><strong>Hospital:</strong> {userData?.hospitalName || "N/A"}</p>
                  </div>
                  <div className="space-y-3">
                    {/* Quick Stats */}
                    <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg shadow-lg">
                      <h3 className="text-2xl font-bold text-green-700 mb-4">Status</h3>
                      <p className="text-gray-700"><strong>Account Status:</strong> {userData?.is_active ? "Active" : "Inactive"}</p>
                      <p className="text-gray-700"><strong>User Type:</strong> {userData?.userType || "Doctor"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  No user data available
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