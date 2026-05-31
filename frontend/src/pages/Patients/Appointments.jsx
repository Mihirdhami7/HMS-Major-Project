import { useState, useEffect } from "react";
import Slidebar from "../../components/Sidebar"; // Ensure correct path
import { FiCalendar, FiPhoneCall } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

function Appointment() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("appointments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const hospitalName = user?.hospitalName || "Zydus";
  
    // Fetch hospital and departments on component mount
    useEffect(() => {
      if (token && hospitalName) {
        fetchDepartments();
        fetchPreviousAppointments();
      }
    }, [token, hospitalName]);
  


  // API call to fetch departments for a hospital
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      
      if (!hospitalName || !token) return; 
      
      console.log("Fetching departments for hospital:", hospitalName);
      
      // First, get all hospitals to find the ID for our hospital
      const hospitalsResponse = await axios.get(`http://127.0.0.1:8000/api/hospitals/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      console.log("Available hospitals:", hospitalsResponse.data.hospitals?.map(h => h.name));
      
      // Case-insensitive, whitespace-trimmed matching
      const hospital = hospitalsResponse.data.hospitals?.find(h => 
        h.name?.trim().toLowerCase() === hospitalName.trim().toLowerCase()
      );
      
      if (!hospital || !hospital.id) {
        console.error(`Hospital "${hospitalName}" not found. Available: ${hospitalsResponse.data.hospitals?.map(h => h.name).join(', ')}`);
        setError(`Hospital "${hospitalName}" not found`);
        setDepartments([]);
        setLoading(false);
        return;
      }
      
      console.log("Found hospital:", hospital);
      
      // Now fetch departments using the hospital ID
      const response = await axios.get(`http://127.0.0.1:8000/api/hospitals/${hospital.id}/departments/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      console.log("Departments response:", response.data); 
      if (response.data.status === "success" && Array.isArray(response.data.departments)) {
        console.log("Departments:", response.data.departments);
        setDepartments(response.data.departments);
      } else {
        console.error("Invalid departments response:", response.data);
        setDepartments([]);
      }
      } catch (error) {
        setError("Failed to fetch departments");
        console.error("Error fetching departments:", error);
      } finally {
        setLoading(false);
      }
    };

  const fetchDoctorsByDepartment = async (departmentName) => {
    try {
      setLoading(true);
      if (!hospitalName || !token || !departmentName) {
        console.log("Missing required data for doctors fetch:", { hospitalName, token: !!token, departmentName });
        return;
      }
      
      console.log(`Fetching doctors for department: ${departmentName}, hospital: ${hospitalName}`);
      
      // Use the correct endpoint with hospital_name and department_name
      const response = await axios.get(`http://127.0.0.1:8000/api/users/doctors/${hospitalName}/department/${departmentName}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      console.log("Doctors response:", response.data);
      if (response.data.status === "success" && Array.isArray(response.data.doctors)) {
        console.log("Doctors found:", response.data.doctors.length, response.data.doctors);
        setDoctors(response.data.doctors);
      } else {
        console.warn("No doctors in response:", response.data);
        setDoctors([]);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error.response?.data || error.message);
      setError("Failed to fetch doctors");
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    // Pass department name to fetch doctors
    if (department && department.name) {
      fetchDoctorsByDepartment(department.name);
    }
  };

  const fetchPreviousAppointments = async () => {
    try {
      if (!token || !user?.email) return;
      
      const response = await axios.get(`http://127.0.0.1:8000/api/appointments/my/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.data.status === "success" && Array.isArray(response.data.appointments)) {
        console.log("Previous appointments:", response.data.appointments);
        setPreviousAppointments(response.data.appointments);
      } else {
        console.log("No appointments or different response format");
      }
    } catch (error) {
      console.error("Error fetching previous appointments:", error);
      // Don't show error for previous appointments, it's not critical
    }
  };


  const openModal = (doctor) => {
    setSelectedDoctor(doctor);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoctor(null);
    setAppointmentDate("");
    setSymptoms("");
    setAppointmentTime("");
  };




  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
        console.log("Razorpay SDK loaded successfully.");
    };
    script.onerror = () => {
        console.error("Failed to load Razorpay SDK.");
    };
    document.body.appendChild(script);
}, []);


    const createPayment = async () => {
      const userEmail = user?.email;
      const hospitalNameForPayment = user?.hospitalName || "Zydus";
    
      if (!userEmail || !hospitalNameForPayment) {
        alert("User information is incomplete. Please log in again.");
        return;
      }
      if (!selectedDoctor) {
        alert("Please select a doctor to book an appointment.");
        return;
      }
      if (!appointmentDate) {
        alert("Please select an appointment date.");
        return;
      }
      if (!appointmentTime) {
        alert("Please select a time slot.");
        return;
      }
      if(appointmentDate < new Date().toISOString().split("T")[0]) {
        alert("Please select a valid appointment date.");
        return;
      }
    
      try {
        setBookingLoading(true);
        // Create payment order
        const response = await axios.post("http://127.0.0.1:8000/api/payments/create_payment/", {
          amount: 100, // Payment fee in rupees
          patientEmail: userEmail,
          hospitalName: hospitalNameForPayment,
        }, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const { order_id, key } = response.data;

      // Open Razorpay payment modal
      const options = {
        key: key,
        amount: 100 * 100, // Convert to paise
        currency: "INR",
        name: "HMS Healthcare",
        description: "Appointment Booking Fee",
        order_id: order_id,
        handler: async function (paymentResult) {
          // Verify payment and book appointment
          const payment_id = paymentResult.razorpay_payment_id;
          const verifyResponse = await axios.post("http://127.0.0.1:8000/api/payments/verify_payment/", {
            payment_id: payment_id,
            order_id: order_id,
            patientEmail: userEmail,
            hospitalName: hospitalNameForPayment,
          }, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });


          if (verifyResponse.data.status === "success") {
            /* alert("Payment successful. Booking appointment..."); */
            console.log("Payment verification successful:", verifyResponse.data);
            setBookingLoading(true); // Set loading state for booking
            bookAppointment(payment_id);
          } else {
            alert("Payment verification failed. Please try again.");
            setBookingLoading(false);
          }
        },
        prefill: {
          email: userEmail,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error creating payment:", error);
      alert("An error occurred while creating the payment. Please try again.");
    }finally {
      setBookingLoading(false); // Reset loading state
    }
  };


  const bookAppointment =  async (payment_id) => {
  
    setBookingLoading(true); // Set loading state for booking
    const userName = user?.name;
    const userEmail = user?.email;
    const hospitalNameForBooking = user?.hospitalName || "Zydus";

    if(!payment_id)  { 
      alert("Payment ID is missing. Please try again.");
      console.error("Missing payment ID:", payment_id);
      return;
    }

    // Modified to match backend expectations
    const appointmentData = {
      patientName: userName || "patient",
      patientEmail: userEmail || "email",
      department: selectedDoctor.specialization || selectedDoctor.doctorSpecialization,
      appointmentDate: appointmentDate,
      requestedTime: appointmentTime,
      symptoms: symptoms || "No symptoms provided",
      doctorEmail: selectedDoctor.email,
      doctorName: selectedDoctor.name || selectedDoctor.doctorName,
      hospitalName: hospitalNameForBooking,
      paymentId: payment_id,
    };
    
    console.log("Appointment data being sent:", appointmentData);
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/appointments/book/", appointmentData, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.data.status === "success") {
        setShowModal(false);
        setSelectedDoctor(null);
        setAppointmentDate("");
        setSymptoms("");
        alert("Appointment request sent for approval.");
        console.log("Appointment sent successfully:", response.data);
      } else {
        alert(response.data.message || "Failed to book appointment.");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("An error occurred. Please try again.");
    }finally {
      setBookingLoading(false); // Reset loading state
    }
};

  
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />
  
        <div className="flex-1 p-8 overflow-y-auto mt-16">
          <h2 className="text-3xl font-bold flex items-center mb-6 text-blue-700">
            <FiCalendar className="mr-2 text-green-600" /> Book Appointments 
          </h2>
  
          
          {/* Hospital Name Display */}
          {hospitalName && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-lg flex items-center border-l-4 border-blue-500">
              <img
                src={
                  hospitalName === "Zydus"
                    ? "/public/images/zydus.png"
                    : hospitalName === "Iris"
                    ? "/public/images/iris.png"
                    : "/public/images/default-hospital.png"
                }
                alt={`${hospitalName} Hospital`}
                className="w-20 h-20 rounded-full mr-4 object-cover"
                onError={(e) => {
                  e.target.src = "/public/images/default-hospital.png";
                  e.target.onerror = null;
                }}
              />
              <div>
                <h3 className="text-lg font-bold text-blue-700">{hospitalName} Hospital</h3>
                <p className="text-sm text-gray-600">
                  {hospitalName === "Zydus"
                    ? "Zydus Hospital is a leading healthcare provider offering world-class medical services and facilities. Our team of specialists ensures the best care for your health."
                    : hospitalName === "Iris"
                    ? "Iris Hospital is known for its advanced medical technology and compassionate care, providing exceptional healthcare services to patients."
                    : "Welcome to our hospital. We are committed to providing quality healthcare services tailored to your needs."}
                </p>
              </div>
            </div>
          )}

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
  
          {/* Loading state */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading departments and doctors...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        {!loading && !error && (
          <>
            {/* Department Selection */}
            <div className="flex space-x-4 mb-6 overflow-x-auto py-2">
              {departments.length > 0 ? (
                departments.map((dept) => (
                  <button
                    key={dept._id}
                    onClick={() => handleDepartmentSelect(dept)}
                    className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
                      selectedDepartment && selectedDepartment._id === dept._id
                        ? "bg-blue-500 text-white border-blue-600 shadow-md" 
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {dept.name}
                  </button>
                ))
              ) : (
                <p className="text-gray-500">No departments found for this hospital</p>
              )}
            </div>

            {/* Doctor Cards Section */}
            {selectedDepartment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {doctors.length > 0 ? (
                  doctors.map((doctor) => (
                    <div
                      key={doctor._id || doctor.id || doctor.email}
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
                        <h3 className="font-bold text-xl mb-2 text-gray-800">{doctor.name || doctor.doctorName || "N/A"}</h3>
                        <div className="space-y-2">
                          <p className="text-blue-600 font-medium">{doctor.specialization || doctor.doctorSpecialization || doctor.Department || "N/A"}</p>
                          <p className="text-gray-600">{doctor.qualification || doctor.doctorQualification || "N/A"}</p>
                          <p className="text-gray-500 text-sm">{doctor.email || "N/A"}</p>
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
                            onClick={() => window.location.href = `tel:${doctor.contactNo || '#'}`}
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
                      No doctors available for {selectedDepartment.name}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal for booking appointment */}
        {showModal && selectedDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl relative max-h-[80vh] flex flex-col">
              {/* Header with close button */}
              <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-5 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-2xl font-bold">Book Appointment</h2>
                <button 
                  className="text-white hover:text-gray-200 text-xl" 
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
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
                    <h3 className="text-xl font-bold text-gray-800">{selectedDoctor.name || selectedDoctor.doctorName || "N/A"}</h3>
                    <p className="text-blue-600 font-medium">{selectedDoctor.specialization || selectedDoctor.doctorSpecialization || "N/A"}</p>
                    <p className="text-gray-600">{selectedDoctor.qualification || selectedDoctor.doctorQualification || "N/A"}</p>
                    <p className="text-gray-500 text-sm">{selectedDoctor.email || "N/A"}</p>
                      

                    {/* Added doctor rating - with dynamic stars */}
                    <div className="flex items-center mt-1">
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const rating = parseFloat(selectedDoctor.rating) || 4.5;
                          return (
                            <svg 
                              key={star} 
                              className={`w-4 h-4 ${star <= Math.round(rating) 
                                ? "text-yellow-400 fill-current" 
                                : star - 0.5 <= rating 
                                  ? "text-yellow-400 fill-current opacity-80" // For partial stars
                                  : "text-gray-300 fill-current"             // For empty stars
                              }`} 
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                          );
                        })}
                      </div>
                      <span className="ml-1 text-sm text-gray-600">
                        {selectedDoctor.rating || "4.5"}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Doctor description - NEW */}
                <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">About Doctor</h4>
                  <p className="text-gray-600">
                    {selectedDoctor.description || 
                    `Dr. ${selectedDoctor.name} is a highly qualified ${selectedDoctor.doctorSpecialization} specialist with ${selectedDoctor.experience || "several"} years of experience in treating patients with various conditions.`}
                  </p>
                  
                  {/* Doctor's available schedule - NEW */}
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700">Availability</h4>
                    <p className="text-sm text-gray-600">
                      {selectedDoctor.time_slot || "Available weekdays 9:00 AM - 5:00 PM"}
                    </p>
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
                  <p>Appointment will be booked for: <span className="font-semibold">{user?.email}</span></p>
                  <p className="mt-1">Please arrive 15 minutes before your scheduled appointment time.</p>
                </div>

                {/* Fee information - Improved design */}
                <div className="mb-6 border-2 border-green-400 rounded-lg overflow-hidden">
                  <div className= "bg-green-500 text-white py-2 px-4 font-medium">
                    Appointment Fee
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50">
                    <div>
                      <p className="text-gray-700 font-medium">Appointmnet Booking Fee</p>
                      <p className="text-xs text-gray-500 mt-1">This fee is non-refundable for no-shows</p>
                    </div>
                    <div className="text-xl font-bold text-green-700">₹100</div>
                  </div>
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
                    onClick={createPayment}
                    disabled={bookingLoading}
                  >
                   {bookingLoading ? "Processing..." : "Confirm Appointment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


          {/* Previous Appointments Section */}
          <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
            <h2 className="text-2xl font-bold mb-4 text-blue-700">Previous Appointments</h2>
            {previousAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-green-50">
                      <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Name</th>
                      <th className="border border-blue-200 p-3 text-left text-gray-700">Department</th>
                      <th className="border border-blue-200 p-3 text-left text-gray-700">Appointment Date</th>
                      <th className="border border-blue-200 p-3 text-left text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previousAppointments.map((appointment) => (
                      <tr key={appointment._id || appointment.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50">
                        <td className="border border-blue-200 p-3">{appointment.doctorName || "N/A"}</td>
                        <td className="border border-blue-200 p-3">{appointment.department || "N/A"}</td>
                        <td className="border border-blue-200 p-3">{appointment.appointmentDate || "N/A"}</td>
                        <td className="border border-blue-200 p-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            appointment.status === "approved" ? "bg-green-100 text-green-800" :
                            appointment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            appointment.status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {appointment.status || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No previous appointments found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  export default Appointment;