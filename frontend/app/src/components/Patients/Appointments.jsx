import { useState, useEffect } from "react";
import Slidebar from "../../pages/Slidebar"; // Ensure correct path
import { FiCalendar, FiPhoneCall } from "react-icons/fi";
import axios from "axios";

const specializations = [
  { id: "orthopedic", label: "Orthopedic" },
  { id: "cardiology", label: "Cardiology" },
  { id: "pediatrics", label: "Pediatrics" },
  { id: "neurology", label: "Neurology" },
  { id: "general medicine", label: "General Medicine" },
];

// API call to fetch doctor details
const fetchDoctorDetails = async () => {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/get_doctor_details/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Doctor details response:", data);

    if (!data || !data.doctors) {
      throw new Error("Invalid data format received");
    }

    return data; // Return response data for further processing
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    return { status: "error", message: "Something went wrong" };
  }
};

function Appointment() {
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [doctorsBySpecialization, setDoctorsBySpecialization] = useState({});
  const [activeTab, setActiveTab] = useState("appointments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [symptoms, setSymptoms] = useState("");

  useEffect(() => {
    const getDoctors = async () => {
      setLoading(true);

      try{
        const response = await fetchDoctorDetails();
        console.log("", response);

        if (response.status === "success") {
          const doctors = response.doctors;

        // Group doctors by specialization
        const groupedDoctors = specializations.reduce((acc, spec) => {
          acc[spec.id] = doctors.filter((doctor) => {
            // Normalize both strings for comparison
            const doctorSpec = (doctor.doctorSpecialization || "").trim().toLowerCase();
            const currentSpec = spec.label.trim().toLowerCase();
            return doctorSpec === currentSpec;
          });
          return acc;
        }, {});


        console.log("Received doctors:", doctors.map(d => ({
          name: d.name,
          specialization: d.specialization
        })));

        setDoctorsBySpecialization(groupedDoctors);
        setError(null);
      } else {
        setError(response.message || "failed to fetch doctors")
        setDoctorsBySpecialization({});
      }
    }catch(err){
      setError("Failed to fetch doctor details",err);
      setDoctorsBySpecialization({});
    }
    finally {
      setLoading(false);
    }
  };
    getDoctors();
    
  }, []);

const openModal = (doctor) => {
  setSelectedDoctor(doctor);
  setShowModal(true);
};

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoctor(null);
    setAppointmentDate("");
    setAppointmentTime("");
  };


  const previousAppointments = [
    { id: 1, doctorName: "Dr. John Doe", suggestion: "Continue medication", reportLink: "/reports/report1.pdf" },
    { id: 2, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
    { id: 3, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
    { id: 4, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
  ];

  const bookAppointment =  async () => {
    if (!appointmentDate) {
      alert("Please select an appointment date.");
      return;
    }
    
    if (!appointmentTime) {
      alert("Please select a time slot.");
      return;
    }

    const userName = sessionStorage.getItem("name");
    const userEmail = sessionStorage.getItem("email");

    if ( !userName || !userEmail) {
      alert("User information is incomplete. Please log in again.");
      console.error("Missing user info:", {  userName, userEmail });
      return;
    }

    // Modified to match backend expectations
    const appointmentData = {
      patientName: userName || "patient",// You need to store userName in session storage
      patientEmail: userEmail || "email" , // Changed to email
      department: selectedDoctor.doctorSpecialization, // Use specialization as department
      appointmentDate: appointmentDate,
      requestedTime: appointmentTime, // Changed from appointmentTime to requestedTime
      symptoms: symptoms || "No symptoms provided", // Optional field
      doctorEmail: selectedDoctor.email, // Additional data that might be useful
      doctorName: selectedDoctor.name // Additional data that might be useful
    };
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/book-appointment/", appointmentData);
      
      if (response.data.status === "success") {
        alert("Appointment request sent for approval.");
        console.log("Appointment sent successfully:", response.data);
        closeModal();
      } else {
        alert(response.data.message || "Failed to book appointment.");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("An error occurred. Please try again.");
    }
};

  
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />
  
        <div className="flex-1 p-8 overflow-y-auto mt-16">
          <h2 className="text-3xl font-bold flex items-center mb-6 text-blue-700">
            <FiCalendar className="mr-2 text-green-600" /> Doctor Appointments
          </h2>
  
          {/* Contact Admin Section */}
          <div className="w-full flex justify-between items-center border-b border-blue-200 pb-4 mb-6">
            <span className="text-lg font-semibold text-gray-700">Contact Admin to book Appointments</span>
            <button
              className="px-4 py-2 flex items-center bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 transition-all"
              onClick={() => window.location.href = "tel:+1234567890"}
            >
              <FiPhoneCall className="mr-2" /> Call Admin
            </button>
          </div>
  
         {/* Specialization Selection */}
        <div className="flex space-x-4 mb-6 overflow-x-auto py-2">
          {specializations.map((spec) => (
            <button
              key={spec.id}
              onClick={() => setSelectedSpecialization(spec.id)}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
                selectedSpecialization === spec.id 
                  ? "bg-blue-500 text-white border-blue-600 shadow-md" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {spec.label}
            </button>
          ))}
        </div>

       {/* Display loading state */}
       {loading && (
          <div className="text-center py-4">
            <p className="text-gray-600">Loading doctors...</p>
          </div>
        )}

        {/* Display error state */}
        {error && (
          <div className="text-center py-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      
      {/* Doctor Cards Section */}
      {selectedSpecialization && !loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {doctorsBySpecialization[selectedSpecialization]?.length > 0 ? (
            doctorsBySpecialization[selectedSpecialization].map((doctor) => (
              <div
                key={doctor._id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative">
                  <img
                    src={doctor.image || "/public/images/doctor.png"}
                    alt={doctor.name}
                    className="w-full h-48 object-cover rounded-t-xl"
                    onError={(e) => {
                      e.target.src = "/public/images/doctor.png";
                      e.target.onerror = null;
                    }}
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                      ● Available
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-2 text-gray-800">{doctor.name}</h3>
                  <div className="space-y-2">
                    <p className="text-blue-600 font-medium">{doctor.doctorSpecialization}</p>
                    <p className="text-gray-600">{doctor.doctorQualification}</p>
                    <p className="text-gray-500 text-sm">{doctor.email}</p>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button 
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                      onClick={() => openModal(doctor)}
                    >
                      <FiCalendar className="mr-2" /> Book
                    </button>
                    <button 
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                      onClick={() => window.location.href = `tel:${doctor.phone}`}
                    >
                      <FiPhoneCall className="mr-2" /> Call
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500 text-lg">
                No doctors available for {specializations.find(s => s.id === selectedSpecialization)?.label}.
              </p>
            </div>
          )}
        </div>
      )}

        {/* Modal for booking appointment */}
        {showModal && selectedDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative">
              {/* Header with close button */}
              <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-5 rounded-t-xl flex justify-between items-center">
                <h2 className="text-2xl font-bold">Book Appointment</h2>
                <button 
                  className="text-white hover:text-gray-200 text-xl" 
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>

              <div className="p-8">
                {/* Doctor info */}
                <div className="flex items-center mb-6 border-b pb-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden mr-6 bg-gray-200">
                    <img
                      src={selectedDoctor.image || "/public/images/doctor.png"}
                      alt={selectedDoctor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/images/default-doctor.png";
                        e.target.onerror = null;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedDoctor.name}</h3>
                    <p className="text-blue-600 font-medium">{selectedDoctor.doctorSpecialization}</p>
                    <p className="text-gray-600">{selectedDoctor.doctorQualification}</p>
                    <p className="text-gray-500 text-sm">{selectedDoctor.email}</p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Select Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={appointmentDate}
                      required
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Select Time Slot</label>
                    <select 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={appointmentTime}
                      required
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    >
                      <option value="">Choose a time</option>
                      <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                      <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                      <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                      <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                      <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Symptoms Text Area - NEW */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Describe Your Symptoms</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please describe your symptoms or reason for the appointment..."
                    rows="4"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  ></textarea>
                </div>

                {/* Information box */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-700">
                  <p>Appointment will be booked for: <span className="font-semibold">{sessionStorage.getItem("email")}</span></p>
                  <p className="mt-1">Please arrive 15 minutes before your scheduled appointment time.</p>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-4">
                  <button 
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-all"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
                    onClick={bookAppointment}
                  >
                    Confirm Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


          {/* Previous Appointments Section */}
          <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
            <h2 className="text-2xl font-bold mb-4 text-blue-700">Previous Appointments</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-green-50">
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Name</th>
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Suggestion</th>
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {previousAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50">
                      <td className="border border-blue-200 p-3">{appointment.doctorName}</td>
                      <td className="border border-blue-200 p-3">{appointment.suggestion}</td>
                      <td className="border border-blue-200 p-3">
                        <a
                          href={appointment.reportLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-green-500 transition-colors"
                        >
                          Generate Report
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  export default Appointment;