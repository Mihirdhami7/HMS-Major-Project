import { useState, useEffect, useCallback, useMemo } from "react";
import Slidebar from "../../components/Sidebar";
import { FiCalendar, FiPhoneCall } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useHospitals, useDepartments } from "../../hooks/useHospitals";
import { pickList } from "../../services/apiClient";
import { listDoctorsByDepartment } from "../../services/userService";
import {
  bookAppointment as bookAppointmentAPI,
  getMyAppointments,
  getMyPrescriptions,
} from "../../services/appointmentsService";
import { createRazorpayOrder, verifyRazorpayPayment } from "../../services/paymentService";

// Booking fee shown to the patient (backend has no fee configuration endpoint yet).
const BOOKING_FEE = 100;

// Values must be "HH:MM" (BookAppointmentSerializer.validate_appointmentTime).
const TIME_SLOTS = [
  { value: "09:00", label: "09:00 AM - 10:00 AM" },
  { value: "10:00", label: "10:00 AM - 11:00 AM" },
  { value: "11:00", label: "11:00 AM - 12:00 PM" },
  { value: "14:00", label: "02:00 PM - 03:00 PM" },
  { value: "15:00", label: "03:00 PM - 04:00 PM" },
  { value: "16:00", label: "04:00 PM - 05:00 PM" },
];

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let razorpayLoader = null;
/** Load the Razorpay checkout script once, only when a payment is started. */
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayLoader) {
    razorpayLoader = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayLoader = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }
  return razorpayLoader;
};

const statusClass = (status) =>
  status === "approved" ? "bg-green-100 text-green-800" :
  status === "pending" ? "bg-yellow-100 text-yellow-800" :
  status === "completed" ? "bg-blue-100 text-blue-800" :
  status === "rejected" || status === "cancelled" ? "bg-red-100 text-red-800" :
  "bg-gray-100 text-gray-800";

const isPaid = (appt) =>
  Array.isArray(appt.payments) && appt.payments.some((p) => String(p.status || "").toLowerCase() !== "failed");

const formatSlot = (slot) => {
  if (!slot) return "";
  if (typeof slot === "string") return slot;
  if (typeof slot === "object") {
    return Object.entries(slot)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join(" · ");
  }
  return "";
};

function Appointment() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("appointments");
  const { hospitals, loading: hospitalsLoading } = useHospitals(token);
  const [hospitalName, setHospitalName] = useState(user?.hospitalName || "");
  const {
    departments,
    loading: departmentsLoading,
    error: departmentsError,
  } = useDepartments(token, { hospitalName });

  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [modalError, setModalError] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const hospital = useMemo(
    () => hospitals.find((h) => h.name?.toLowerCase() === hospitalName.toLowerCase()) || null,
    [hospitals, hospitalName]
  );

  const today = new Date().toISOString().split("T")[0];

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    const [apptRes, prescRes] = await Promise.all([
      getMyAppointments(token),
      getMyPrescriptions(token),
    ]);
    setPreviousAppointments(pickList(apptRes, "appointments"));
    setPrescriptions(pickList(prescRes, "prescriptions"));
    const failed = [apptRes, prescRes].find((r) => !r.success);
    setHistoryError(failed ? failed.message : null);
    setHistoryLoading(false);
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset the department / doctor selection whenever the hospital changes.
  useEffect(() => {
    setSelectedDepartment(null);
    setDoctors([]);
  }, [hospitalName]);

  const handleDepartmentSelect = async (department) => {
    setSelectedDepartment(department);
    setDoctors([]);
    setDoctorsError(null);
    if (!department?.name || !hospitalName) return;
    setDoctorsLoading(true);
    const result = await listDoctorsByDepartment(token, hospitalName, department.name);
    if (result.success) {
      setDoctors(pickList(result, "doctors"));
    } else {
      setDoctorsError(result.message || "Failed to fetch doctors");
    }
    setDoctorsLoading(false);
  };

  const openModal = (doctor) => {
    setSelectedDoctor(doctor);
    setModalError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoctor(null);
    setAppointmentDate("");
    setSymptoms("");
    setAppointmentTime("");
    setModalError(null);
  };

  /** Razorpay payment for an already booked appointment. Never blocks booking. */
  const payForAppointment = async (appt) => {
    setError(null);
    setNotice(null);
    const patientId = appt.patient?.patientId;
    if (!patientId) {
      setError("Cannot start payment: patient id missing on appointment.");
      return;
    }
    setPayingId(appt._id);
    const loaded = await loadRazorpay();
    if (!loaded) {
      setPayingId(null);
      setError("Could not load the payment gateway. Your appointment is still booked; you can pay later.");
      return;
    }
    const stamp = Date.now();
    const meta = {
      payment_id: `APPT-${appt._id}-${stamp}`,
      order_id: `ORD-${appt._id}-${stamp}`,
      source: "PATIENT",
      category: "APPOINTMENT_BOOKING",
      amount: BOOKING_FEE,
      currency: "INR",
      patient_id: patientId,
      patient_name: appt.patient?.name || user?.name || "",
      appointment_id: appt._id,
      ...(hospital?.id && { hospital_id: hospital.id }),
      hospital_name: appt.hospitalName,
    };
    const orderRes = await createRazorpayOrder(token, meta);
    if (!orderRes.success) {
      setPayingId(null);
      setError(`Payment could not be started: ${orderRes.message}. Your appointment is still booked.`);
      return;
    }
    const { razorpay_key_id: key, razorpay_order: rpOrder } = orderRes.data || {};
    const rz = new window.Razorpay({
      key,
      amount: rpOrder?.amount,
      currency: rpOrder?.currency || "INR",
      name: appt.hospitalName || "Hospital",
      description: "Appointment Booking Fee",
      order_id: rpOrder?.id,
      prefill: { email: user?.email, name: user?.name },
      theme: { color: "#3399cc" },
      handler: async (resp) => {
        const verifyRes = await verifyRazorpayPayment(token, {
          ...meta,
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
        });
        setPayingId(null);
        if (verifyRes.success) {
          setNotice("Payment successful.");
          fetchHistory();
        } else {
          setError(`Payment verification failed: ${verifyRes.message}`);
        }
      },
      modal: {
        ondismiss: () => setPayingId(null),
      },
    });
    rz.open();
  };

  const handleBook = async () => {
    setModalError(null);
    if (!user?.email) {
      setModalError("User information is incomplete. Please log in again.");
      return;
    }
    if (!hospitalName) {
      setModalError("Select a hospital first.");
      return;
    }
    if (!selectedDoctor || !selectedDepartment) {
      setModalError("Please select a doctor to book an appointment.");
      return;
    }
    if (!appointmentDate || appointmentDate < today) {
      setModalError("Please select a valid appointment date.");
      return;
    }
    if (!appointmentTime) {
      setModalError("Please select a time slot.");
      return;
    }

    setBookingLoading(true);
    const result = await bookAppointmentAPI(token, {
      patientEmail: user.email,
      doctorEmail: selectedDoctor.email,
      department: selectedDepartment.name,
      hospitalName,
      appointmentDate,
      appointmentTime,
      symptoms: symptoms.trim(),
    });
    setBookingLoading(false);

    if (!result.success) {
      setModalError(result.message || "Failed to book appointment.");
      return;
    }
    closeModal();
    setNotice(result.message || "Appointment request sent for approval.");
    fetchHistory();
  };

  const prescriptionFor = (appt) => prescriptions.find((p) => p.appointmentId === appt._id);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 p-8 overflow-y-auto mt-16">
        <h2 className="text-3xl font-bold flex items-center mb-6 text-blue-700">
          <FiCalendar className="mr-2 text-green-600" /> Book Appointments
        </h2>

        {/* Hospital selection / display */}
        <div className="mb-4 p-4 bg-white rounded-lg shadow-lg flex flex-wrap gap-4 items-center justify-between border-l-4 border-blue-500">
          <div>
            <h3 className="text-lg font-bold text-blue-700">{hospital?.name || hospitalName || "Select a hospital"}</h3>
            {hospital?.description && <p className="text-sm text-gray-600">{hospital.description}</p>}
            {hospital?.address && <p className="text-xs text-gray-500 mt-1">{hospital.address}</p>}
          </div>
          {hospitals.length > 0 && (
            <select
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Choose hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.name}>{h.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Contact hospital */}
        {hospital?.contactNo && (
          <div className="w-full flex justify-between items-center border-b border-blue-200 pb-4 mb-6">
            <span className="text-lg font-semibold text-gray-700">Need help? Contact the hospital</span>
            <a
              className="px-4 py-2 flex items-center bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 transition-all"
              href={`tel:${hospital.contactNo}`}
            >
              <FiPhoneCall className="mr-2" /> {hospital.contactNo}
            </a>
          </div>
        )}

        {notice && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <p className="text-green-700">{notice}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!hospitalName && !hospitalsLoading && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">No hospital selected. Choose a hospital to see its departments.</p>
          </div>
        )}

        {/* Loading state */}
        {(departmentsLoading || hospitalsLoading) && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading departments...</p>
          </div>
        )}

        {departmentsError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{departmentsError}</p>
          </div>
        )}

        {hospitalName && !departmentsLoading && !departmentsError && (
          <>
            {/* Department Selection */}
            <div className="flex space-x-4 mb-6 overflow-x-auto py-2">
              {departments.length > 0 ? (
                departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => handleDepartmentSelect(dept)}
                    title={dept.description || ""}
                    className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
                      selectedDepartment && selectedDepartment.id === dept.id
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

            {selectedDepartment?.description && (
              <p className="text-sm text-gray-600 mb-4">{selectedDepartment.description}</p>
            )}

            {/* Doctor Cards Section */}
            {selectedDepartment && (
              doctorsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-2 text-gray-600">Loading doctors...</p>
                </div>
              ) : doctorsError ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <p className="text-red-700">{doctorsError}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <div
                        key={doctor._id || doctor.email}
                        className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <div className="relative">
                          <img
                            src="/images/doctor.png"
                            alt={doctor.name}
                            className="w-full h-48 object-cover rounded-t-xl"
                          />
                        </div>

                        <div className="p-5">
                          <h3 className="font-bold text-xl mb-2 text-gray-800">{doctor.name || "N/A"}</h3>
                          <div className="space-y-2">
                            <p className="text-blue-600 font-medium">{doctor.specialization || doctor.department || "N/A"}</p>
                            {doctor.qualification && <p className="text-gray-600">{doctor.qualification}</p>}
                            <p className="text-gray-500 text-sm">{doctor.email}</p>
                          </div>

                          <div className="mt-6 flex gap-3">
                            <button
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                              onClick={() => openModal(doctor)}
                            >
                              <FiCalendar className="mr-2" /> Book
                            </button>
                            {doctor.contactNo && (
                              <a
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                                href={`tel:${doctor.contactNo}`}
                              >
                                <FiPhoneCall className="mr-2" /> Call
                              </a>
                            )}
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
              )
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
                      src="/images/doctor.png"
                      alt={selectedDoctor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedDoctor.name || "N/A"}</h3>
                    <p className="text-blue-600 font-medium">{selectedDoctor.specialization || selectedDepartment?.name || "N/A"}</p>
                    {selectedDoctor.qualification && <p className="text-gray-600">{selectedDoctor.qualification}</p>}
                    <p className="text-gray-500 text-sm">{selectedDoctor.email}</p>
                    {Number(selectedDoctor.rating) > 0 && (
                      <p className="text-sm text-gray-600 mt-1">Rating: {Number(selectedDoctor.rating).toFixed(1)} / 5</p>
                    )}
                  </div>
                </div>

                {(selectedDoctor.description || formatSlot(selectedDoctor.time_slot) || Number(selectedDoctor.experience) > 0) && (
                  <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                    {selectedDoctor.description && (
                      <>
                        <h4 className="font-medium text-gray-700 mb-2">About Doctor</h4>
                        <p className="text-gray-600">{selectedDoctor.description}</p>
                      </>
                    )}
                    {Number(selectedDoctor.experience) > 0 && (
                      <p className="text-sm text-gray-600 mt-2">Experience: {selectedDoctor.experience} years</p>
                    )}
                    {formatSlot(selectedDoctor.time_slot) && (
                      <div className="mt-3">
                        <h4 className="font-medium text-gray-700">Availability</h4>
                        <p className="text-sm text-gray-600">{formatSlot(selectedDoctor.time_slot)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Select Date</label>
                    <input
                      type="date"
                      min={today}
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
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

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

                {/* Fee information */}
                <div className="mb-6 border-2 border-green-400 rounded-lg overflow-hidden">
                  <div className="bg-green-500 text-white py-2 px-4 font-medium">
                    Appointment Fee
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50">
                    <div>
                      <p className="text-gray-700 font-medium">Appointment Booking Fee</p>
                      <p className="text-xs text-gray-500 mt-1">You can pay online after booking from your appointment list.</p>
                    </div>
                    <div className="text-xl font-bold text-green-700">₹{BOOKING_FEE}</div>
                  </div>
                </div>

                {modalError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 text-sm text-red-700">
                    {modalError}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-4">
                  <button
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-all"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
                    onClick={handleBook}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? "Processing..." : "Confirm Appointment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment history (all statuses) */}
        <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">My Appointments</h2>
          {historyError && <p className="text-red-600 text-sm mb-3">{historyError}</p>}
          {historyLoading ? (
            <p className="text-gray-500 text-center py-6">Loading...</p>
          ) : previousAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-green-50">
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Name</th>
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Hospital / Department</th>
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Date &amp; Time</th>
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Status</th>
                    <th className="border border-blue-200 p-3 text-left text-gray-700">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {previousAppointments.map((appointment) => {
                    const rescheduled =
                      appointment.acceptedDate &&
                      (appointment.acceptedDate !== appointment.appointmentDate ||
                        appointment.acceptedTime !== appointment.requestedTime);
                    const canPay =
                      (appointment.status === "pending" || appointment.status === "approved") && !isPaid(appointment);
                    return (
                      <tr key={appointment._id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50">
                        <td className="border border-blue-200 p-3">{appointment.doctor?.name || "N/A"}</td>
                        <td className="border border-blue-200 p-3">
                          {appointment.hospitalName} / {appointment.department}
                        </td>
                        <td className="border border-blue-200 p-3">
                          {appointment.acceptedDate || appointment.appointmentDate}{" "}
                          {appointment.acceptedTime || appointment.requestedTime}
                          {rescheduled && (
                            <div className="text-xs text-gray-500">
                              Requested: {appointment.appointmentDate} {appointment.requestedTime}
                            </div>
                          )}
                        </td>
                        <td className="border border-blue-200 p-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusClass(appointment.status)}`}>
                            {appointment.status || "Unknown"}
                          </span>
                          {appointment.status === "rejected" && appointment.rejectionReason && (
                            <div className="text-xs text-gray-500 mt-1">{appointment.rejectionReason}</div>
                          )}
                        </td>
                        <td className="border border-blue-200 p-3 text-sm">
                          {isPaid(appointment) ? (
                            <span className="text-green-700">Paid</span>
                          ) : canPay ? (
                            <button
                              onClick={() => payForAppointment(appointment)}
                              disabled={payingId === appointment._id}
                              className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                            >
                              {payingId === appointment._id ? "Processing..." : `Pay ₹${BOOKING_FEE}`}
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No appointments found.</p>
          )}
        </div>

        {/* Prescription history */}
        <div className="mt-8 w-full bg-white p-6 rounded-lg shadow-lg border border-green-100">
          <h2 className="text-2xl font-bold mb-4 text-green-700">My Prescriptions</h2>
          {historyLoading ? (
            <p className="text-gray-500 text-center py-6">Loading...</p>
          ) : prescriptions.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No prescriptions yet.</p>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((p) => {
                const appt = previousAppointments.find((a) => a._id === p.appointmentId);
                return (
                  <div key={p._id} className="border border-green-100 rounded-lg p-4">
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <p className="font-semibold text-gray-800">
                        Dr. {p.doctor?.name} · {p.department} ({p.hospitalName})
                      </p>
                      <p className="text-sm text-gray-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                        {appt ? ` · appointment ${appt.acceptedDate || appt.appointmentDate}` : ""}
                      </p>
                    </div>
                    <table className="w-full text-sm border-collapse mb-2">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-left">Medicine</th>
                          <th className="border p-2 text-left">Dosage</th>
                          <th className="border p-2 text-left">Duration</th>
                          <th className="border p-2 text-left">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.medicines || []).map((m, i) => (
                          <tr key={`${m.medicineId}-${i}`}>
                            <td className="border p-2">{m.name}</td>
                            <td className="border p-2">{[m.dosage, m.frequency].filter(Boolean).join(" · ")}</td>
                            <td className="border p-2">{m.duration}</td>
                            <td className="border p-2">{m.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.suggestions && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        <strong>Advice:</strong> {p.suggestions}
                      </p>
                    )}
                    {p.reports?.reportType && p.reports.reportType !== "none" && (
                      <p className="text-sm text-gray-700"><strong>Report:</strong> {p.reports.reportType}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {previousAppointments.some((a) => a.status === "completed" && !prescriptionFor(a)) && (
            <p className="text-xs text-gray-400 mt-3">
              Some completed appointments have no prescription on record.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Appointment;
