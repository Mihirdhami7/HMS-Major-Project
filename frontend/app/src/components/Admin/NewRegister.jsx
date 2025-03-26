import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Slidebar from "../../pages/Slidebar";

const NewRegister = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("newRegister");
  
  // Patient Registration State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNo: "",
    gender: "Male",
    dateOfBirth: "",
    address: "",
    bloodGroup: "",
    height: "",
    weight: "",
    searchQuery: "" // For appointment search
  });
  
  // Appointment Management State
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedPendingAppointment, setSelectedPendingAppointment] = useState(null);
  const [acceptPatientTime, setAcceptPatientTime] = useState(true);
  const [adminTimeSlot, setAdminTimeSlot] = useState("");
  
  // Appointment Search State
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
// Add new variables
  const [acceptPatientDate, setAcceptPatientDate] = useState(true);
  const [adminDateSlot, setAdminDateSlot] = useState("");
  
  // New Appointment Dialog State
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState({
    patientEmail: "",
    patientInfo: null,
    department: "",
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
  });
  
  // General State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Departments List
  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "General Medicine",
  ];

  // Fetch pending appointments on component mount
  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  // Navigation Handler
  const handleNavigation = (path) => {
    navigate(path);
  };

  // ==== 1. PATIENT REGISTRATION FUNCTIONS ====
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("http://localhost:8000/api/add_patient/", {
        ...formData,
        userType: "Patient"
      });
      
      if (response.data.status === "success") {
        setSuccess("Patient registered successfully!");
        // Reset form
        setFormData({
          name: "",
          email: "",
          contactNo: "",
          gender: "Male",
          dateOfBirth: "",
          address: "",
        });
      } else {
        setError(response.data.message || "Registration failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong with registration");
    } finally {
      setLoading(false);
    }
  };

  // ==== 2. PENDING APPOINTMENTS FUNCTIONS ====
  
  const fetchPendingAppointments = async () => {
    try {
      setIsLoadingPending(true);
      setError("");
      
      const response = await axios.get("http://localhost:8000/api/get_pending_appointment/");
      
      if (response.data.status === "success") {
        setPendingAppointments(response.data.appointments);
        console.log("Pending appointments:", response.data.appointments);
      } else {
        console.log("Failed to fetch pending appointments:", response.data.message);
        setError("Failed to fetch pending appointments");
      }
    } catch (err) {
      console.error("Error fetching pending appointments:", err);
      // Don't set error here to avoid affecting other operations
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleApproveAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      setError("");
      
      let requestData = {
        appointmentId: appointmentId,
        acceptPatientTime,
        acceptPatientDate
      };
      
      // If admin chooses a different time, include it in the request
      if (!acceptPatientTime && adminTimeSlot) {
        requestData.timeSlot = adminTimeSlot;
      }
      if (!acceptPatientDate && adminDateSlot) {
        requestData.dateSlot = adminDateSlot;
      }
      
      const response = await axios.post("http://localhost:8000/api/approve-appointment/", requestData);
      
      if (response.data.status === "success") {
        setSuccess("Appointment approved successfully!");
        setSelectedPendingAppointment(null);
        setAdminTimeSlot("");
        setAdminDateSlot("");
        setAcceptPatientTime(true);
        setAcceptPatientDate(true);
        
        // Refresh the pending appointments list
        fetchPendingAppointments();
      } else {
        setError(response.data.message || "Failed to approve appointment");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve appointment");
    } finally {
      setLoading(false);
    }
  };

  // ==== 3. APPOINTMENT SEARCH FUNCTIONS ====
  
  const searchAppointment = async () => {
    if (!formData.searchQuery) {
      setError("Please enter an appointment ID or patient email to search");
      return;
    }
    
    try {
      setIsSearching(true);
      setError("");
      setSearchResults([]);
      
      const response = await axios.post("http://localhost:8000/api/search_appointment/", {
        query: formData.searchQuery
      });
      
      if (response.data.status === "success") {
        // If a single appointment is returned
        if (response.data.appointment) {
          setSelectedAppointment(response.data.appointment);
          setSearchResults([response.data.appointment]);
          setSuccess("Appointment found!");
        } 
        // If multiple appointments are returned
        else if (response.data.appointments && response.data.appointments.length > 0) {
          setSearchResults(response.data.appointments);
          setSelectedAppointment(null);
          setSuccess(`${response.data.appointments.length} appointments found`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "No appointments found");
      setSelectedAppointment(null);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ==== 4. NEW APPOINTMENT FUNCTIONS ====
  
  const handleNewAppointment = () => {
    setShowNewAppointmentDialog(true);
    setNewAppointmentData({
      patientEmail: "",
      patientInfo: null,
      department: "",
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
    });
  };

  const fetchPatientInfo = async () => {
    if (!newAppointmentData.patientEmail) {
      setError("Please enter patient email");
      return;
    }
    
    try {
      setLoading(true);
      setError("");

      const response = await axios.post("http://localhost:8000/api/get-patient-by-email/", {
        email: newAppointmentData.patientEmail
      });

      if (response.data.status === "success") {
        setNewAppointmentData(prev => ({
          ...prev,
          patientInfo: response.data.patient
        }));
        setSuccess("Patient found!");
      }
    } catch (err) {
      setError("Patient not found with this email",err);
      setNewAppointmentData(prev => ({
        ...prev,
        patientInfo: null
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleNewAppointmentSubmit = async () => {
    if (!newAppointmentData.patientInfo || !newAppointmentData.department || 
        !newAppointmentData.appointmentDate || !newAppointmentData.appointmentTime ) {
      setError("All fields are required");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:8000/api/create-appointment/", {
        patientEmail: newAppointmentData.patientEmail,
        department: newAppointmentData.department,
        appointmentDate: newAppointmentData.appointmentDate,
        appointmentTime: newAppointmentData.appointmentTime,
        doctorEmail: newAppointmentData.patientInfo.doctorEmail,
        symptoms: newAppointmentData.patientInfo.symptoms
      });

      if (response.data.status === "success") {
        setSuccess("Appointment created successfully!");
      // Close the dialog and reset form
      setTimeout(() => {
        setShowNewAppointmentDialog(false);
        setNewAppointmentData({
          patientEmail: "",
          patientInfo: null,
          department: "",
          doctorEmail: "",
          symptoms: "",
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
        });
        setSuccess("");
      }, 1500);
    } else {
        setError(response.data.message || "Failed to create appointment");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  // ==== RENDER UI ====
  
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
          {/* Left Panel: New Patient Registration Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-6">New Patient Registration</h2>
            <form onSubmit={handlePatientSubmit} className="space-y-4">
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
{/* 
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div> */}

              {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
              {success && <div className="p-3 bg-green-100 text-green-700 rounded">{success}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? "Registering..." : "Register Patient"}
              </button>
            </form>
          </div>

          {/* Right Panel: Split into Multiple Sections */}
          <div className="flex flex-col gap-6">
            {/* Section 1: Pending Appointments */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-red-500 mb-4">Pending Appointments</h2>
              <div className="space-y-4">
                {isLoadingPending ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
                  </div>
                ) : pendingAppointments && pendingAppointments.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Requested Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingAppointments.map((appt) => (
                          <tr key={appt.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{appt.patientName}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{appt.doctorName}</td>  
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{appt.department}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {new Date(appt.appointmentDate).toLocaleDateString()} 
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => setSelectedPendingAppointment(appt)}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">No pending appointments waiting for approval</div>
                )}
                
                <button
                  onClick={fetchPendingAppointments}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {isLoadingPending ? "Loading..." : "Refresh Pending List"}
                </button>
              </div>
            </div>

            {/* Section 2: Search Appointment */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-blue-600 mb-4">Search Appointment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Search by ID or Patient Email</label>
                  <input
                    type="text"
                    name="searchQuery"
                    placeholder="Enter appointment ID or patient email"
                    value={formData.searchQuery}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={searchAppointment}
                    disabled={isSearching}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                  <button
                    onClick={handleNewAppointment}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    New Appointment
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Search Results:</h3>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {searchResults.map((appt) => (
                            <tr key={appt.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{appt.patientName}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {new Date(appt.appointmentDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  appt.status === "approved" ? "bg-green-100 text-green-800" :
                                  appt.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-blue-100 text-blue-800"
                                }`}>
                                  {appt.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  className="text-blue-600 hover:text-blue-900"
                                  onClick={() => setSelectedAppointment(appt)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Selected Appointment Details */}
                {/* Pending Appointment Review Modal */}
                {selectedPendingAppointment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                    <h3 className="text-xl font-bold text-orange-600 mb-4">
                      Review Appointment Request
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Appointment Details */}
                      <div className="p-4 bg-orange-50 rounded-lg shadow-sm">
                        <h4 className="font-semibold text-lg mb-3 text-orange-700">Appointment Information</h4>
                        
                        <div className="space-y-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">Patient Name:</span>
                            <span className="text-gray-800 font-semibold">{selectedPendingAppointment.patientName}</span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">Patient Email:</span>
                            <span className="text-gray-800">{selectedPendingAppointment.patientEmail}</span>
                          </div>
                          
                          <div className="flex flex-col mt-4">
                            <span className="font-medium text-gray-700">Doctor Name:</span>
                            <span className="text-gray-800 font-semibold">{selectedPendingAppointment.doctorName}</span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">Doctor Email:</span>
                            <span className="text-gray-800">{selectedPendingAppointment.doctorEmail}</span>
                          </div>
                          
                          <div className="flex flex-col mt-4">
                            <span className="font-medium text-gray-700">Department:</span>
                            <span className="text-gray-800">{selectedPendingAppointment.department}</span>
                          </div>
                          
                          {selectedPendingAppointment.symptoms && (
                            <div className="flex flex-col mt-4">
                              <span className="font-medium text-gray-700">Symptoms:</span>
                              <span className="text-gray-800 italic">{selectedPendingAppointment.symptoms}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Column: Modify Appointment */}
                      <div className="p-4 bg-blue-50 rounded-lg shadow-sm">
                        <h4 className="font-semibold text-lg mb-3 text-blue-700">Schedule Appointment</h4>
                        
                        <div className="space-y-4">
                          {/* Date Section */}
                          <div className="mb-4">
                            <h5 className="font-medium mb-2 text-gray-700">Appointment Date</h5>
                            
                            <div className="flex items-center mb-2">
                              <input
                                type="radio"
                                id="acceptDate"
                                checked={acceptPatientDate}
                                onChange={() => setAcceptPatientDate(true)}
                                className="mr-2"
                              />
                              <label htmlFor="acceptDate" className="flex flex-col">
                                <span>Accept requested date</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  {selectedPendingAppointment.appointmentDate}
                                </span>
                              </label>
                            </div>
                            
                            <div className="flex items-center mb-2">
                              <input
                                type="radio"
                                id="provideDate"
                                checked={!acceptPatientDate}
                                onChange={() => setAcceptPatientDate(false)}
                                className="mr-2"
                              />
                              <label htmlFor="provideDate">Provide different date</label>
                            </div>
                            
                            {!acceptPatientDate && (
                              <div className="mt-2">
                                <label className="block mb-1 text-sm">Select New Date</label>
                                <input
                                  type="date"
                                  value={adminDateSlot}
                                  onChange={(e) => setAdminDateSlot(e.target.value)}
                                  className="w-full p-2 border rounded"
                                  min={new Date().toISOString().split('T')[0]}
                                  required
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Time Section */}
                          <div className="mb-4">
                            <h5 className="font-medium mb-2 text-gray-700">Appointment Time</h5>
                            
                            <div className="flex items-center mb-2">
                              <input
                                type="radio"
                                id="acceptTime"
                                checked={acceptPatientTime}
                                onChange={() => setAcceptPatientTime(true)}
                                className="mr-2"
                              />
                              <label htmlFor="acceptTime" className="flex flex-col">
                                <span>Accept requested time</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  {selectedPendingAppointment.requestedTime}
                                </span>
                              </label>
                            </div>
                            
                            <div className="flex items-center mb-2">
                              <input
                                type="radio"
                                id="provideTime"
                                checked={!acceptPatientTime}
                                onChange={() => setAcceptPatientTime(false)}
                                className="mr-2"
                              />
                              <label htmlFor="provideTime">Provide different time slot</label>
                            </div>
                            
                            {!acceptPatientTime && (
                              <div className="mt-2">
                                <label className="block mb-1 text-sm">Select New Time</label>
                                <input
                                  type="time"
                                  value={adminTimeSlot}
                                  onChange={(e) => setAdminTimeSlot(e.target.value)}
                                  className="w-full p-2 border rounded"
                                  required
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Error/Success Messages */}
                    {error && (
                      <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                        {success}
                      </div>
                    )}
                    
                    {/* Dialog Actions */}
                    <div className="flex justify-end gap-4 mt-6">
                      <button
                        onClick={() => {
                          setSelectedPendingAppointment(null);
                          setAdminTimeSlot("");
                          setAdminDateSlot("");
                          setAcceptPatientTime(true);
                          setAcceptPatientDate(true);
                        }}
                        className="px-5 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleApproveAppointment(selectedPendingAppointment.id)}
                        disabled={loading || 
                                (!acceptPatientTime && !adminTimeSlot) || 
                                (!acceptPatientDate && !adminDateSlot)}
                        className="px-5 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? "Processing..." : "Approve Appointment"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Dialog */}
      {/* New Appointment Dialog */}
      {showNewAppointmentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Schedule New Appointment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Patient Information */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Patient Email</label>
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
                      disabled={loading || !newAppointmentData.patientEmail}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                    >
                      {loading ? "..." : "Find"}
                    </button>
                  </div>
                </div>

                {/* Patient Info Display */}
                {newAppointmentData.patientInfo ? (
                  <div className="p-3 bg-blue-50 rounded shadow-sm">
                    <h4 className="font-semibold mb-2 text-blue-800">Patient Information</h4>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Name:</span> 
                        <span className="ml-1">{newAppointmentData.patientInfo.name}</span>
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> 
                        <span className="ml-1">{newAppointmentData.patientInfo.email}</span>
                      </p>
                      <p>
                        <span className="font-medium">Contact:</span> 
                        <span className="ml-1">{newAppointmentData.patientInfo.contactNo || "Not provided"}</span>
                      </p>
                      {newAppointmentData.patientInfo.gender && (
                        <p>
                          <span className="font-medium">Gender:</span> 
                          <span className="ml-1">{newAppointmentData.patientInfo.gender}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 text-gray-500 text-center rounded border border-dashed">
                    Patient information will appear here
                  </div>
                )}
                
                {/* Department Selection */}
                <div>
                  <label className="block mb-1 font-medium">Department</label>
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
                
                {/* Optional doctor email */}
                <div>
                  <label className="block mb-1 font-medium">Doctor Email (Optional)</label>
                  <input
                    type="email"
                    value={newAppointmentData.doctorEmail || ""}
                    onChange={(e) => setNewAppointmentData(prev => ({
                      ...prev,
                      doctorEmail: e.target.value
                    }))}
                    className="w-full p-2 border rounded"
                    placeholder="Enter doctor's email if known"
                  />
                </div>
              </div>
              
              {/* Right Column: Appointment Details */}
              <div className="space-y-4">
                {/* Date and Time Selection */}
                <div>
                  <label className="block mb-1 font-medium">Appointment Date</label>
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
                  <label className="block mb-1 font-medium">Appointment Time</label>
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
                
                {/* Symptoms/Notes */}
                <div>
                  <label className="block mb-1 font-medium">Symptoms/Notes (Optional)</label>
                  <textarea
                    value={newAppointmentData.symptoms || ""}
                    onChange={(e) => setNewAppointmentData(prev => ({
                      ...prev,
                      symptoms: e.target.value
                    }))}
                    rows={4}
                    className="w-full p-2 border rounded resize-none"
                    placeholder="Enter any symptoms or notes"
                  ></textarea>
                </div>
              </div>
            </div>
            
            {/* Error/Success Messages */}
            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            {success && <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

            {/* Dialog Actions */}
            <div className="flex justify-end gap-4 mt-6">
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