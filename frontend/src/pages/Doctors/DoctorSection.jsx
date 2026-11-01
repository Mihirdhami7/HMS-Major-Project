import { useState, useEffect } from "react";
import Slidebar from "../../components/Sidebar";
import { getUserProfile } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

function DoctorSection() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await getUserProfile(token);
      if (cancelled) return;
      if (result.success) {
        setUserData(result.data?.user || null);
        setError(null);
      } else {
        setError(result.message || "Failed to fetch user profile");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-8 mt-16">
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
                <p className="text-gray-700"><strong>Name:</strong> {userData.name}</p>
                <p className="text-gray-700"><strong>Email:</strong> {userData.email}</p>
                <p className="text-gray-700"><strong>Contact:</strong> {userData.contactNo || "N/A"}</p>
                <p className="text-gray-700"><strong>Specialization:</strong> {userData.doctorSpecialization || "N/A"}</p>
                <p className="text-gray-700"><strong>Qualification:</strong> {userData.doctorQualification || "N/A"}</p>
                <p className="text-gray-700"><strong>Hospital:</strong> {userData.hospitalName || "N/A"}</p>
              </div>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg shadow-lg">
                  <h3 className="text-2xl font-bold text-green-700 mb-4">Status</h3>
                  <p className="text-gray-700"><strong>Account Status:</strong> {userData.is_active ? "Active" : "Inactive"}</p>
                  <p className="text-gray-700"><strong>Approval:</strong> {userData.isApproved ? "Approved" : "Pending approval"}</p>
                  <p className="text-gray-700"><strong>User Type:</strong> {userData.userType || "Doctor"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No user data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorSection;
