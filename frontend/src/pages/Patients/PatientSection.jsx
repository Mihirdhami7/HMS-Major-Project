import { useState, useEffect,} from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Slidebar from "../../components/Sidebar";
import Appointment from "./Appointments";
import Disease from "./Disease";
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

// ── appointment history data ──────────────────────────────────────────────────
const appointmentData = [
  { month: "Dec", scheduled: 1, completed: 1 },
  { month: "Jan", scheduled: 2, completed: 2 },
  { month: "Feb", scheduled: 1, completed: 1 },
  { month: "Mar", scheduled: 3, completed: 2 },
  { month: "Apr", scheduled: 2, completed: 2 },
  { month: "May", scheduled: 1, completed: 0 },
];

// ── health score breakdown data ───────────────────────────────────────────────
const healthData = [
  { name: "Good", value: 82, color: "#22c55e" },
  { name: "Needs attention", value: 18, color: "#e5e7eb" },
];

// ── health tips ───────────────────────────────────────────────────────────────
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
    title: "Secure Records",
    desc: "Access and share your medical records safely at any time.",
    color: "green",
    path: null,
  },
  {
    icon: "💡",
    title: "Health Insights",
    desc: "Get personalised tips and recommendations based on your profile.",
    color: "amber",
    path: null,
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

// ── dashboard content ─────────────────────────────────────────────────────────
function Dashboard({ userData, navigate }) {
  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {userData?.name}! 👋
          </h1>
          <p className="text-sm text-white/85">
            Your health is our priority. Here's your summary for today.
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-2xl font-bold shrink-0">
          {userData?.name?.[0] ?? "P"}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Appointments"  value="0"   sub="No upcoming" />
        <StatCard icon="📁" label="Medical Records" value="3" sub="Reports saved" />
        <StatCard icon="❤️" label="Health Score"  value="82"  sub="Out of 100" />
        <StatCard icon="👨‍⚕️" label="Doctors"      value="2"   sub="Assigned to you" />
      </div>

      {/* Next appointment */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">
            📅
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Next Appointment</p>
            <p className="text-xs text-gray-400 mt-0.5">You have no upcoming appointments scheduled.</p>
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
              <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Scheduled
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-green-400 inline-block" /> Completed
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={appointmentData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="scheduled" name="Scheduled" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed"  fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health score donut + tips */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Health Score</p>
            <p className="text-xs text-gray-400">Based on your profile</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <PieChart width={100} height={100}>
                <Pie
                  data={healthData}
                  cx={45}
                  cy={45}
                  innerRadius={32}
                  outerRadius={45}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {healthData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-800">82</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> Good — 82%</p>
              <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" /> Needs attention — 18%</p>
              <p className="text-gray-400 mt-2 leading-relaxed">Keep up your healthy habits to improve your score!</p>
            </div>
          </div>
        </div>
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

// ── main component ────────────────────────────────────────────────────────────
function PatientSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const email    = localStorage.getItem("userEmail");
    const userType = localStorage.getItem("userType");
    setUserData({ name: "Patient", email, type: userType });
  }, []);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />
      <div className="flex-1 p-6 mt-16">
        <Routes>
          <Route path="/patient/appointments" element={<Appointment />} />
          <Route path="/patient/disease"      element={<Disease />} />
          <Route
            path="*"
            element={<Dashboard userData={userData} navigate={navigate} />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default PatientSection;