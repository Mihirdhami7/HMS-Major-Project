import { useMemo, useState } from "react";
import PropTypes from "prop-types";
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

const STATUS_COLORS = {
  pending: "#facc15",
  approved: "#60a5fa",
  completed: "#4ade80",
  rejected: "#f87171",
  cancelled: "#9ca3af",
};

const apptDate = (a) => a.acceptedDate || a.appointmentDate || "";

const RANGES = [
  { key: "6", label: "6 months", months: 6 },
  { key: "12", label: "12 months", months: 12 },
  { key: "all", label: "All time", months: null },
];

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Month buckets (oldest first) with booked / completed counts. */
const buildMonthlyData = (appointments, monthsBack) => {
  const now = new Date();
  let start;
  if (monthsBack) {
    start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  } else {
    const earliest = appointments.map(apptDate).filter(Boolean).sort()[0];
    start = earliest ? new Date(Number(earliest.slice(0, 4)), Number(earliest.slice(5, 7)) - 1, 1) : now;
  }
  const months = [];
  for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    months.push({
      key: monthKey(d),
      month: d.toLocaleString(undefined, { month: "short", ...(monthsBack ? {} : { year: "2-digit" }) }),
      scheduled: 0,
      completed: 0,
    });
  }
  appointments.forEach((a) => {
    const m = months.find((x) => x.key === apptDate(a).slice(0, 7));
    if (!m) return;
    m.scheduled += 1;
    if (a.status === "completed") m.completed += 1;
  });
  return months;
};

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

/** Appointment history bar chart + status donut for one patient's appointments. */
export default function AppointmentCharts({ appointments, loading }) {
  const [range, setRange] = useState("12");
  const monthsBack = RANGES.find((r) => r.key === range)?.months ?? null;

  const monthly = useMemo(() => buildMonthlyData(appointments, monthsBack), [appointments, monthsBack]);
  const byStatus = useMemo(
    () =>
      Object.keys(STATUS_COLORS)
        .map((s) => ({ name: s, value: appointments.filter((a) => a.status === s).length, color: STATUS_COLORS[s] }))
        .filter((s) => s.value > 0),
    [appointments]
  );
  const inRange = monthly.reduce((sum, m) => sum + m.scheduled, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Appointment History</p>
            <p className="text-xs text-gray-400">{inRange} appointment{inRange === 1 ? "" : "s"} in this period</p>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 ${range === r.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Booked
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-green-400 inline-block" /> Completed
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="scheduled" name="Booked" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="#4ade80" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status donut */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Appointment Status</p>
          <p className="text-xs text-gray-400">All your appointments</p>
        </div>
        {byStatus.length === 0 ? (
          <p className="text-xs text-gray-400">{loading ? "Loading…" : "No appointments yet."}</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <PieChart width={110} height={110}>
                <Pie data={byStatus} cx={50} cy={50} innerRadius={36} outerRadius={50} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-800">{appointments.length}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              {byStatus.map((s) => (
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
  );
}

AppointmentCharts.propTypes = {
  appointments: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};
