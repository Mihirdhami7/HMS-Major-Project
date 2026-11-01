import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Slidebar from "../../components/Sidebar";
import { FiCalendar, FiCheckCircle, FiClock, FiPackage } from "react-icons/fi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { getAllAppointments } from "../../services/appointmentsService";
import { listOrders, listProducts } from "../../services/orderService";
import { pickList } from "../../services/apiClient";

const BAR_COLOR = "#2563eb";
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (d) => d.toISOString().split("T")[0];
const LOW_STOCK = 10;

// Build the time buckets for the selected range (days for week/month, months for year)
const buildBuckets = (range) => {
  const now = new Date();
  if (range === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: d.toLocaleString("en-US", { month: "short" }), count: 0 };
    });
  }
  const days = range === "week" ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * DAY_MS);
    const key = isoDay(d);
    return { key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 };
  });
};

const StatCard = ({ label, value, icon, border }) => (
  <div className={`bg-white p-6 rounded-lg shadow-lg border-l-4 ${border}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-600">{label}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
      </div>
      {icon}
    </div>
  </div>
);

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node,
  border: PropTypes.string,
};

const ChartCard = ({ title, empty, children }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg">
    <h3 className="text-xl font-semibold text-blue-700 mb-4">{title}</h3>
    {empty ? (
      <p className="text-gray-500 text-center py-16">No data for this period.</p>
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        {children}
      </ResponsiveContainer>
    )}
  </div>
);

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  empty: PropTypes.bool,
  children: PropTypes.element.isRequired,
};

const Dashboard = () => {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timeRange, setTimeRange] = useState("month");

  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
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
      setError("");
      const [apptRes, orderRes, prodRes] = await Promise.all([
        getAllAppointments(token),
        listOrders(token),
        listProducts(token, hospitalName),
      ]);
      if (cancelled) return;
      setAppointments(pickList(apptRes, "appointments"));
      setOrders(pickList(orderRes, "orders"));
      setProducts(pickList(prodRes, "products"));
      const failed = [apptRes, orderRes, prodRes].find((r) => !r.success);
      if (failed) setError(failed.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hospitalName]);

  const bucketed = useMemo(() => {
    const buckets = buildBuckets(timeRange);
    const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    const inRange = [];
    appointments.forEach((a) => {
      const date = a.acceptedDate || a.appointmentDate;
      if (!date) return;
      const key = timeRange === "year" ? String(date).slice(0, 7) : String(date).slice(0, 10);
      if (index[key] !== undefined) {
        buckets[index[key]].count += 1;
        inRange.push(a);
      }
    });
    return { buckets, inRange };
  }, [appointments, timeRange]);

  const byDepartment = useMemo(() => {
    const counts = {};
    bucketed.inRange.forEach((a) => {
      const dept = a.department || "Unassigned";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [bucketed]);

  const ordersByStatus = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const s = o.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [orders]);

  const stats = useMemo(() => {
    const list = bucketed.inRange;
    return {
      total: list.length,
      completed: list.filter((a) => a.status === "completed").length,
      pending: list.filter((a) => a.status === "pending").length,
      lowStock: products.filter((p) => Number(p.stock) <= LOW_STOCK).length,
    };
  }, [bucketed, products]);

  const v = (n) => (loading ? "…" : n);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-blue-700">Dashboard Overview</h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard label="Appointments" value={v(stats.total)} border="border-blue-500"
              icon={<FiCalendar className="text-2xl text-blue-500" />} />
            <StatCard label="Completed" value={v(stats.completed)} border="border-green-500"
              icon={<FiCheckCircle className="text-2xl text-green-500" />} />
            <StatCard label="Pending" value={v(stats.pending)} border="border-yellow-500"
              icon={<FiClock className="text-2xl text-yellow-500" />} />
            <StatCard label={`Products low on stock (≤${LOW_STOCK})`} value={v(stats.lowStock)} border="border-purple-500"
              icon={<FiPackage className="text-2xl text-purple-500" />} />
          </div>

          {loading ? (
            <p className="text-center text-gray-500 py-16">Loading dashboard…</p>
          ) : (
            <div className="space-y-8">
              <ChartCard title="Appointments over time" empty={bucketed.inRange.length === 0}>
                <BarChart data={bucketed.buckets}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                  <Bar dataKey="count" name="Appointments" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title="Appointments by department" empty={byDepartment.length === 0}>
                  <BarChart data={byDepartment} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="count" name="Appointments" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartCard>

                <ChartCard title="Stock orders by status (all time)" empty={ordersByStatus.length === 0}>
                  <BarChart data={ordersByStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="count" name="Orders" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
