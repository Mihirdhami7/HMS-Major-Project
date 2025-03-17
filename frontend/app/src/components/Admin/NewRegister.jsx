import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Slidebar from "../../pages/Slidebar";

const initialAppointments = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  patientName: ["Jatin Shah", "Mihir Patel", "Aarav Mehta", "Rohan Desai", "Krishna Iyer", "Jatin Sharma", "Rahul Shah", "Pooja Patel", "Jatin Gupta"][i % 9],
  doctorName: ["Dr. Rao", "Dr. Mehta", "Dr. Joshi", "Dr. Shah", "Dr. Desai"][i % 5],
  email: `patient${i + 1}@mail.com`,
  age: 25 + (i % 10),
  address: `Street ${i + 1}, City`,
  status: i % 3 === 0 ? "Completed" : "Pending",
}));

const NewRegister = () => {
  const [activeTab, setActiveTab] = useState("newRegister");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNo: "",
    gender: "Male",
    dateOfBirth: "",
    address: "",
    appointmentDate: "",
    department: "",
    symptoms: "",
    doctorId: "",
    searchQuery: "" // For patient search
  });
  const [mode, setMode] = useState("none"); // none, new, search, appointment
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingPatient, setExistingPatient] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState({
    patientEmail: "",
    patientInfo: null,
    doctorId: "",
    department: "",
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
  });
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const searchPatient = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:8000/api/search-patient/", {
        query: formData.searchQuery
      });

      if (response.data.status === "success") {
        setExistingPatient(response.data.patient);
        setFormData(prev => ({
          ...prev,
          ...response.data.patient
        }));
        setShowAppointmentModal(true);
        setSuccess("Patient found! You can now book an appointment.");
      }
    } catch (err) {
      setError("Patient not found. Please register as a new patient.", err);
    } finally {
      setLoading(false);
    }
  };

  const searchAppointment = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:8000/api/search-appointment/", {
        appointmentId: formData.searchQuery
      });

      if (response.data.status === "success") {
        setSelectedAppointment(response.data.appointment);
        setSuccess("Appointment found!");
      }
    } catch (err) {
      setError("No appointment found with this ID");
      setSelectedAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8000/api/verify-appointment/", {
        appointmentId
      });

      if (response.data.status === "success") {
        setSuccess("Appointment verified and sent to doctor!");
        setSelectedAppointment(null);
        setFormData(prev => ({ ...prev, searchQuery: "" }));
      }
    } catch (err) {
      setError("Failed to verify appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "new") {
        const response = await axios.post("http://localhost:8000/api/add-patient/", {
          ...formData,
          userType: "Patient"
        });
        
        if (response.data.status === "success") {
          setSuccess("Patient registered successfully!");
          setFormData({ // Reset form
            name: "",
            email: "",
            contactNo: "",
            gender: "Male",
            dateOfBirth: "",
            address: "",
            appointmentDate: "",
            department: "",
            symptoms: "",
            doctorId: "",
            searchQuery: ""
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAppointment = () => {
    setShowNewAppointmentDialog(true);
  };

  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "General Medicine"
  ];

  const fetchPatientInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8000/api/get-patient-by-email/", {
        email: newAppointmentData.patientEmail
      });

      if (response.data.status === "success") {
        setNewAppointmentData(prev => ({
          ...prev,
          patientInfo: response.data.patient
        }));
        setError("");
      }
    } catch (err) {
      setError("Patient not found with this email");
      setNewAppointmentData(prev => ({
        ...prev,
        patientInfo: null
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleNewAppointmentSubmit = async () => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8000/api/create-appointment/", {
        ...newAppointmentData,
        status: "pending"
      });

      if (response.data.status === "success") {
        setSuccess("Appointment created successfully!");
        setShowNewAppointmentDialog(false);
        setNewAppointmentData({
          patientEmail: "",
          patientInfo: null,
          doctorId: "",
          department: "",
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
        });
      }
    } catch (err) {
      setError("Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          handleNavigation(`/admin/${tab}`);
        }} 
        userType="admin" 
      />

      <div className="flex-1 p-8 overflow-auto mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* New Patient Registration Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-6">New Patient Registration</h2>
            <form onSubmit={(e) => { setMode("new"); handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="block mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Contact Number</label>
                <input
                  type="tel"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  rows="3"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {loading ? "Registering..." : "Register Patient"}
              </button>
            </form>
          </div>

          {/* Updated Search Appointment Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-6">Search Appointment</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1">Search by Appointment ID</label>
                <input
                  type="text"
                  name="searchQuery"
                  placeholder="Enter appointment ID"
                  value={formData.searchQuery}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={searchAppointment}
                  disabled={loading}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
                <button
                  onClick={handleNewAppointment}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  New Appointment
                </button>
              </div>
            </div>

            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            {success && <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

            {/* Appointment Details */}
            {selectedAppointment && (
              <div className="mt-6 p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">Appointment Details:</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">ID:</span> {selectedAppointment.id}</p>
                  <p><span className="font-medium">Patient:</span> {selectedAppointment.patientName}</p>
                  <p><span className="font-medium">Date:</span> {new Date(selectedAppointment.appointmentDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Department:</span> {selectedAppointment.department}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded ${
                      selectedAppointment.status === 'verified' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedAppointment.status}
                    </span>
                  </p>
                </div>
                
                {selectedAppointment.status !== 'verified' && (
                  <button
                    onClick={() => handleVerifyAppointment(selectedAppointment.id)}
                    className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Verify & Send to Doctor
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Appointment Dialog */}
      {showNewAppointmentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-blue-600 mb-4">New Appointment</h3>
            
            {/* Patient Email Search */}
            <div className="mb-4">
              <label className="block mb-1">Patient Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newAppointmentData.patientEmail}
                  onChange={(e) => setNewAppointmentData(prev => ({
                    ...prev,
                    patientEmail: e.target.value
                  }))}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter patient email"
                />
                <button
                  onClick={fetchPatientInfo}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Find
                </button>
              </div>
            </div>

            {/* Patient Info Display */}
            {newAppointmentData.patientInfo && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <h4 className="font-semibold mb-2">Patient Information</h4>
                <p>Name: {newAppointmentData.patientInfo.name}</p>
                <p>Contact: {newAppointmentData.patientInfo.contactNo}</p>
              </div>
            )}

            {/* Department Selection */}
            <div className="mb-4">
              <label className="block mb-1">Department</label>
              <select
                value={newAppointmentData.department}
                onChange={(e) => setNewAppointmentData(prev => ({
                  ...prev,
                  department: e.target.value
                }))}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Date and Time Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">Date</label>
                <input
                  type="date"
                  value={newAppointmentData.appointmentDate}
                  onChange={(e) => setNewAppointmentData(prev => ({
                    ...prev,
                    appointmentDate: e.target.value
                  }))}
                  className="w-full p-2 border rounded"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block mb-1">Time</label>
                <input
                  type="time"
                  value={newAppointmentData.appointmentTime}
                  onChange={(e) => setNewAppointmentData(prev => ({
                    ...prev,
                    appointmentTime: e.target.value
                  }))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

            {/* Dialog Actions */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowNewAppointmentDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleNewAppointmentSubmit}
                disabled={loading || !newAppointmentData.patientInfo || !newAppointmentData.department}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                {loading ? "Creating..." : "Create Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRegister; 