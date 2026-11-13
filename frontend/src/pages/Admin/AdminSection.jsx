import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useHospitals, useDepartments } from "../../hooks/useHospitals";
import { pickList } from "../../services/apiClient";
import { listDoctors, listPatients, listPendingDoctors } from "../../services/userService";
import { getAllAppointments, getPendingPrescriptions } from "../../services/appointmentsService";
import { listOrders, listProducts, listUnapprovedProducts, listMedicineRequests } from "../../services/orderService";
import { doctorName } from "../../utils/format";

const LOW_STOCK = 40; // same threshold the backend uses for "Low Stock"
const GRID = "rgba(148, 163, 184, 0.25)";
const STATUS_COLORS = { pending: "#facc15", approved: "#60a5fa", completed: "#4ade80", rejected: "#f87171", cancelled: "#9ca3af" };
const ORDER_COLORS = { requested: "#facc15", processing: "#60a5fa", completed: "#4ade80", cancelled: "#f87171" };
const RANGES = [
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "year", label: "12 months" },
  { key: "all", label: "All time" },
];

const apptDate = (a) => a.acceptedDate || a.appointmentDate || "";
const isoDay = (d) => d.toISOString().split("T")[0];
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Buckets for the chart: days for week/month, months for year/all. */
const buildBuckets = (range, appointments) => {
  const now = new Date();
  if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
      return { key: isoDay(d), label: `${d.getDate()}/${d.getMonth() + 1}`, booked: 0, completed: 0 };
    });
  }
  let start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  if (range === "all") {
    const earliest = appointments.map(apptDate).filter(Boolean).sort()[0];
    if (earliest) start = new Date(Number(earliest.slice(0, 4)), Number(earliest.slice(5, 7)) - 1, 1);
  }
  const out = [];
  for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    out.push({ key: monthKey(d), label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), booked: 0, completed: 0 });
  }
  return out;
};

function StatCard({ icon, label, value, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 enabled:hover:shadow-md enabled:hover:border-blue-200 transition"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-2xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </button>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.string,
  onClick: PropTypes.func,
};

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            {title && <p className="text-sm font-semibold text-gray-800">{title}</p>}
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  right: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
};

const Empty = ({ text = "No data yet." }) => <p className="text-xs text-gray-400 py-10 text-center">{text}</p>;
Empty.propTypes = { text: PropTypes.string };

/** Admin dashboard (single page): hospital info, overview cards, what needs attention, charts, activity. */
function AdminSection() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const hospitalName = user?.hospitalName || "";
  const [activeTab, setActiveTab] = useState("home");
  const [range, setRange] = useState("year");
  const { hospitals } = useHospitals(token);
  const { departments } = useDepartments(token, { hospitalName });
  const hospital = hospitals.find((h) => h.name === hospitalName) || null;

  const [data, setData] = useState({
    doctors: [], patients: [], pendingDoctors: [], appointments: [], prescriptions: [],
    orders: [], products: [], unapproved: [], requests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return undefined;
    if (!hospitalName) {
      setError("No hospital is linked to this admin account.");
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.all([
        listDoctors(token, hospitalName),
        listPatients(token, hospitalName),
        listPendingDoctors(token, hospitalName),
        getAllAppointments(token),
        getPendingPrescriptions(token),
        listOrders(token),
        listProducts(token, hospitalName),
        listUnapprovedProducts(token, hospitalName),
        listMedicineRequests(token, { status: "open" }),
      ]);
      if (cancelled) return;
      const [doc, pat, pend, appt, presc, ord, prod, unap, req] = results;
      setData({
        doctors: pickList(doc, "doctors"),
        patients: pickList(pat, "patients"),
        pendingDoctors: pickList(pend, "pending_doctors"),
        appointments: pickList(appt, "appointments"),
        prescriptions: pickList(presc, "prescriptions"),
        orders: pickList(ord, "orders"),
        products: pickList(prod, "products"),
        unapproved: pickList(unap, "products"),
        requests: pickList(req, "requests"),
      });
      const failed = results.find((r) => !r.success);
      setError(failed ? failed.message : "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hospitalName]);

  const today = isoDay(new Date());
  const v = (n) => (loading ? "…" : n);

  const stats = useMemo(() => {
    const { appointments, products } = data;
    const lowStock = products.filter((p) => p.product_type === "Medicine" && Number(p.stock) < LOW_STOCK);
    const fees = appointments.flatMap((a) => (a.payments || []).map((p) => ({ ...p, appt: a })));
    return {
      today: appointments.filter((a) => apptDate(a) === today && ["pending", "approved"].includes(a.status)).length,
      pending: appointments.filter((a) => a.status === "pending").length,
      upcoming: appointments.filter((a) => a.status === "approved" && apptDate(a) >= today).length,
      lowStock,
      feesTotal: fees.reduce((s, p) => s + (Number(p.amount) || 0), 0),
      fees,
    };
  }, [data, today]);

  const timeline = useMemo(() => {
    const buckets = buildBuckets(range, data.appointments);
    const byDay = range === "week" || range === "month";
    const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    let inRange = 0;
    data.appointments.forEach((a) => {
      const d = apptDate(a);
      if (!d) return;
      const i = index[byDay ? d.slice(0, 10) : d.slice(0, 7)];
      if (i === undefined) return;
      buckets[i].booked += 1;
      if (a.status === "completed") buckets[i].completed += 1;
      inRange += 1;
    });
    return { buckets, inRange };
  }, [data.appointments, range]);

  const statusPie = useMemo(
    () =>
      Object.keys(STATUS_COLORS)
        .map((s) => ({ name: s, value: data.appointments.filter((a) => a.status === s).length, color: STATUS_COLORS[s] }))
        .filter((s) => s.value > 0),
    [data.appointments]
  );

  const byDepartment = useMemo(() => {
    const counts = {};
    data.appointments.forEach((a) => {
      const dept = a.department || "Unassigned";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [data.appointments]);

  const ordersByStatus = useMemo(() => {
    const counts = {};
    data.orders.forEach((o) => {
      counts[o.status || "unknown"] = (counts[o.status || "unknown"] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count, color: ORDER_COLORS[name] || "#94a3b8" }));
  }, [data.orders]);

  const feesByMonth = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: monthKey(d), label: d.toLocaleString(undefined, { month: "short" }), amount: 0 };
    });
    stats.fees.forEach((p) => {
      const m = months.find((x) => x.key === String(p.paymentDate || p.appt.appointmentDate || "").slice(0, 7));
      if (m) m.amount += Number(p.amount) || 0;
    });
    return months;
  }, [stats.fees]);

  const recent = useMemo(
    () => [...data.appointments]
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
      .slice(0, 6),
    [data.appointments]
  );

  const attention = [
    { count: stats.pending, label: "appointment requests waiting", action: "Review", to: "/admin/newRegister", icon: "📅" },
    { count: data.pendingDoctors.length, label: "doctors waiting for approval", action: "Approve", to: "/admin/department", icon: "🩺" },
    { count: data.prescriptions.length, label: "prescriptions to dispense / bill", action: "Give medicine", to: "/admin/givemedicine", icon: "💊" },
    { count: data.unapproved.length, label: "new supplier products to approve", action: "Review", to: "/admin/product", icon: "📦" },
    { count: stats.lowStock.length, label: `medicines low on stock (< ${LOW_STOCK})`, action: "Order stock", to: "/admin/product", icon: "⚠️" },
    { count: data.requests.length, label: "medicine requests from doctors", action: "View", to: "/admin/product", icon: "📝" },
  ].filter((x) => x.count > 0);

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Hospital information */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl shrink-0">🏥</div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-white/80">Hospital administration</p>
                <h1 className="text-2xl font-bold">{hospital?.name || hospitalName || "—"}</h1>
                {hospital?.description && <p className="text-sm text-white/90 mt-1">{hospital.description}</p>}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85 mt-2">
                  {hospital?.address && <span>📍 {hospital.address}</span>}
                  {hospital?.contactNo && <span>📞 {hospital.contactNo}</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 shrink-0 text-center">
              {[
                ["Departments", departments.length],
                ["Doctors", data.doctors.length],
                ["Patients", data.patients.length],
              ].map(([label, value]) => (
                <div key={label} className="bg-white/20 rounded-xl px-4 py-2">
                  <p className="text-xl font-bold">{v(value)}</p>
                  <p className="text-xs text-white/85">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📅" label="Today's Appointments" value={v(stats.today)} sub={`${stats.upcoming} upcoming approved`} onClick={() => navigate("/admin/newRegister")} />
            <StatCard icon="⏳" label="Pending Requests" value={v(stats.pending)} sub="Waiting for doctor approval" onClick={() => navigate("/admin/newRegister")} />
            <StatCard icon="💊" label="To Dispense" value={v(data.prescriptions.length)} sub="Prescriptions not billed yet" onClick={() => navigate("/admin/givemedicine")} />
            <StatCard icon="💰" label="Booking Fees" value={loading ? "…" : `₹${stats.feesTotal.toLocaleString("en-IN")}`} sub={`${stats.fees.length} online payments`} />
            <StatCard icon="🧑‍⚕️" label="Doctors" value={v(data.doctors.length)} sub={`${data.pendingDoctors.length} awaiting approval`} onClick={() => navigate("/admin/department")} />
            <StatCard icon="🧑‍🤝‍🧑" label="Patients" value={v(data.patients.length)} sub="Registered at this hospital" />
            <StatCard icon="📦" label="Products" value={v(data.products.length)} sub={`${stats.lowStock.length} medicines low on stock`} onClick={() => navigate("/admin/product")} />
            <StatCard icon="🚚" label="Stock Orders" value={v(data.orders.length)} sub={`${data.orders.filter((o) => o.status !== "completed").length} open`} onClick={() => navigate("/admin/product")} />
          </div>

          {/* Needs attention + recent activity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="Needs attention" subtitle="Open items across the hospital">
              {loading ? (
                <Empty text="Loading…" />
              ) : attention.length === 0 ? (
                <Empty text="All caught up — nothing waiting." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {attention.map((item) => (
                    <li key={item.label} className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700">
                        <span className="mr-2">{item.icon}</span>
                        <span className="font-semibold text-gray-800">{item.count}</span> {item.label}
                      </span>
                      <button
                        onClick={() => navigate(item.to)}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        {item.action} →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Recent appointment activity" subtitle="Latest updates">
              {loading ? (
                <Empty text="Loading…" />
              ) : recent.length === 0 ? (
                <Empty text="No appointments yet." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recent.map((a) => (
                    <li key={a._id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {a.patient?.name || a.patient?.email} <span className="text-gray-400 font-normal">→ {doctorName(a.doctor?.name)}</span>
                        </p>
                        <p className="text-xs text-gray-500">{a.department} · {apptDate(a)} {a.acceptedTime || a.requestedTime || ""}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs capitalize text-gray-800" style={{ backgroundColor: `${STATUS_COLORS[a.status] || "#cbd5e1"}55` }}>
                        {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Appointments over time + status */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card
              className="xl:col-span-2"
              title="Appointments over time"
              subtitle={`${timeline.inRange} appointment${timeline.inRange === 1 ? "" : "s"} in this period`}
              right={
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
              }
            >
              {timeline.inRange === 0 ? (
                <Empty text={loading ? "Loading…" : "No appointments in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={timeline.buckets} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="booked" name="Booked" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Appointment status" subtitle="All appointments">
              {statusPie.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No appointments yet."} />
              ) : (
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    <PieChart width={140} height={140}>
                      <Pie data={statusPie} cx={65} cy={65} innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                        {statusPie.map((s) => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-800">{data.appointments.length}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1.5">
                    {statusPie.map((s) => (
                      <p key={s.name} className="flex items-center gap-2 capitalize">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        {s.name} — {s.value}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Departments, stock orders, booking fees */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card title="Appointments by department" subtitle="All time">
              {byDepartment.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No appointments yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byDepartment} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="count" name="Appointments" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Stock orders by status" subtitle="Orders to suppliers">
              {ordersByStatus.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No stock orders yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ordersByStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                      {ordersByStatus.map((o) => <Cell key={o.name} fill={o.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Booking fees collected" subtitle="Online payments, last 6 months">
              {stats.fees.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No online payments yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={feesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} cursor={{ fill: "rgba(34,197,94,0.08)" }} />
                    <Bar dataKey="amount" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Low stock list */}
          {stats.lowStock.length > 0 && (
            <Card title="Medicines low on stock" subtitle={`Below ${LOW_STOCK} strips`}
              right={<button onClick={() => navigate("/admin/product")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Order stock →</button>}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.lowStock.map((p) => (
                  <div key={p._id} className="rounded-xl border border-gray-100 p-3">
                    <p className="font-medium text-gray-800 truncate">{p.product_name}</p>
                    <p className="text-xs text-gray-500">{p.supplier_company}</p>
                    <p className={`text-sm font-semibold mt-1 ${Number(p.stock) <= 10 ? "text-red-700" : "text-yellow-800"}`}>{p.stock} left</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminSection;
