import { useState, useEffect } from "react";
import Slidebar from "../../pages/Slidebar";
import { FiCheckCircle, FiEdit3, FiCalendar, FiClock } from "react-icons/fi";
import { IoDocumentTextOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function DoctorAppointments() {
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appointments");

  // Fetch doctor's appointments on component mount
  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  const fetchDoctorAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get doctor email from session storage
      const email = sessionStorage.getItem("email");
      const hospitalName = sessionStorage.getItem("hospitalName");
      
      if (!email) {
        setError("Doctor email not found. Please log in again.");
        setLoading(false);
        return;
      }
      if (!hospitalName) {
        setError("Hospital name not found. Please log in again.");
        setLoading(false);
        return;
      }
      
      const response = await axios.post("http://localhost:8000/api/get_doctor_appointments/", {
        email: email,
        hospitalName: hospitalName
      });
      
      if (response.data.status === "success") {
        const allAppointments = response.data.appointments || [];

        const approved = allAppointments.filter((appt) => appt.status === "approve");
        const completed = allAppointments.filter((appt) => appt.status === "completed");
        setApprovedAppointments(approved);
        setCompletedAppointments(completed);
      } else {
        setError(response.data.message || "Failed to fetch appointments");
      } 
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };



  // Navigate to Prescription Page
  const openPrescriptionPage = (appointment) => {
    navigate("/doctor/appointments/prescription", { state: { appointment } });
  };

  // Get today's date for highlighting today's appointments
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar userType="doctor" activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-col flex-1 p-8 overflow-auto">
        <h2 className="text-3xl font-bold mb-6 text-blue-800">Pending Appointments</h2>

        {loading && (
          <div className="w-full flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}

        {/* First Div: Approved Appointments */}
        {!loading && !error && (
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-6 text-blue-800">Pending Appointments</h2>
            
            {approvedAppointments.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-semibold mb-2 text-gray-600">No Pending Appointments</h3>
                <p className="text-gray-500">You dont have any appointments that need prescriptions.</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-blue-700">Appointments Requiring Prescription</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left">Patient Name</th>
                        <th className="border p-3 text-left">Patient Email</th>
                        <th className="border p-3 text-left">Date</th>
                        <th className="border p-3 text-left">Time</th>
                        <th className="border p-3 text-left">Symptoms</th>
                        <th className="border p-3 text-left">Status</th>
                        <th className="border p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedAppointments.map((appt) => (
                        <tr key={appt._id} className={`hover:bg-blue-50 transition-colors ${appt.appointmentDate === today ? 'bg-green-50' : ''}`}>
                          <td className="border p-3">
                            <div className="text-xs text-gray-500">{appt.patientName}</div>
                          </td>
                          <td className="border p-3">
                            <div className="text-xs text-gray-500">{appt.patientEmail}</div>
                          </td>
                          <td className="border p-3">
                            <div className="flex items-center">
                              <FiCalendar className="mr-2 text-blue-500" />
                              {appt.appointmentDate}
                            </div>
                          </td>
                          <td className="border p-3">
                            <div className="flex items-center">
                              <FiClock className="mr-2 text-blue-500" />
                              {appt.confrimedTime}
                            </div>
                          </td>
                    
                          <td className="border p-3">
                            <div className="max-w-xs truncate">
                              {appt.symptoms || "No symptoms provided"}
                            </div>
                          </td>
                          <td className="border p-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending Prescription
                            </span>
                          </td>
                          <td className="border p-3">
                            <button 
                              onClick={() => openPrescriptionPage(appt)}
                              className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              <FiEdit3 className="mr-1" /> Write Prescription
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Second Div: Completed Appointments */}
        {!loading && !error && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-green-800">Completed Appointments</h2>
            
            {completedAppointments.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-semibold mb-2 text-gray-600">No Completed Appointments</h3>
                <p className="text-gray-500">You dont have any completed appointments with prescriptions.</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-green-700">Appointments With Prescriptions</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left">Patient name</th>
                        <th className="border p-3 text-left">Patient Email</th>
                        <th className="border p-3 text-left">Symptoms</th>
                        <th className="border p-3 text-left">Status</th>
                        <th className="border p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedAppointments.map((appt) => (
                        <tr key={appt._id} className="hover:bg-green-50 transition-colors">
                          <td className="border p-3">
                            <div className="text-xs text-gray-500">{appt.patientName}</div>
                          </td>
                          <td className="border p-3">
                            <div className="text-xs text-gray-500">{appt.patientEmail}</div>
                          </td>
                          <td className="border p-3">
                            <div className="text-xs text-gray-500">{appt.symptoms}</div>
                          </td>
                          <td className="border p-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FiCheckCircle className="mr-1" /> Completed
                            </span>
                          </td>
                          <td className="border p-3">
                            <button 
                              onClick={() => openPrescriptionPage(appt)}
                              className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              <IoDocumentTextOutline className="mr-1" /> View Prescription
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorAppointments;