import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { FiCalendar, FiRefreshCw, FiSearch, FiUserPlus, FiPlus, FiX, FiCheck } from "react-icons/fi";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useDepartments } from "../../hooks/useHospitals";
import { pickList } from "../../services/apiClient";
import { createPatient, searchPatient, listDoctorsByDepartment } from "../../services/userService";
import {
  getPendingAppointments,
  getAllAppointments,
  approveAppointment,
  bookAppointment,
} from "../../services/appointmentsService";
import { doctorName } from "../../utils/format";

const todayISO = () => new Date().toISOString().split("T")[0];
const nowHHMM = () => new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5);
const apptDate = (a) => a.acceptedDate || a.appointmentDate || "";
const apptTime = (a) => a.acceptedTime || a.requestedTime || "";

const emptyPatientForm = { name: "", email: "", contactNo: "", gender: "Male", dateOfBirth: "" };

const emptyAppointment = () => ({
  patientEmail: "",
  patientInfo: null,
  department: "",
  doctorEmail: "",
  symptoms: "",
  appointmentDate: todayISO(),
  appointmentTime: nowHHMM(),
});

const STATUS_STYLES = {
  approved: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-gray-100 text-gray-700",
};

const inputClass = "w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-2xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.string,
};

function Message({ error, success }) {
  if (!error && !success) return null;
  return error
    ? <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
    : <div className="mt-3 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>;
}

Message.propTypes = { error: PropTypes.string, success: PropTypes.string };

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status}
    </span>
  );
}

StatusBadge.propTypes = { status: PropTypes.string };

/** Reception: register patients, review appointment requests, find and book appointments. */
const NewRegister = () => {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const [activeTab, setActiveTab] = useState("reception");
  const { departments, loading: departmentsLoading } = useDepartments(token, { hospitalName });

  // Patient registration
  const [formData, setFormData] = useState(emptyPatientForm);
  const [regMsg, setRegMsg] = useState({});
  const [regLoading, setRegLoading] = useState(false);

  // Pending appointments + review
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedPendingAppointment, setSelectedPendingAppointment] = useState(null);
  const [acceptPatientTime, setAcceptPatientTime] = useState(true);
  const [adminTimeSlot, setAdminTimeSlot] = useState("");
  const [acceptPatientDate, setAcceptPatientDate] = useState(true);
  const [adminDateSlot, setAdminDateSlot] = useState("");
  const [approvalAction, setApprovalAction] = useState("approve");
  const [reviewMsg, setReviewMsg] = useState({});
  const [pageMsg, setPageMsg] = useState({});

  // All appointments (stats + search)
  const [allAppointments, setAllAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // New appointment dialog
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState(emptyAppointment);
  const [departmentDoctors, setDepartmentDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [newMsg, setNewMsg] = useState({});
  const [loading, setLoading] = useState(false);

  // ==== 1. PATIENT REGISTRATION ====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setRegMsg({});
    if (!hospitalName) {
      setRegMsg({ error: "No hospital is linked to this admin account." });
      return;
    }
    setRegLoading(true);
    const result = await createPatient(token, hospitalName, {
      name: formData.name,
      email: formData.email,
      contactNo: formData.contactNo,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
    });
    setRegLoading(false);
    if (result.success) {
      setRegMsg({ success: result.message || "Patient registered successfully!" });
      setFormData(emptyPatientForm);
    } else {
      setRegMsg({ error: result.message });
    }
  };

  // ==== 2. APPOINTMENTS ====
  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setIsLoadingPending(true);
    const [pendingRes, allRes] = await Promise.all([getPendingAppointments(token), getAllAppointments(token)]);
    setPendingAppointments(pendingRes.success ? pickList(pendingRes, "appointments") : []);
    setAllAppointments(allRes.success ? pickList(allRes, "appointments") : []);
    const failed = [pendingRes, allRes].find((r) => !r.success);
    if (failed) setPageMsg({ error: failed.message });
    setIsLoadingPending(false);
  }, [token]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const resetReview = () => {
    setSelectedPendingAppointment(null);
    setAdminTimeSlot("");
    setAdminDateSlot("");
    setAcceptPatientTime(true);
    setAcceptPatientDate(true);
    setApprovalAction("approve");
    setReviewMsg({});
  };

  const handleApproveAppointment = async () => {
    const appt = selectedPendingAppointment;
    if (!appt?._id) {
      setReviewMsg({ error: "No appointment selected for approval/rejection" });
      return;
    }
    let payload;
    if (approvalAction === "approve") {
      payload = { action: "approve" };
      // Backend needs BOTH confirmedDate and confirmedTime when rescheduling
      if (!acceptPatientDate || !acceptPatientTime) {
        payload.confirmedDate = acceptPatientDate ? appt.appointmentDate : adminDateSlot;
        payload.confirmedTime = acceptPatientTime ? appt.requestedTime : adminTimeSlot;
      }
    } else {
      payload = { action: "reject" };
    }
    setLoading(true);
    const result = await approveAppointment(token, appt._id, payload);
    setLoading(false);
    if (result.success) {
      setPageMsg({ success: result.message || `Appointment ${approvalAction}d successfully!` });
      resetReview();
      fetchAppointments();
    } else {
      setReviewMsg({ error: result.message });
    }
  };

  // Search (patient name, email or appointment id) over all hospital appointments
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return allAppointments
      .filter((apt) =>
        [apt.patient?.email, apt.patient?.name, apt._id, apt.doctor?.name].some((v) => (v || "").toLowerCase().includes(query))
      )
      .sort((a, b) => apptDate(b).localeCompare(apptDate(a)));
  }, [allAppointments, searchQuery]);

  const stats = useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    return {
      today: allAppointments.filter((a) => apptDate(a) === today && ["pending", "approved"].includes(a.status)).length,
      upcoming: allAppointments.filter((a) => a.status === "approved" && apptDate(a) >= today).length,
      month: allAppointments.filter((a) => apptDate(a).slice(0, 7) === month).length,
    };
  }, [allAppointments]);

  // ==== 3. NEW APPOINTMENT ====
  const handleNewAppointment = () => {
    setShowNewAppointmentDialog(true);
    setNewAppointmentData(emptyAppointment());
    setDepartmentDoctors([]);
    setNewMsg({});
  };

  const selectedNewDepartment = newAppointmentData.department;
  useEffect(() => {
    if (!showNewAppointmentDialog || !selectedNewDepartment || !hospitalName) {
      setDepartmentDoctors([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setDoctorsLoading(true);
      const result = await listDoctorsByDepartment(token, hospitalName, selectedNewDepartment);
      if (cancelled) return;
      if (result.success) {
        setDepartmentDoctors(pickList(result, "doctors"));
      } else {
        setDepartmentDoctors([]);
        setNewMsg({ error: result.message });
      }
      setDoctorsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [showNewAppointmentDialog, selectedNewDepartment, hospitalName, token]);

  const fetchPatientInfo = async () => {
    if (!newAppointmentData.patientEmail) {
      setNewMsg({ error: "Please enter patient email" });
      return;
    }
    setLoading(true);
    setNewMsg({});
    const result = await searchPatient(token, newAppointmentData.patientEmail.trim(), hospitalName);
    setLoading(false);
    const patient = result.data?.patient || null;
    if (result.success && patient) {
      setNewAppointmentData((prev) => ({ ...prev, patientInfo: patient }));
      setNewMsg({ success: "Patient found!" });
    } else {
      setNewMsg({ error: result.success ? "Patient not found with this email" : result.message });
      setNewAppointmentData((prev) => ({ ...prev, patientInfo: null }));
    }
  };

  const handleNewAppointmentSubmit = async () => {
    const d = newAppointmentData;
    if (!d.patientInfo || !d.department || !d.doctorEmail || !d.appointmentDate || !d.appointmentTime) {
      setNewMsg({ error: "Patient, department, doctor, date and time are required" });
      return;
    }
    if (!hospitalName) {
      setNewMsg({ error: "No hospital is linked to this admin account." });
      return;
    }
    setLoading(true);
    setNewMsg({});
    const result = await bookAppointment(token, {
      patientEmail: d.patientInfo.email || d.patientEmail,
      doctorEmail: d.doctorEmail,
      department: d.department,
      hospitalName,
      appointmentDate: d.appointmentDate,
      appointmentTime: d.appointmentTime,
      symptoms: d.symptoms || "",
    });
    setLoading(false);
    if (result.success) {
      setShowNewAppointmentDialog(false);
      setNewAppointmentData(emptyAppointment());
      setPageMsg({ success: result.message || "Appointment created successfully!" });
      fetchAppointments();
    } else {
      setNewMsg({ error: result.message });
    }
  };

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <FiCalendar className="mr-2 text-green-600" /> Reception
              </h1>
              <p className="text-sm text-gray-500">Register patients, review appointment requests and book visits — {hospitalName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAppointments}
                disabled={isLoadingPending}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm"
              >
                <FiRefreshCw className={isLoadingPending ? "animate-spin" : ""} /> Refresh
              </button>
              <button
                onClick={handleNewAppointment}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 shadow-sm"
              >
                <FiPlus /> New Appointment
              </button>
            </div>
          </div>

          {(pageMsg.error || pageMsg.success) && (
            <div className={`p-4 rounded border-l-4 flex justify-between ${pageMsg.error ? "bg-red-50 border-red-500 text-red-700" : "bg-green-50 border-green-500 text-green-700"}`}>
              <p>{pageMsg.error || pageMsg.success}</p>
              <button onClick={() => setPageMsg({})}><FiX /></button>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="⏳" label="Pending Requests" value={isLoadingPending ? "…" : pendingAppointments.length} sub="Waiting for approval" />
            <StatCard icon="📅" label="Today" value={isLoadingPending ? "…" : stats.today} sub="Appointments today" />
            <StatCard icon="✅" label="Upcoming" value={isLoadingPending ? "…" : stats.upcoming} sub="Approved appointments" />
            <StatCard icon="🗓️" label="This Month" value={isLoadingPending ? "…" : stats.month} sub="All appointments" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="xl:col-span-2 space-y-6">
              {/* Pending requests */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Pending Requests</h2>
                    <p className="text-xs text-gray-500">Approve, reschedule or reject appointment requests</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">{pendingAppointments.length} waiting</span>
                </div>
                {isLoadingPending ? (
                  <p className="text-gray-500 text-center py-8">Loading…</p>
                ) : pendingAppointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No appointment requests waiting for approval.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="py-2 pr-3 font-medium">Patient</th>
                          <th className="py-2 pr-3 font-medium">Doctor</th>
                          <th className="py-2 pr-3 font-medium">Department</th>
                          <th className="py-2 pr-3 font-medium">Requested</th>
                          <th className="py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingAppointments.map((appt) => (
                          <tr key={appt._id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2.5 pr-3">
                              <p className="font-medium text-gray-800">{appt.patient?.name || appt.patient?.email}</p>
                              <p className="text-xs text-gray-500">{appt.patient?.email}</p>
                            </td>
                            <td className="py-2.5 pr-3 text-gray-700">{doctorName(appt.doctor?.name)}</td>
                            <td className="py-2.5 pr-3 text-gray-700">{appt.department}</td>
                            <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{appt.appointmentDate} · {appt.requestedTime}</td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => setSelectedPendingAppointment(appt)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Find appointment */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-800">Find Appointment</h2>
                <p className="text-xs text-gray-500 mb-3">Search by patient name, email, doctor or appointment ID</p>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. mihirdhami745@gmail.com"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                {searchQuery.trim() && (
                  searchResults.length === 0 ? (
                    <p className="text-gray-500 text-center py-6 text-sm">No appointments found.</p>
                  ) : (
                    <div className="overflow-x-auto mt-3 max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-200">
                            <th className="py-2 pr-3 font-medium">Patient</th>
                            <th className="py-2 pr-3 font-medium">Doctor</th>
                            <th className="py-2 pr-3 font-medium">Date</th>
                            <th className="py-2 pr-3 font-medium">Status</th>
                            <th className="py-2 font-medium text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchResults.map((appt) => (
                            <tr key={appt._id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 pr-3 text-gray-800">{appt.patient?.name || appt.patient?.email}</td>
                              <td className="py-2 pr-3 text-gray-700">{doctorName(appt.doctor?.name)}</td>
                              <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{apptDate(appt)} {apptTime(appt)}</td>
                              <td className="py-2 pr-3"><StatusBadge status={appt.status} /></td>
                              <td className="py-2 text-right">
                                <button onClick={() => setSelectedAppointment(appt)} className="text-xs font-semibold text-blue-700 hover:underline">
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Side column: register patient */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center"><FiUserPlus className="mr-2 text-blue-600" /> Register New Patient</h2>
              <p className="text-xs text-gray-500 mb-4">Walk-in patient registration for {hospitalName}</p>
              <form onSubmit={handlePatientSubmit} className="space-y-3">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Contact Number</label>
                  <input type="tel" name="contactNo" value={formData.contactNo} onChange={handleChange} className={inputClass} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputClass} required />
                  </div>
                </div>
                <Message {...regMsg} />
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-medium"
                >
                  {regLoading ? "Registering..." : "Register Patient"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment details */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Appointment Details</h3>
                <p className="text-xs text-white/85 font-mono">{selectedAppointment._id}</p>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="hover:bg-white/20 rounded-full p-1"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ["Patient", `${selectedAppointment.patient?.name || ""} (${selectedAppointment.patient?.email || ""})`],
                ["Doctor", doctorName(selectedAppointment.doctor?.name)],
                ["Department", selectedAppointment.department],
                ["Date & time", `${apptDate(selectedAppointment)} ${apptTime(selectedAppointment) || ""}`],
                ["Symptoms", selectedAppointment.symptoms || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-800 text-right">{v}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={selectedAppointment.status} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review pending request */}
      {selectedPendingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Review Appointment Request</h3>
                <p className="text-sm text-white/90">
                  {selectedPendingAppointment.patient?.name} → {doctorName(selectedPendingAppointment.doctor?.name)} · {selectedPendingAppointment.department}
                </p>
              </div>
              <button onClick={resetReview} className="hover:bg-white/20 rounded-full p-1"><FiX size={20} /></button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
                <p className="font-semibold text-gray-800 mb-1">Request</p>
                <p><span className="text-gray-500">Patient:</span> {selectedPendingAppointment.patient?.name}</p>
                <p className="text-gray-500 text-xs">{selectedPendingAppointment.patient?.email}</p>
                <p><span className="text-gray-500">Doctor:</span> {doctorName(selectedPendingAppointment.doctor?.name)}</p>
                <p className="text-gray-500 text-xs">{selectedPendingAppointment.doctor?.email}</p>
                <p><span className="text-gray-500">Department:</span> {selectedPendingAppointment.department}</p>
                <p><span className="text-gray-500">Requested:</span> {selectedPendingAppointment.appointmentDate} · {selectedPendingAppointment.requestedTime}</p>
                {selectedPendingAppointment.symptoms && (
                  <p><span className="text-gray-500">Symptoms:</span> <span className="italic">{selectedPendingAppointment.symptoms}</span></p>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalAction("approve")}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1 border ${approvalAction === "approve" ? "bg-green-50 text-green-700 border-green-400" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    <FiCheck /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalAction("reject")}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1 border ${approvalAction === "reject" ? "bg-red-50 text-red-700 border-red-400" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    <FiX /> Reject
                  </button>
                </div>

                {approvalAction === "approve" && (
                  <>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Date</p>
                      <label className="flex items-center gap-2 mb-1">
                        <input type="radio" checked={acceptPatientDate} onChange={() => setAcceptPatientDate(true)} />
                        Keep requested date <span className="font-semibold text-gray-800">{selectedPendingAppointment.appointmentDate}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={!acceptPatientDate} onChange={() => setAcceptPatientDate(false)} />
                        Change date
                      </label>
                      {!acceptPatientDate && (
                        <input type="date" value={adminDateSlot} onChange={(e) => setAdminDateSlot(e.target.value)} min={todayISO()} className={`${inputClass} mt-2`} required />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Time</p>
                      <label className="flex items-center gap-2 mb-1">
                        <input type="radio" checked={acceptPatientTime} onChange={() => setAcceptPatientTime(true)} />
                        Keep requested time <span className="font-semibold text-gray-800">{selectedPendingAppointment.requestedTime}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={!acceptPatientTime} onChange={() => setAcceptPatientTime(false)} />
                        Change time
                      </label>
                      {!acceptPatientTime && (
                        <input type="time" value={adminTimeSlot} onChange={(e) => setAdminTimeSlot(e.target.value)} className={`${inputClass} mt-2`} required />
                      )}
                    </div>
                  </>
                )}
                {approvalAction === "reject" && (
                  <p className="text-gray-600">The patient will be notified that the request was rejected.</p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              <Message {...reviewMsg} />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={resetReview} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleApproveAppointment}
                  disabled={loading ||
                    (approvalAction === "approve" && !acceptPatientTime && !adminTimeSlot) ||
                    (approvalAction === "approve" && !acceptPatientDate && !adminDateSlot)}
                  className={`px-5 py-2 rounded-lg text-white disabled:opacity-60 ${approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {loading ? "Processing..." : approvalAction === "approve" ? "Approve Appointment" : "Reject Appointment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New appointment */}
      {showNewAppointmentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Schedule New Appointment</h3>
                <p className="text-sm text-white/90">Booked by reception — confirmed immediately</p>
              </div>
              <button onClick={() => setShowNewAppointmentDialog(false)} className="hover:bg-white/20 rounded-full p-1"><FiX size={20} /></button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Patient Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newAppointmentData.patientEmail}
                      onChange={(e) => setNewAppointmentData((prev) => ({ ...prev, patientEmail: e.target.value }))}
                      className={inputClass}
                      placeholder="patient@email.com"
                    />
                    <button
                      onClick={fetchPatientInfo}
                      disabled={loading || !newAppointmentData.patientEmail}
                      className="px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-sm"
                    >
                      Find
                    </button>
                  </div>
                </div>
                {newAppointmentData.patientInfo ? (
                  <div className="p-3 rounded-xl bg-blue-50 text-sm space-y-0.5">
                    <p className="font-semibold text-gray-800">{newAppointmentData.patientInfo.name}</p>
                    <p className="text-gray-600">{newAppointmentData.patientInfo.email}</p>
                    <p className="text-gray-600">{newAppointmentData.patientInfo.contactNo || "No contact"}{newAppointmentData.patientInfo.gender ? ` · ${newAppointmentData.patientInfo.gender}` : ""}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-gray-300 text-gray-500 text-center text-sm">
                    Find the patient by email first
                  </div>
                )}
                <div>
                  <label className={labelClass}>Department</label>
                  <select
                    value={newAppointmentData.department}
                    onChange={(e) => setNewAppointmentData((prev) => ({ ...prev, department: e.target.value, doctorEmail: "" }))}
                    className={inputClass}
                    disabled={departmentsLoading}
                  >
                    <option value="">{departmentsLoading ? "Loading departments..." : departments.length ? "Select Department" : "No departments available"}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Doctor</label>
                  <select
                    value={newAppointmentData.doctorEmail}
                    onChange={(e) => setNewAppointmentData((prev) => ({ ...prev, doctorEmail: e.target.value }))}
                    className={inputClass}
                    disabled={!newAppointmentData.department || doctorsLoading}
                  >
                    <option value="">
                      {!newAppointmentData.department ? "Select a department first" : doctorsLoading ? "Loading doctors..." : departmentDoctors.length ? "Select Doctor" : "No doctors in this department"}
                    </option>
                    {departmentDoctors.map((doc) => (
                      <option key={doc._id || doc.email} value={doc.email}>
                        {doc.name}{doc.specialization ? ` (${doc.specialization})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Appointment Date</label>
                  <input
                    type="date"
                    value={newAppointmentData.appointmentDate}
                    onChange={(e) => setNewAppointmentData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                    className={inputClass}
                    min={todayISO()}
                  />
                </div>
                <div>
                  <label className={labelClass}>Appointment Time</label>
                  <input
                    type="time"
                    value={newAppointmentData.appointmentTime}
                    onChange={(e) => setNewAppointmentData((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Symptoms / Notes (optional)</label>
                  <textarea
                    value={newAppointmentData.symptoms || ""}
                    onChange={(e) => setNewAppointmentData((prev) => ({ ...prev, symptoms: e.target.value }))}
                    rows={5}
                    className={`${inputClass} resize-none`}
                    placeholder="Symptoms or notes"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Message {...newMsg} />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowNewAppointmentDialog(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleNewAppointmentSubmit}
                  disabled={loading || !newAppointmentData.patientInfo || !newAppointmentData.department || !newAppointmentData.doctorEmail}
                  className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create Appointment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRegister;
