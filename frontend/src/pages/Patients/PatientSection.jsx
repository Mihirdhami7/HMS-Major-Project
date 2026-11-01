import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getMyAppointments, getMyPrescriptions } from "../../services/appointmentsService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── health tips (static content) ──────────────────────────────────────────────
const healthTips = [
  { icon: "💧", tip: "Drink at least 8 glasses of water daily." },
  { icon: "🚶", tip: "Take a 30-minute walk for heart health." },
  { icon: "😴", tip: "Get 7–9 hours of sleep for recovery." },
  { icon: "🥦", tip: "Eat vegetables and fruits every meal." },
  { icon: "🧘", tip: "5 minutes of deep breathing reduces stress." },
];

// ── feature cards ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: "📅",
    title: "Book Appointments",
    desc: "Schedule with top specialists 24/7, from any device, in seconds.",
    color: "blue",
    path: "/patient/appointments",
  },
  {
    icon: "🛡️",
    title: "Your History",
    desc: "See all your past appointments and prescriptions in one place.",
    color: "green",
    path: "/patient/appointments",
  },
  {
    icon: "👤",
    title: "Your Profile",
    desc: "Keep your contact details and personal information up to date.",
    color: "amber",
    path: "/patient/profile",
  },
  {
    icon: "🔬",
    title: "Disease Info",
    desc: "Browse reliable information about conditions and treatments.",
    color: "teal",
    path: "/patient/disease",
  },
];

// ── color maps ────────────────────────────────────────────────────────────────
const colorMap = {
  blue:  { bg: "bg-blue-50",   text: "text-blue-600",  border: "border-blue-400" },
  green: { bg: "bg-green-50",  text: "text-green-600", border: "border-green-400" },
  amber: { bg: "bg-amber-50",  text: "text-amber-600", border: "border-amber-400" },
  teal:  { bg: "bg-teal-50",   text: "text-teal-600",  border: "border-teal-400" },
};

const STATUS_COLORS = {
  pending: "#facc15",
  approved: "#60a5fa",
  completed: "#4ade80",
  rejected: "#f87171",
};

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

// ── feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, onClick }) {
  const c = colorMap[color];
  return (
    <div
      className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border-l-4 ${c.border}`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
      <span className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${c.text} group-hover:gap-2 transition-all`}>
        Learn more <span>→</span>
      </span>
    </div>
  );
}

FeatureCard.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string.isRequired,
  desc: PropTypes.string,
  color: PropTypes.oneOf(Object.keys(colorMap)).isRequired,
  onClick: PropTypes.func,
};

// ── custom tooltip for bar chart ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-md px-4 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

/** Last 6 calendar months (oldest first) with booked / completed counts. */
const buildMonthlyData = (appointments) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleString(undefined, { month: "short" }),
      scheduled: 0,
      completed: 0,
    });
  }
  appointments.forEach((a) => {
    const key = (apptDate(a) || "").slice(0, 7);
    const m = months.find((x) => x.key === key);
    if (!m) return;
    m.scheduled += 1;
    if (a.status === "completed") m.completed += 1;
  });
  return months;
};

// ── dashboard content ─────────────────────────────────────────────────────────
function Dashboard({ name, appointments, prescriptions, loading, error, navigate }) {
  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const upcoming = appointments
      .filter((a) => (a.status === "approved" || a.status === "pending") && (apptDate(a) || "") >= today)
      .sort((a, b) => `${apptDate(a)} ${apptTime(a)}`.localeCompare(`${apptDate(b)} ${apptTime(b)}`));
    const completed = appointments.filter((a) => a.status === "completed").length;
    const doctors = new Set(appointments.map((a) => a.doctor?.email).filter(Boolean)).size;
    const byStatus = Object.keys(STATUS_COLORS)
      .map((s) => ({ name: s, value: appointments.filter((a) => a.status === s).length, color: STATUS_COLORS[s] }))
      .filter((s) => s.value > 0);
    return { upcoming, completed, doctors, byStatus, monthly: buildMonthlyData(appointments) };
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
            Your health is our priority. Here&apos;s your summary for today.
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
                {apptDate(next)} {apptTime(next)} · Dr. {next.doctor?.name} · {next.department} ({next.hospitalName}) ·{" "}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">Appointment History</p>
          <p className="text-xs text-gray-400 mb-4">Last 6 months</p>
          <div className="flex gap-4 mb-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Booked
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-green-400 inline-block" /> Completed
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.monthly} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="scheduled" name="Booked" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed"  fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Appointment status donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Appointment Status</p>
            <p className="text-xs text-gray-400">All your appointments</p>
          </div>
          {stats.byStatus.length === 0 ? (
            <p className="text-xs text-gray-400">{loading ? "Loading…" : "No appointments yet."}</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <PieChart width={100} height={100}>
                  <Pie
                    data={stats.byStatus}
                    cx={45}
                    cy={45}
                    innerRadius={32}
                    outerRadius={45}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {stats.byStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-800">{appointments.length}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {stats.byStatus.map((s) => (
                  <p key={s.name} className="flex items-center gap-2 capitalize">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    {s.name} — {s.value}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent prescriptions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Recent Prescriptions</h2>
        {prescriptions.length === 0 ? (
          <p className="text-xs text-gray-400">{loading ? "Loading…" : "No prescriptions yet."}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {prescriptions.slice(0, 3).map((p) => (
              <li key={p._id} className="py-2 text-xs text-gray-600 flex justify-between gap-4">
                <span>
                  Dr. {p.doctor?.name} · {p.department} ·{" "}
                  {(p.medicines || []).map((m) => m.name).join(", ") || "No medicines"}
                </span>
                <span className="text-gray-400 whitespace-nowrap">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* How EasyTreat helps */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">How EasyTreat helps you</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <FeatureCard
              key={f.title}
              {...f}
              onClick={() => f.path && navigate(f.path)}
            />
          ))}
        </div>
      </div>

      {/* Daily tips */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Daily Health Tips</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {healthTips.map(({ icon, tip }, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About EasyTreat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-blue-400">
          <h3 className="text-sm font-semibold text-blue-600 mb-2">What is EasyTreat?</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            EasyTreat is your one-stop solution for managing your health. From booking
            appointments to accessing medical records, EasyTreat makes healthcare
            simple and accessible for everyone.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-green-400">
          <h3 className="text-sm font-semibold text-green-600 mb-2">Why Choose EasyTreat?</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Enjoy seamless healthcare services, personalised health insights, and
            exclusive features tailored to your needs — all in one place, available
            24/7 on any device.
          </p>
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
};

// ── main component ────────────────────────────────────────────────────────────
function PatientSection() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
    <div className="flex bg-gray-50 min-h-screen">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 mt-16">
        <Dashboard
          name={user?.name}
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
