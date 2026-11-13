import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Slidebar from "../../components/Sidebar";
import AppointmentCharts from "../../components/patient/AppointmentCharts";
import { useAuth } from "../../context/AuthContext";
import { useHospitals } from "../../hooks/useHospitals";
import { pickList } from "../../services/apiClient";
import { getUserProfile } from "../../services/authService";
import { getMyAppointments, getMyPrescriptions } from "../../services/appointmentsService";
import { doctorName } from "../../utils/format";

const apptDate = (a) => a.acceptedDate || a.appointmentDate || "";
const apptTime = (a) => a.acceptedTime || a.requestedTime || "";

const STATUS_CHIP = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-2xl shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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

/** Doctor home: hospital, today's work, upcoming schedule and appointment charts. */
function DoctorSection() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const { hospitals } = useHospitals(token);
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hospital = hospitals.find((h) => h.name === user?.hospitalName) || null;

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [profileRes, apptRes, prescRes] = await Promise.all([
        getUserProfile(token),
        getMyAppointments(token),
        getMyPrescriptions(token),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data?.user || null);
      setAppointments(pickList(apptRes, "appointments"));
      setPrescriptions(pickList(prescRes, "prescriptions"));
      const failed = [profileRes, apptRes, prescRes].find((r) => !r.success);
      setError(failed ? failed.message : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const today = new Date().toISOString().split("T")[0];
  const stats = useMemo(() => {
    const active = appointments.filter((a) => ["pending", "approved"].includes(a.status));
    const upcoming = active
      .filter((a) => apptDate(a) >= today)
      .sort((a, b) => `${apptDate(a)} ${apptTime(a)}`.localeCompare(`${apptDate(b)} ${apptTime(b)}`));
    return {
      today: active.filter((a) => apptDate(a) === today).length,
      pending: appointments.filter((a) => a.status === "pending").length,
      upcomingApproved: upcoming.filter((a) => a.status === "approved").length,
      patientsSeen: new Set(appointments.filter((a) => a.status === "completed").map((a) => a.patient?.email)).size,
      upcoming,
    };
  }, [appointments, today]);

  const specialization = profile?.doctorSpecialization || (profile?.departments || [])[0];

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white flex items-center justify-between shadow-sm">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome, {doctorName(user?.name || profile?.name)}! 👨‍⚕️</h1>
              <p className="text-sm text-white/85">
                {stats.today > 0
                  ? `You have ${stats.today} appointment${stats.today === 1 ? "" : "s"} today.`
                  : "No appointments scheduled for today."}
                {stats.pending > 0 && ` ${stats.pending} request${stats.pending === 1 ? "" : "s"} waiting for your approval.`}
              </p>
            </div>
            {specialization && (
              <span className="hidden sm:inline-block px-4 py-1.5 rounded-full bg-white/25 text-sm font-medium">{specialization}</span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Your hospital */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl shrink-0">🏥</div>
              <div>
                <p className="text-xs text-gray-400">Your hospital</p>
                <p className="text-lg font-semibold text-gray-800">{hospital?.name || user?.hospitalName || "—"}</p>
                {hospital?.description && <p className="text-sm text-gray-600 mt-0.5">{hospital.description}</p>}
                {hospital?.address && <p className="text-xs text-gray-500 mt-1">📍 {hospital.address}</p>}
              </div>
            </div>
            {hospital?.contactNo && (
              <a
                href={`tel:${hospital.contactNo}`}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm self-start md:self-center"
              >
                📞 {hospital.contactNo}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="📅" label="Today" value={loading ? "…" : stats.today} sub="Appointments today" />
            <StatCard icon="⏳" label="Pending Requests" value={loading ? "…" : stats.pending} sub="Waiting for approval" />
            <StatCard icon="✅" label="Upcoming" value={loading ? "…" : stats.upcomingApproved} sub="Approved appointments" />
            <StatCard
              icon="🧑‍🤝‍🧑"
              label="Patients Seen"
              value={loading ? "…" : stats.patientsSeen}
              sub={`${prescriptions.length} prescription${prescriptions.length === 1 ? "" : "s"} written`}
            />
          </div>

          {/* Upcoming schedule */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Today &amp; Upcoming</h2>
              <button
                onClick={() => navigate("/doctor/appointments")}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
              >
                {stats.pending > 0 ? `Review ${stats.pending} request${stats.pending === 1 ? "" : "s"} →` : "Open appointments →"}
              </button>
            </div>
            {stats.upcoming.length === 0 ? (
              <p className="text-xs text-gray-400">{loading ? "Loading…" : "No upcoming appointments."}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.upcoming.slice(0, 6).map((a) => (
                  <li key={a._id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {a.patient?.name || a.patient?.email} <span className="text-gray-400 font-normal">· {a.department}</span>
                      </p>
                      {a.symptoms && <p className="text-xs text-gray-500 truncate">{a.symptoms}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-medium ${apptDate(a) === today ? "text-green-700" : "text-gray-600"}`}>
                        {apptDate(a) === today ? "Today" : apptDate(a)} · {apptTime(a)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_CHIP[a.status] || "bg-gray-100 text-gray-700"}`}>
                        {a.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Charts */}
          <AppointmentCharts appointments={appointments} loading={loading} />
        </div>
      </div>
    </div>
  );
}

export default DoctorSection;
