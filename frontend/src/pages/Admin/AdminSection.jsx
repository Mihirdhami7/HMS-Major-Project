import { useState, useEffect, useMemo } from "react";
import { Route, Routes } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { FiUsers, FiActivity, FiCalendar, FiBriefcase, FiClock } from "react-icons/fi";
import { MdLocalHospital, MdOutlineMedicalServices } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import { useHospitals } from "../../hooks/useHospitals";
import { listDoctors, listPatients } from "../../services/userService";
import { listDepartments } from "../../services/hospitalService";
import { getAllAppointments } from "../../services/appointmentsService";
import { pickList } from "../../services/apiClient";

const todayISO = () => new Date().toISOString().split("T")[0];

const STATUS_DOT = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  completed: "bg-blue-500",
  rejected: "bg-red-500",
};

function AdminSection() {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const [activeTab, setActiveTab] = useState("dashboard");
  const { hospitals } = useHospitals(token);

  const [counts, setCounts] = useState({ patients: null, doctors: null, today: null, departments: null });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hospitalInfo = useMemo(
    () => hospitals.find((h) => h.name?.toLowerCase() === hospitalName.toLowerCase()) || null,
    [hospitals, hospitalName]
  );

  useEffect(() => {
    if (!token || !hospitalName) {
      setLoading(false);
      if (!hospitalName) setError("No hospital is linked to this admin account.");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const [docRes, patRes, apptRes] = await Promise.all([
        listDoctors(token, hospitalName),
        listPatients(token, hospitalName),
        getAllAppointments(token),
      ]);
      if (cancelled) return;
      const appts = pickList(apptRes, "appointments");
      const today = todayISO();
      setAppointments(appts);
      setCounts((prev) => ({
        ...prev,
        doctors: docRes.success ? pickList(docRes, "doctors").length : null,
        patients: patRes.success ? pickList(patRes, "patients").length : null,
        today: apptRes.success
          ? appts.filter((a) => (a.acceptedDate || a.appointmentDate) === today).length
          : null,
      }));
      const failed = [docRes, patRes, apptRes].find((r) => !r.success);
      if (failed) setError(failed.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hospitalName]);

  // Department count needs the hospital id (resolved from the hospitals list)
  useEffect(() => {
    if (!token || !hospitalInfo?.id) return undefined;
    let cancelled = false;
    (async () => {
      const res = await listDepartments(token, hospitalInfo.id);
      if (cancelled) return;
      setCounts((prev) => ({ ...prev, departments: res.success ? pickList(res, "departments").length : null }));
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hospitalInfo?.id]);

  const fmt = (v) => (v === null || v === undefined ? (loading ? "…" : "—") : v);

  const stats = [
    { label: "Total Patients", value: fmt(counts.patients), icon: <FiUsers />, color: "blue" },
    { label: "Doctors", value: fmt(counts.doctors), icon: <FiActivity />, color: "green" },
    { label: "Today's Appointments", value: fmt(counts.today), icon: <FiCalendar />, color: "blue" },
    { label: "Departments", value: fmt(counts.departments), icon: <FiBriefcase />, color: "green" },
  ];

  const statusCounts = useMemo(() => {
    const c = { pending: 0, approved: 0, completed: 0, rejected: 0 };
    appointments.forEach((a) => {
      if (c[a.status] !== undefined) c[a.status] += 1;
    });
    return c;
  }, [appointments]);

  const recentAppointments = useMemo(
    () =>
      [...appointments]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 5),
    [appointments]
  );

  return (
    <div className="flex bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />
      <div className="flex-1 p-8 mt-16">
        <Routes>
  
          <Route path="*" element={
            <div>
              {/* Welcome Banner with Hospital Info */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl p-8 text-white mb-8 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      Welcome, {user?.name || user?.email?.split("@")[0] || "Admin"}! <span className="ml-2">👋</span>
                    </h1>
                    <p className="text-lg opacity-90 mb-3">
                      {hospitalInfo?.name || hospitalName || "Hospital"} Administration Portal
                    </p>
                    {hospitalInfo && (hospitalInfo.address || hospitalInfo.contactNo) && (
                      <div className="mt-2 text-white/80 text-sm space-y-1">
                        {hospitalInfo.address && <p><span className="font-semibold">Address:</span> {hospitalInfo.address}</p>}
                        {hospitalInfo.contactNo && <p><span className="font-semibold">Contact:</span> {hospitalInfo.contactNo}</p>}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center space-x-3 bg-white/10 backdrop-blur-sm py-2 px-4 rounded-lg">
                    <MdLocalHospital className="text-3xl" />
                    <div>
                      <p className="font-semibold">Pending Appointments</p>
                      <p className="text-sm text-green-200">{loading ? "…" : statusCounts.pending}</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg border-l-4 border-l-blue-500">
                    <div className="flex justify-between">
                      <div className={`text-${stat.color}-500 text-2xl mb-2 bg-${stat.color}-50 p-3 rounded-lg`}>
                        {stat.icon}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-800 my-2">
                      {stat.value}
                    </div>
                    <div className="text-gray-500 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Appointment overview (real counts by status) */}
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-md p-6 md:col-span-2">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <MdOutlineMedicalServices className="text-blue-500 mr-2" /> Appointment Overview
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: "pending", label: "Pending", cls: "bg-yellow-50 text-yellow-700" },
                      { key: "approved", label: "Approved", cls: "bg-green-50 text-green-700" },
                      { key: "completed", label: "Completed", cls: "bg-blue-50 text-blue-700" },
                      { key: "rejected", label: "Rejected", cls: "bg-red-50 text-red-700" },
                    ].map((s) => (
                      <div key={s.key} className={`${s.cls} p-4 rounded-lg`}>
                        <p className="font-medium">{s.label}</p>
                        <span className="text-2xl font-bold text-gray-800">{loading ? "…" : statusCounts[s.key]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activities (latest appointment updates) */}
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <FiClock className="text-blue-500 mr-2" /> Recent Appointment Activity
                  </h2>
                  {loading ? (
                    <p className="text-gray-500">Loading…</p>
                  ) : recentAppointments.length === 0 ? (
                    <p className="text-gray-500">No appointment activity yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {recentAppointments.map((a) => (
                        <div key={a._id} className="flex items-center p-3 border-b border-gray-100">
                          <div className={`w-2 h-2 ${STATUS_DOT[a.status] || "bg-gray-400"} rounded-full mr-3`}></div>
                          <div>
                            <p className="text-gray-800 font-medium">
                              {a.patient?.name || a.patient?.email || "Patient"} with Dr. {a.doctor?.name || "—"}
                              {a.department ? ` (${a.department})` : ""} — {a.status}
                            </p>
                            <p className="text-gray-500 text-sm">
                              {a.acceptedDate || a.appointmentDate} {a.acceptedTime || a.requestedTime || ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default AdminSection;