import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getMyAppointments, getMyPrescriptions } from "../../services/appointmentsService";
import { useHospitals } from "../../hooks/useHospitals";
import PrescriptionActions from "../../components/patient/PrescriptionActions";

import { doctorName } from "../../utils/format";
const apptDate = (a) => a.acceptedDate || a.appointmentDate;
const apptTime = (a) => a.acceptedTime || a.requestedTime || "";

// ── stat card ─────────────────────────────────────────────────────────────────
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

// ── dashboard content ─────────────────────────────────────────────────────────
function Dashboard({ name, hospital, hospitalName, appointments, prescriptions, loading, error, navigate }) {
  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const upcoming = appointments
      .filter((a) => (a.status === "approved" || a.status === "pending") && (apptDate(a) || "") >= today)
      .sort((a, b) => `${apptDate(a)} ${apptTime(a)}`.localeCompare(`${apptDate(b)} ${apptTime(b)}`));
    const completed = appointments.filter((a) => a.status === "completed").length;
    const doctors = new Set(appointments.map((a) => a.doctor?.email).filter(Boolean)).size;
    // Payments recorded on the patient's appointments (appointment.payments[])
    const payments = appointments
      .flatMap((a) =>
        (a.payments || []).map((p) => ({
          ...p,
          key: `${a._id}-${p.paymentId || p.paymentDate}`,
          doctor: a.doctor?.name,
          department: a.department,
          date: p.paymentDate || a.appointmentDate,
        }))
      )
      .sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")));
    const totalPaid = payments
      .filter((p) => !p.status || ["completed", "success", "paid"].includes(String(p.status).toLowerCase()))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return { upcoming, completed, doctors, payments, totalPaid };
  }, [appointments, today]);

  const next = stats.upcoming[0];

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Welcome back{name ? `, ${name}` : ""}! 👋
          </h1>
          <p className="text-sm text-white/85">
            Your health is our priority at {hospital?.name || hospitalName || "your hospital"}. Here&apos;s your summary for today.
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-2xl font-bold shrink-0">
          {name?.[0]?.toUpperCase() ?? ""}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Your hospital */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl shrink-0">🏥</div>
          <div>
            <p className="text-xs text-gray-400">Your hospital</p>
            <p className="text-lg font-semibold text-gray-800">{hospital?.name || hospitalName || "—"}</p>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="📋"
          label="Upcoming Appointments"
          value={loading ? "…" : stats.upcoming.length}
          sub={stats.upcoming.length ? "Pending or approved" : "No upcoming"}
        />
        <StatCard
          icon="📁"
          label="Prescriptions"
          value={loading ? "…" : prescriptions.length}
          sub="From your doctors"
        />
        <StatCard
          icon="✅"
          label="Completed Visits"
          value={loading ? "…" : stats.completed}
          sub={`${appointments.length} booked in total`}
        />
        <StatCard
          icon="👨‍⚕️"
          label="Doctors"
          value={loading ? "…" : stats.doctors}
          sub="You have consulted"
        />
      </div>

      {/* Next appointment */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">
            📅
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Next Appointment</p>
            {next ? (
              <p className="text-xs text-gray-500 mt-0.5">
                {apptDate(next)} {apptTime(next)} · {doctorName(next.doctor?.name)} · {next.department} ({next.hospitalName}) ·{" "}
                <span className="capitalize">{next.status}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">You have no upcoming appointments scheduled.</p>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate("/patient/appointments")}
          className="bg-gradient-to-r from-blue-500 to-green-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
        >
          Book Now →
        </button>
      </div>

      {/* Payments + prescriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Payments</h2>
            <span className="text-xs text-gray-500">
              Total paid: <span className="font-semibold text-green-700">₹{stats.totalPaid.toLocaleString("en-IN")}</span>
            </span>
          </div>
          {stats.payments.length === 0 ? (
            <p className="text-xs text-gray-400">{loading ? "Loading…" : "No payments yet."}</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {stats.payments.map((p) => (
                <li key={p.key} className="py-2 text-xs text-gray-600 flex justify-between gap-4">
                  <span>
                    ₹{Number(p.amount || 0).toLocaleString("en-IN")} · {p.paymentType || "payment"} · {doctorName(p.doctor)} ({p.department})
                  </span>
                  <span className="text-gray-400 whitespace-nowrap capitalize">
                    {p.date ? new Date(p.date).toLocaleDateString() : ""} {p.status ? `· ${p.status}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">My Prescriptions</h2>
          {prescriptions.length === 0 ? (
            <p className="text-xs text-gray-400">{loading ? "Loading…" : "No prescriptions yet."}</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {prescriptions.map((p) => (
                <li key={p._id} className="py-2 text-xs text-gray-600">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium text-gray-700">{doctorName(p.doctor?.name)} · {p.department}</span>
                    <span className="text-gray-400 whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="mt-0.5">
                    {(p.medicines || [])
                      .map((m) => [m.name, m.dosage, m.duration].filter(Boolean).join(" "))
                      .join(", ") || "No medicines"}
                  </p>
                  {p.suggestions && <p className="text-gray-400 mt-0.5">Advice: {p.suggestions}</p>}
                  <PrescriptionActions prescriptionId={p._id} showEmail={false} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}

Dashboard.propTypes = {
  name: PropTypes.string,
  appointments: PropTypes.array.isRequired,
  prescriptions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  navigate: PropTypes.func.isRequired,
  hospital: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    address: PropTypes.string,
    contactNo: PropTypes.string,
  }),
  hospitalName: PropTypes.string,
};

// ── main component ────────────────────────────────────────────────────────────
function PatientSection() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { hospitals } = useHospitals(token);
  const hospital = hospitals.find((h) => h.name === user?.hospitalName) || null;

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [apptRes, prescRes] = await Promise.all([
        getMyAppointments(token),
        getMyPrescriptions(token),
      ]);
      if (cancelled) return;
      setAppointments(pickList(apptRes, "appointments"));
      setPrescriptions(pickList(prescRes, "prescriptions"));
      const failed = [apptRes, prescRes].find((r) => !r.success);
      setError(failed ? failed.message : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <Dashboard
          name={user?.name}
          hospital={hospital}
          hospitalName={user?.hospitalName}
          appointments={appointments}
          prescriptions={prescriptions}
          loading={loading}
          error={error}
          navigate={navigate}
        />
      </div>
    </div>
  );
}

export default PatientSection;
