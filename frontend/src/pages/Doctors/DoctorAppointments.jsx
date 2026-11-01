import { useState, useEffect, useCallback, useMemo } from "react";
import Slidebar from "../../components/Sidebar";
import { FiCheckCircle, FiEdit3, FiCalendar, FiClock, FiSearch, FiX, FiXCircle } from "react-icons/fi";
import { IoDocumentTextOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useHospitals } from "../../hooks/useHospitals";
import { pickList } from "../../services/apiClient";
import {
  getMyAppointments,
  getMyPrescriptions,
  approveAppointment,
} from "../../services/appointmentsService";

const apptDate = (appt) => appt.acceptedDate || appt.appointmentDate;
const apptTime = (appt) => appt.acceptedTime || appt.requestedTime || appt.appointmentTime;
const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "-");

function DoctorAppointments() {
  const { token, user } = useAuth();
  const { hospitals } = useHospitals(token);
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reschedule, setReschedule] = useState({}); // { [id]: { date, time } }
  const [activeTab, setActiveTab] = useState("appointments");
  const [searchEmail, setSearchEmail] = useState("");
  const [historyPatient, setHistoryPatient] = useState(null); // { name, email }
  const [viewPrescription, setViewPrescription] = useState(null);

  const hospital = useMemo(
    () =>
      hospitals.find(
        (h) => h.name?.toLowerCase() === (user?.hospitalName || "").toLowerCase()
      ) || null,
    [hospitals, user?.hospitalName]
  );

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const [apptRes, prescRes] = await Promise.all([
      getMyAppointments(token),
      getMyPrescriptions(token),
    ]);
    if (!apptRes.success) {
      setError(apptRes.message || "Failed to fetch appointments");
      setAppointments([]);
    } else {
      setAppointments(pickList(apptRes, "appointments"));
    }
    // Prescriptions are secondary: keep page usable if they fail.
    setPrescriptions(prescRes.success ? pickList(prescRes, "prescriptions") : []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingAppointments = appointments.filter((a) => a.status === "pending");
  const approvedAppointments = appointments.filter((a) => a.status === "approved");
  const completedAppointments = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    if (!searchEmail.trim()) return true;
    return (a.patient?.email || "").toLowerCase().includes(searchEmail.trim().toLowerCase());
  });

  const today = new Date().toISOString().split("T")[0];

  const handleDecision = async (appt, action) => {
    setActionMessage(null);
    setActionError(null);
    const payload = { action };
    if (action === "approve") {
      const r = reschedule[appt._id];
      if (r?.date || r?.time) {
        if (!r.date || !r.time) {
          setActionError("To reschedule, provide both a date and a time.");
          return;
        }
        payload.confirmedDate = r.date;
        payload.confirmedTime = r.time;
      }
    } else {
      const reason = window.prompt("Reason for rejection (optional):");
      if (reason === null) return;
      if (reason.trim()) payload.rejectionReason = reason.trim();
    }
    setBusyId(appt._id);
    const result = await approveAppointment(token, appt._id, payload);
    setBusyId(null);
    if (result.success) {
      setActionMessage(result.message || "Appointment updated");
      fetchData();
    } else {
      setActionError(result.message || "Failed to update appointment");
    }
  };

  const setRescheduleField = (id, field, value) =>
    setReschedule((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const openPrescriptionPage = (appointment) => {
    navigate("/doctor/appointments/prescription", { state: { appointment } });
  };

  const prescriptionFor = (appt) => prescriptions.find((p) => p.appointmentId === appt._id);

  const patientHistory = historyPatient
    ? {
        appointments: appointments.filter((a) => a.patient?.email === historyPatient.email),
        prescriptions: prescriptions.filter((p) => p.patient?.email === historyPatient.email),
      }
    : null;

  const renderPatient = (appt) => (
    <button
      type="button"
      onClick={() => setHistoryPatient({ name: appt.patient?.name, email: appt.patient?.email })}
      className="text-xs text-blue-600 hover:underline text-left"
      title="View patient history"
    >
      {appt.patient?.name || "-"}
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-col flex-1 p-8 overflow-auto mt-16">

        {/* Hospital Information */}
        {user?.hospitalName ? (
          <div className="mb-4 p-4 bg-white rounded-lg shadow-lg flex items-center border-l-4 border-blue-500">
            <div>
              <h3 className="text-lg font-bold text-blue-700">{hospital?.name || user.hospitalName}</h3>
              {hospital?.description && (
                <p className="text-sm text-gray-600">{hospital.description}</p>
              )}
              {(hospital?.address || hospital?.contactNo) && (
                <p className="text-xs text-gray-500 mt-1">
                  {[hospital.address, hospital.contactNo].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>No hospital is linked to your account.</p>
          </div>
        )}

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
        {actionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{actionError}</p>
          </div>
        )}
        {actionMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p>{actionMessage}</p>
          </div>
        )}

        {/* Requests awaiting approval */}
        {!loading && !error && (
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-6 text-yellow-700">Appointment Requests</h2>
            {pendingAppointments.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-semibold mb-2 text-gray-600">No Pending Requests</h3>
                <p className="text-gray-500">New appointment requests will appear here.</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-left">Patient</th>
                      <th className="border p-3 text-left">Requested</th>
                      <th className="border p-3 text-left">Symptoms</th>
                      <th className="border p-3 text-left">Reschedule (optional)</th>
                      <th className="border p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAppointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-yellow-50 transition-colors">
                        <td className="border p-3">
                          {renderPatient(appt)}
                          <div className="text-xs text-gray-500">{appt.patient?.email}</div>
                        </td>
                        <td className="border p-3">
                          <div className="flex items-center text-sm">
                            <FiCalendar className="mr-2 text-blue-500" />
                            {appt.appointmentDate}
                          </div>
                          <div className="flex items-center text-sm">
                            <FiClock className="mr-2 text-blue-500" />
                            {appt.requestedTime || "-"}
                          </div>
                        </td>
                        <td className="border p-3">
                          <div className="max-w-xs truncate">{appt.symptoms || "No symptoms provided"}</div>
                        </td>
                        <td className="border p-3">
                          <div className="flex flex-col gap-1">
                            <input
                              type="date"
                              min={today}
                              value={reschedule[appt._id]?.date || ""}
                              onChange={(e) => setRescheduleField(appt._id, "date", e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            />
                            <input
                              type="time"
                              value={reschedule[appt._id]?.time || ""}
                              onChange={(e) => setRescheduleField(appt._id, "time", e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </td>
                        <td className="border p-3">
                          <div className="flex flex-col gap-2">
                            <button
                              disabled={busyId === appt._id}
                              onClick={() => handleDecision(appt, "approve")}
                              className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                              <FiCheckCircle className="mr-1" /> Approve
                            </button>
                            <button
                              disabled={busyId === appt._id}
                              onClick={() => handleDecision(appt, "reject")}
                              className="flex items-center px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              <FiXCircle className="mr-1" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Approved Appointments */}
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
                        <tr key={appt._id} className={`hover:bg-blue-50 transition-colors ${apptDate(appt) === today ? "bg-green-50" : ""}`}>
                          <td className="border p-3">
                            {renderPatient(appt)}
                          </td>
                          <td className="border p-3">
                            <div className="text-xs text-gray-500">{appt.patient?.email}</div>
                          </td>
                          <td className="border p-3">
                            <div className="flex items-center">
                              <FiCalendar className="mr-2 text-blue-500" />
                              {apptDate(appt)}
                            </div>
                          </td>
                          <td className="border p-3">
                            <div className="flex items-center">
                              <FiClock className="mr-2 text-blue-500" />
                              {apptTime(appt) || "-"}
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

        {/* Completed Appointments */}
        {!loading && !error && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-green-800">Completed Appointments</h2>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-700">Appointments With Prescriptions</h3>
              {/* Search box */}
              <div className="mb-4 relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by patient email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <FiSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              {completedAppointments.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No completed appointments found.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left">Patient name</th>
                        <th className="border p-3 text-left">Patient Email</th>
                        <th className="border p-3 text-left">Date</th>
                        <th className="border p-3 text-left">Symptoms</th>
                        <th className="border p-3 text-left">Status</th>
                        <th className="border p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedAppointments.map((appt) => {
                        const presc = prescriptionFor(appt);
                        return (
                          <tr key={appt._id} className="hover:bg-green-50 transition-colors">
                            <td className="border p-3">
                              {renderPatient(appt)}
                            </td>
                            <td className="border p-3">
                              <div className="text-xs text-gray-500">{appt.patient?.email}</div>
                            </td>
                            <td className="border p-3">
                              <div className="text-xs text-gray-500">{apptDate(appt)}</div>
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
                                disabled={!presc}
                                onClick={() => setViewPrescription(presc)}
                                className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                title={presc ? "View prescription" : "Prescription not found"}
                              >
                                <IoDocumentTextOutline className="mr-1" /> View Prescription
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Patient history modal */}
      {historyPatient && patientHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-blue-700">
                History: {historyPatient.name} <span className="text-sm text-gray-500">({historyPatient.email})</span>
              </h3>
              <button onClick={() => setHistoryPatient(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Showing only appointments and prescriptions with you.
            </p>

            <h4 className="font-semibold text-gray-700 mb-2">Appointments ({patientHistory.appointments.length})</h4>
            <ul className="mb-6 space-y-1 text-sm">
              {patientHistory.appointments.map((a) => (
                <li key={a._id} className="border rounded p-2 flex justify-between">
                  <span>{apptDate(a)} {apptTime(a)} · {a.department}</span>
                  <span className="capitalize text-gray-600">{a.status}</span>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-gray-700 mb-2">Prescriptions ({patientHistory.prescriptions.length})</h4>
            {patientHistory.prescriptions.length === 0 ? (
              <p className="text-sm text-gray-500">No prescriptions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {patientHistory.prescriptions.map((p) => (
                  <li key={p._id} className="border rounded p-2">
                    <div className="flex justify-between">
                      <span>{formatDateTime(p.createdAt)} · {p.department}</span>
                      <button onClick={() => setViewPrescription(p)} className="text-blue-600 hover:underline">
                        View
                      </button>
                    </div>
                    <div className="text-gray-600">
                      {(p.medicines || []).map((m) => m.name).join(", ") || "No medicines"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Prescription detail modal */}
      {viewPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-green-700">Prescription</h3>
              <button onClick={() => setViewPrescription(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <p className="text-sm"><strong>Patient:</strong> {viewPrescription.patient?.name} ({viewPrescription.patient?.email})</p>
            <p className="text-sm"><strong>Date:</strong> {formatDateTime(viewPrescription.createdAt)}</p>
            <p className="text-sm mb-3"><strong>Status:</strong> {viewPrescription.status}</p>
            {viewPrescription.vitals && (
              <div className="text-sm mb-3">
                <strong>Vitals:</strong>{" "}
                {Object.entries(viewPrescription.vitals)
                  .filter(([, v]) => v !== null && v !== "" && v !== undefined)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ") || "Not recorded"}
              </div>
            )}
            <table className="w-full border-collapse border border-gray-300 text-sm mb-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Medicine</th>
                  <th className="border p-2 text-left">Dosage</th>
                  <th className="border p-2 text-left">Duration</th>
                  <th className="border p-2 text-left">Qty</th>
                </tr>
              </thead>
              <tbody>
                {(viewPrescription.medicines || []).map((m, i) => (
                  <tr key={`${m.medicineId}-${i}`}>
                    <td className="border p-2">{m.name}</td>
                    <td className="border p-2">{m.dosage}</td>
                    <td className="border p-2">{m.duration}</td>
                    <td className="border p-2">{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {viewPrescription.suggestions && (
              <p className="text-sm"><strong>Suggestions:</strong> {viewPrescription.suggestions}</p>
            )}
            {viewPrescription.reports?.reportType && viewPrescription.reports.reportType !== "none" && (
              <p className="text-sm"><strong>Report:</strong> {viewPrescription.reports.reportType}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorAppointments;
