import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import { FiRefreshCw } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { getSuperAdminDashboard } from "../../services/superAdminService";
import { Card, Empty } from "../Supplier/SupplierUi";
import { money, PAGE_FRAME } from "../Supplier/supplierUtils";
import { KpiCard, PeriodTabs } from "./SuperAdminUi";
import { APPOINTMENT_STATUS, AXIS, GRID, fmtDate } from "./superAdminConfig";

const STATUS = APPOINTMENT_STATUS;
const STATUS_COLOR = Object.fromEntries(STATUS.map((s) => [s.key, s.color]));

/** Super admin dashboard: all hospitals, filterable by period and hospital. */
function SuperAdminSection() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [period, setPeriod] = useState("month");
  const [hospital, setHospital] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSuperAdminDashboard(token, { period, hospital });
    if (result.success) setData(result.data);
    else setError(result.message);
    setLoading(false);
  }, [token, period, hospital]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = data?.cards || {};
  const v = (n) => (loading && !data ? "…" : (n ?? 0).toLocaleString("en-IN"));
  const vs = data?.period && data.period !== "all" ? `vs last ${data.period}` : "";
  const displayName = user?.name || "Super Admin";
  const hasAppointments = (data?.timeline || []).some((b) => b.total > 0);
  const hasRevenue = (data?.revenueTimeline || []).some((b) => b.amount > 0);
  const hospitalRows = data?.byHospital || [];

  return (
    <div className={PAGE_FRAME}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Welcome + filters */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl shrink-0">🌐</div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Welcome back, {displayName}!</h1>
                <p className="text-sm text-white/90 mt-1">
                  {data ? `${hospital || "All hospitals"} · ${fmtDate(data.range.start)} – ${fmtDate(data.range.end)}` : "Loading…"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PeriodTabs value={period} onChange={setPeriod} />
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm text-gray-800 bg-white"
                aria-label="Hospital"
              >
                <option value="">All hospitals</option>
                {(data?.hospitals || []).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <button onClick={load} disabled={loading} className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30" title="Refresh">
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex justify-between">
              <p className="text-red-700">{error}</p>
              <button onClick={load} className="text-sm text-red-700 underline">Retry</button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
            <KpiCard icon="🏥" label="Hospitals" value={v(cards.hospitals)} sub={`${v(cards.departments)} departments`} onClick={() => navigate("/superadmin/hospitals")} />
            <KpiCard icon="🧑‍⚕️" label="Doctors" value={v(cards.doctors)} sub={`${v(cards.pendingDoctors)} waiting for approval`} />
            <KpiCard icon="🧑‍🤝‍🧑" label="Patients" value={v(cards.patients)} sub="Registered" />
            <KpiCard icon="🚚" label="Suppliers" value={v(cards.suppliers)} sub="Companies" onClick={() => navigate("/superadmin/suppliers")} />
            <KpiCard icon="📅" label="Appointments" value={v(cards.appointments)} change={cards.appointmentsChange ?? undefined}
              vs={vs} sub={data?.periodLabel || ""} />
            <KpiCard icon="💰" label="Revenue" value={loading && !data ? "…" : money(cards.revenue)} change={cards.revenueChange ?? undefined}
              vs={vs} sub="Fees + pharmacy" onClick={() => navigate("/superadmin/finance")} />
          </div>

          {/* Appointments over time + status */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2" title="Appointments over time" subtitle={`By status · ${data?.periodLabel || ""}`}>
              {!hasAppointments ? (
                <Empty text={loading ? "Loading…" : "No appointments in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.timeline} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {STATUS.map((s) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Appointment status" subtitle={`${v(cards.appointments)} appointments`}>
              {!(data?.byStatus || []).length ? (
                <Empty text={loading ? "Loading…" : "No appointments in this period."} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={data.byStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {data.byStatus.map((s) => <Cell key={s.status} fill={STATUS_COLOR[s.status] || "#9ca3af"} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
                    {data.byStatus.map((s) => (
                      <span key={s.status} className="flex items-center gap-1 capitalize">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />{s.status} ({s.count})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Appointments by hospital + departments */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2" title="Appointments by hospital" subtitle="Stacked by status — click a bar to filter">
              {!hospitalRows.some((h) => h.appointments > 0) ? (
                <Empty text={loading ? "Loading…" : "No appointments in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, hospitalRows.length * 56)}>
                  <BarChart data={hospitalRows} layout="vertical" margin={{ left: 10 }}
                    onClick={(e) => e?.activeLabel && setHospital(e.activeLabel === hospital ? "" : e.activeLabel)}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="hospital" width={120} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    {STATUS.map((s) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} stackId="h" fill={s.color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Top departments" subtitle="Appointments in this period">
              {!(data?.byDepartment || []).length ? (
                <Empty text={loading ? "Loading…" : "No appointments in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.byDepartment} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="department" width={110} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="count" name="Appointments" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Revenue */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2" title="Revenue over time" subtitle="Booking fees + pharmacy bills">
              {!hasRevenue ? (
                <Empty text={loading ? "Loading…" : "No revenue in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.revenueTimeline}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val) => money(val)} />
                    <Area type="monotone" dataKey="amount" name="Revenue" stroke="#16a34a" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Revenue by hospital" subtitle={data?.periodLabel || ""}>
              {!hospitalRows.some((h) => h.revenue > 0) ? (
                <Empty text={loading ? "Loading…" : "No revenue in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hospitalRows} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="hospital" width={110} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val) => money(val)} cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Hospitals table */}
          <Card title="Hospitals" subtitle={`Numbers for ${data?.periodLabel || "the period"} · staff and patients are current totals`}>
            {!hospitalRows.length ? (
              <Empty text={loading ? "Loading…" : "No hospitals yet."} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      {["Hospital", "Departments", "Doctors", "Pending doctors", "Patients", "Appointments", "Pending", "Completed", "Revenue"].map((h) => (
                        <th key={h} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hospitalRows.map((h) => (
                      <tr key={h.hospital} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setHospital(h.hospital === hospital ? "" : h.hospital)}>
                        <td className="py-2.5 pr-3 font-medium text-gray-800">{h.hospital}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{h.departments}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{h.doctors}</td>
                        <td className={`py-2.5 pr-3 ${h.pendingDoctors ? "text-yellow-700 font-semibold" : "text-gray-700"}`}>{h.pendingDoctors}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{h.patients}</td>
                        <td className="py-2.5 pr-3 text-gray-800 font-semibold">{h.appointments}</td>
                        <td className={`py-2.5 pr-3 ${h.pending ? "text-yellow-700 font-semibold" : "text-gray-700"}`}>{h.pending}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{h.completed}</td>
                        <td className="py-2.5 pr-3 text-gray-800">{money(h.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminSection;
