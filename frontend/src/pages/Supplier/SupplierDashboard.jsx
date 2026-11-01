import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Slidebar from "../../components/Sidebar";
import {
  FiTruck, FiPackage, FiDollarSign, FiCheckCircle,
  FiClock, FiAlertTriangle
} from "react-icons/fi";
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierProducts, getSupplierOrders } from "../../services/orderService";

const RANGE_DAYS = { week: 7, month: 30, year: 365 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_COLORS = {
  requested: '#0088FE',
  processing: '#FFBB28',
  completed: '#00C49F',
  cancelled: '#FF8042',
};

const orderDate = (order) => {
  const raw = order.order_date || order.created_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

// Value of an order: what was fulfilled (or ordered, before fulfilment) times the unit price.
const orderAmount = (order) => {
  const qty = order.quantity_fulfilled || order.quantity_ordered || 0;
  return qty * (Number(order.price_per_strip) || 0);
};

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : "");

const SuppDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("suppdashboard");
  const [timeRange, setTimeRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const [productsResult, ordersResult] = await Promise.all([
        getSupplierProducts(token),
        getSupplierOrders(token),
      ]);
      if (cancelled) return;
      if (productsResult.success) setProducts(pickList(productsResult, "products"));
      else setError(productsResult.message);
      if (ordersResult.success) setOrders(pickList(ordersResult, "orders"));
      else setError(ordersResult.message);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const rangeOrders = useMemo(() => {
    const since = Date.now() - RANGE_DAYS[timeRange] * 24 * 60 * 60 * 1000;
    return orders.filter((o) => {
      const date = orderDate(o);
      return date && date.getTime() >= since;
    });
  }, [orders, timeRange]);

  const stats = useMemo(() => {
    const completed = rangeOrders.filter((o) => o.status === "completed");
    return {
      totalOrders: rangeOrders.length,
      completedOrders: completed.length,
      processingOrders: rangeOrders.filter((o) => o.status === "processing").length,
      requestedOrders: rangeOrders.filter((o) => o.status === "requested").length,
      totalRevenue: completed.reduce((sum, o) => sum + orderAmount(o), 0),
      totalProducts: products.length,
      approvedProducts: products.filter((p) => p.is_approved).length,
    };
  }, [rangeOrders, products]);

  // Orders and completed revenue per calendar month within the selected range.
  const monthlyData = useMemo(() => {
    const months = timeRange === "year" ? 12 : timeRange === "month" ? 2 : 1;
    const now = new Date();
    const buckets = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, orders: 0, revenue: 0 });
    }
    rangeOrders.forEach((o) => {
      const date = orderDate(o);
      const bucket = buckets.find((b) => b.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (!bucket) return;
      bucket.orders += 1;
      if (o.status === "completed") bucket.revenue += orderAmount(o);
    });
    return buckets.map((b) => ({ ...b, revenue: Number(b.revenue.toFixed(2)) }));
  }, [rangeOrders, timeRange]);

  const orderStatusData = useMemo(() => {
    const counts = {};
    rangeOrders.forEach((o) => {
      const status = o.status || "requested";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: capitalize(status),
      value,
      color: STATUS_COLORS[status] || '#8884d8',
    }));
  }, [rangeOrders]);

  // Top products by quantity across orders in range; revenue only counts completed orders.
  const topProducts = useMemo(() => {
    const byName = {};
    rangeOrders.forEach((o) => {
      const name = o.product_name || "Unknown";
      if (!byName[name]) byName[name] = { name, sales: 0, revenue: 0 };
      byName[name].sales += o.quantity_fulfilled || o.quantity_ordered || 0;
      if (o.status === "completed") byName[name].revenue += orderAmount(o);
    });
    return Object.values(byName)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map((p) => ({ ...p, revenue: Number(p.revenue.toFixed(2)) }));
  }, [rangeOrders]);

  const recentOrders = useMemo(() => (
    [...orders]
      .sort((a, b) => (orderDate(b)?.getTime() || 0) - (orderDate(a)?.getTime() || 0))
      .slice(0, 5)
      .map((o) => ({
        id: o._id || o.id,
        product: o.product_name,
        hospital: o.hospitalName,
        quantity: o.quantity_fulfilled || o.quantity_ordered,
        status: o.status || "requested",
        date: orderDate(o) ? orderDate(o).toLocaleDateString() : "-",
        amount: orderAmount(o),
      }))
  ), [orders]);

  // Status styling helper
  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { className: "bg-green-100 text-green-600", icon: <FiCheckCircle className="mr-1" size={14} /> },
      processing: { className: "bg-yellow-100 text-yellow-600", icon: <FiClock className="mr-1" size={14} /> },
      cancelled: { className: "bg-red-100 text-red-600", icon: <FiAlertTriangle className="mr-1" size={14} /> },
      requested: { className: "bg-gray-100 text-gray-600", icon: <FiClock className="mr-1" size={14} /> }
    };

    const config = statusConfig[status] || statusConfig.requested;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {capitalize(status)}
      </span>
    );
  };

  const rangeLabel = { week: "last 7 days", month: "last 30 days", year: "last 12 months" }[timeRange];
  const emptyChart = (
    <div className="h-[300px] flex items-center justify-center text-gray-500">No orders in the {rangeLabel}</div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-blue-700">Supplier Dashboard</h2>
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

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Total Orders</p>
                  <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
                </div>
                <FiTruck className="text-2xl text-blue-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">{stats.requestedOrders} new, {stats.processingOrders} processing</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Completed Orders</p>
                  <h3 className="text-2xl font-bold">{stats.completedOrders}</h3>
                </div>
                <FiCheckCircle className="text-2xl text-green-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">in the {rangeLabel}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Total Revenue</p>
                  <h3 className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                </div>
                <FiDollarSign className="text-2xl text-yellow-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">from completed orders</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Total Products</p>
                  <h3 className="text-2xl font-bold">{stats.totalProducts}</h3>
                </div>
                <FiPackage className="text-2xl text-purple-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">{stats.approvedProducts} approved by hospitals</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Performance */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Monthly Performance</h3>
              {rangeOrders.length === 0 ? emptyChart : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#0088FE" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#FFBB28" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#0088FE" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue (₹)" fill="#FFBB28" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Order Status */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Order Status</h3>
              {orderStatusData.length === 0 ? emptyChart : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {orderStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">Top Selling Products</h3>
            {topProducts.length === 0 ? emptyChart : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" fill="#8884d8" name="Units" />
                <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-700">Recent Orders</h3>
              <Link to="/supplier/suppproduct" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hospital
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No orders yet</td>
                    </tr>
                  )}
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.hospital}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{order.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusChip(order.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuppDashboard;
