import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { FiRefreshCw } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierProducts, getSupplierOrders } from "../../services/orderService";

const LOW_STOCK = 40; // same threshold the backend uses for "Low Stock"
const GRID = "rgba(148, 163, 184, 0.25)";
const ORDER_COLORS = { requested: "#facc15", processing: "#60a5fa", completed: "#4ade80", cancelled: "#f87171" };
const STATUS_STYLES = {
  requested: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const RANGES = [
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "year", label: "12 months" },
  { key: "all", label: "All time" },
];

const orderDate = (order) => {
  const raw = order.order_date || order.created_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
// Value of an order: what was fulfilled (or ordered, before fulfilment) times the unit price.
const orderQty = (o) => o.quantity_fulfilled || o.quantity_ordered || 0;
const orderAmount = (o) => orderQty(o) * (Number(o.price_per_strip) || 0);
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const isoDay = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;
const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");

/** Chart buckets: days for week/month, months for year/all. */
const buildBuckets = (range, orders) => {
  const now = new Date();
  if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
      return { key: isoDay(d), label: `${d.getDate()}/${d.getMonth() + 1}`, orders: 0, revenue: 0 };
    });
  }
  let start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  if (range === "all") {
    const earliest = orders.map(orderDate).filter(Boolean).sort((a, b) => a - b)[0];
    if (earliest && earliest < start) start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  }
  const out = [];
  for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    out.push({ key: monthKey(d), label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), orders: 0, revenue: 0 });
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

/** Supplier dashboard (single page): welcome, overview cards, what needs attention, analytics, recent orders. */
function SupplierSection() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [range, setRange] = useState("year");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const [productsResult, ordersResult] = await Promise.all([getSupplierProducts(token), getSupplierOrders(token)]);
    setProducts(productsResult.success ? pickList(productsResult, "products") : []);
    setOrders(ordersResult.success ? pickList(ordersResult, "orders") : []);
    const failed = [productsResult, ordersResult].find((r) => !r.success);
    if (failed) setError(failed.message);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = user?.name || user?.email?.split("@")[0] || "Supplier";
  const v = (n) => (loading ? "…" : n);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const approved = products.filter((p) => p.is_approved);
    const now = new Date();
    const thisMonth = completed.filter((o) => {
      const d = orderDate(o);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      requested: orders.filter((o) => o.status === "requested"),
      processing: orders.filter((o) => o.status === "processing"),
      completed,
      revenue: completed.reduce((s, o) => s + orderAmount(o), 0),
      monthRevenue: thisMonth.reduce((s, o) => s + orderAmount(o), 0),
      approved,
      awaiting: products.filter((p) => !p.is_approved),
      lowStock: approved.filter((p) => (Number(p.stock) || 0) < LOW_STOCK),
      hospitals: new Set([...orders.map((o) => o.hospitalName), ...products.map((p) => p.hospitalName)].filter(Boolean)).size,
      units: completed.reduce((s, o) => s + orderQty(o), 0),
    };
  }, [orders, products]);

  // Orders and completed revenue over time for the selected range
  const timeline = useMemo(() => {
    const buckets = buildBuckets(range, orders);
    const daily = range === "week" || range === "month";
    const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    orders.forEach((o) => {
      const d = orderDate(o);
      if (!d) return;
      const i = index[daily ? isoDay(d) : monthKey(d)];
      if (i === undefined) return;
      buckets[i].orders += 1;
      if (o.status === "completed") buckets[i].revenue += orderAmount(o);
    });
    const inRange = buckets.reduce((s, b) => s + b.orders, 0);
    return { buckets: buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue) })), inRange };
  }, [orders, range]);

  const statusPie = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const s = o.status || "requested";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([s, value]) => ({ name: capitalize(s), value, color: ORDER_COLORS[s] || "#9ca3af" }));
  }, [orders]);

  const byHospital = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.hospitalName || "Unknown";
      if (!map[name]) map[name] = { name, orders: 0, revenue: 0 };
      map[name].orders += 1;
      if (o.status === "completed") map[name].revenue += orderAmount(o);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders).slice(0, 6)
      .map((h) => ({ ...h, revenue: Math.round(h.revenue) }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.product_name || "Unknown";
      if (!map[name]) map[name] = { name, units: 0, revenue: 0 };
      map[name].units += orderQty(o);
      if (o.status === "completed") map[name].revenue += orderAmount(o);
    });
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 6);
  }, [orders]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => (orderDate(b)?.getTime() || 0) - (orderDate(a)?.getTime() || 0)).slice(0, 8),
    [orders]
  );

  const attention = [
    { icon: "📥", label: "New stock requests to fulfil", count: stats.requested.length },
    { icon: "⏳", label: "Fulfilled, waiting for hospital payment", count: stats.processing.length },
    { icon: "🕒", label: "Products waiting for hospital approval", count: stats.awaiting.length },
    { icon: "⚠️", label: `Approved products low on stock (< ${LOW_STOCK})`, count: stats.lowStock.length },
  ];

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl shrink-0">🚚</div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-white/80">Supplier dashboard</p>
                <h1 className="text-2xl font-bold">Welcome back, {displayName}! 👋</h1>
                <p className="text-sm text-white/90 mt-1">Track your stock orders, revenue and products across hospitals.</p>
                {user?.email && <p className="text-sm text-white/85 mt-2">✉️ {user.email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["Hospitals", stats.hospitals],
                  ["Products", products.length],
                  ["Orders", orders.length],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white/20 rounded-xl px-4 py-2">
                    <p className="text-xl font-bold">{v(value)}</p>
                    <p className="text-xs text-white/85">{label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={load}
                disabled={loading}
                title="Refresh"
                className="p-3 rounded-xl bg-white/20 hover:bg-white/30"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📥" label="New Requests" value={v(stats.requested.length)} sub="Stock orders to fulfil" onClick={() => navigate("/supplier/suppproduct")} />
            <StatCard icon="⏳" label="Processing" value={v(stats.processing.length)} sub="Waiting for hospital payment" onClick={() => navigate("/supplier/suppproduct")} />
            <StatCard icon="✅" label="Completed Orders" value={v(stats.completed.length)} sub={`${stats.units.toLocaleString("en-IN")} strips delivered`} />
            <StatCard icon="💰" label="Total Revenue" value={loading ? "…" : money(stats.revenue)} sub={`${money(stats.monthRevenue)} this month`} />
            <StatCard icon="📦" label="Products" value={v(products.length)} sub={`${stats.approved.length} approved by hospitals`} onClick={() => navigate("/supplier/suppproduct")} />
            <StatCard icon="🕒" label="Awaiting Approval" value={v(stats.awaiting.length)} sub="Not yet approved by hospital" onClick={() => navigate("/supplier/suppproduct")} />
            <StatCard icon="⚠️" label="Low Stock" value={v(stats.lowStock.length)} sub={`Approved products under ${LOW_STOCK}`} onClick={() => navigate("/supplier/suppproduct")} />
            <StatCard icon="🏥" label="Hospitals" value={v(stats.hospitals)} sub="You supply to" />
          </div>

          {/* Orders over time + needs attention */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card
              className="xl:col-span-2"
              title="Orders & revenue"
              subtitle={`${timeline.inRange} orders in range · revenue from completed orders`}
              right={
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRange(r.key)}
                      className={`px-2.5 py-1 text-xs rounded-md ${range === r.key ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              }
            >
              {timeline.inRange === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders in this period."} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={timeline.buckets} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} formatter={(val, name) => (name === "Revenue" ? money(val) : val)} />
                    <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Needs attention" subtitle="Open work for you">
              <div className="space-y-2">
                {attention.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate("/supplier/suppproduct")}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <span>{a.icon}</span>{a.label}
                    </span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${a.count ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-700"}`}>
                      {v(a.count)}
                    </span>
                  </button>
                ))}
              </div>
              {stats.lowStock.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Low stock</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {stats.lowStock.slice(0, 8).map((p) => (
                      <div key={p._id || `${p.product_name}-${p.hospitalName}`} className="flex justify-between text-xs">
                        <span className="text-gray-700 truncate">{p.product_name} <span className="text-gray-400">· {p.hospitalName}</span></span>
                        <span className="font-semibold text-red-600 shrink-0 ml-2">{p.stock || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Breakdown charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card title="Order status" subtitle="All stock orders">
              {statusPie.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {statusPie.map((s) => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
                    {statusPie.map((s) => (
                      <span key={s.name} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name} ({s.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card title="Revenue by hospital" subtitle="Completed orders">
              {byHospital.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={byHospital} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} formatter={(val, name) => (name === "Revenue" ? money(val) : val)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Top products" subtitle="Strips ordered by hospitals">
              {topProducts.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="units" name="Strips" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Recent orders */}
          <Card
            title="Recent orders"
            subtitle="Latest stock orders from hospitals"
            right={
              <button onClick={() => navigate("/supplier/suppproduct")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                View all
              </button>
            }
          >
            {recentOrders.length === 0 ? (
              <Empty text={loading ? "Loading…" : "No orders yet."} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3 font-medium">Hospital</th>
                      <th className="py-2 pr-3 font-medium">Product</th>
                      <th className="py-2 pr-3 font-medium">Quantity</th>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Amount</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o._id || o.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 pr-3 text-gray-800">{o.hospitalName}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{o.product_name}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{orderQty(o)}</td>
                        <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{orderDate(o) ? orderDate(o).toLocaleDateString() : "—"}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{money(orderAmount(o))}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] || STATUS_STYLES.requested}`}>
                            {capitalize(o.status || "requested")}
                          </span>
                        </td>
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

export default SupplierSection;
