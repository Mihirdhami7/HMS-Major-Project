import { useState, useEffect } from "react";
import Slidebar from "../../pages/Slidebar";
import { 
  FiTruck, FiPackage, FiDollarSign, FiCheckCircle, 
  FiClock, FiAlertTriangle, FiArrowUp, FiShoppingBag
} from "react-icons/fi";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

const SuppDashboard = () => {
  const [activeTab, setActiveTab] = useState("suppdashboard");
  const [timeRange, setTimeRange] = useState("month");
  const [loading, setLoading] = useState(true);

  // Stats data
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    processingOrders: 0,
    totalRevenue: 0,
    totalProducts: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Simulating data fetching
  useEffect(() => {
    // This would be replaced with actual API calls
    setTimeout(() => {
      setStats({
        totalOrders: 156,
        completedOrders: 124,
        processingOrders: 32,
        totalRevenue: 28750,
        totalProducts: 45
      });

      setRecentOrders([
        { id: 'ORD-7865', product: 'Medical Gloves', quantity: 1000, status: 'completed', date: '2025-04-22', amount: 1250 },
        { id: 'ORD-7832', product: 'Surgical Masks', quantity: 500, status: 'processing', date: '2025-04-23', amount: 750 },
        { id: 'ORD-7812', product: 'Hand Sanitizer', quantity: 200, status: 'completed', date: '2025-04-20', amount: 600 },
        { id: 'ORD-7798', product: 'Stethoscopes', quantity: 50, status: 'processing', date: '2025-04-21', amount: 2500 },
      ]);

      setMonthlyData([
        { name: 'Jan', orders: 35, revenue: 6250 },
        { name: 'Feb', orders: 28, revenue: 4800 },
        { name: 'Mar', orders: 42, revenue: 7300 },
        { name: 'Apr', orders: 51, revenue: 9400 },
      ]);

      setOrderStatusData([
        { name: 'Completed', value: 124, color: '#00C49F' },
        { name: 'Processing', value: 32, color: '#FFBB28' },
        { name: 'Pending', value: 15, color: '#0088FE' },
        { name: 'Cancelled', value: 8, color: '#FF8042' }
      ]);

      setTopProducts([
        { name: 'Medical Gloves', sales: 5000, revenue: 6250 },
        { name: 'Surgical Masks', sales: 3200, revenue: 4800 },
        { name: 'Hand Sanitizer', sales: 2800, revenue: 3360 },
        { name: 'Stethoscopes', sales: 120, revenue: 6000 },
        { name: 'Syringes', sales: 2200, revenue: 2200 }
      ]);

      setLoading(false);
    }, 1500);
  }, []);

  // Status styling helper
  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { className: "bg-green-100 text-green-600", icon: <FiCheckCircle className="mr-1" size={14} /> },
      processing: { className: "bg-yellow-100 text-yellow-600", icon: <FiClock className="mr-1" size={14} /> },
      cancelled: { className: "bg-red-100 text-red-600", icon: <FiAlertTriangle className="mr-1" size={14} /> },
      pending: { className: "bg-gray-100 text-gray-600", icon: <FiClock className="mr-1" size={14} /> }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="supplier" />
      
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
                <FiArrowUp className="text-green-500 mr-1" />
                <span className="text-green-500">12%</span>
                <span className="text-gray-500 ml-2">vs last month</span>
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
                <FiArrowUp className="text-green-500 mr-1" />
                <span className="text-green-500">8%</span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Total Revenue</p>
                  <h3 className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</h3>
                </div>
                <FiDollarSign className="text-2xl text-yellow-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <FiArrowUp className="text-green-500 mr-1" />
                <span className="text-green-500">15%</span>
                <span className="text-gray-500 ml-2">vs last month</span>
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
                <FiArrowUp className="text-green-500 mr-1" />
                <span className="text-green-500">3</span>
                <span className="text-gray-500 ml-2">new this month</span>
              </div>
            </div>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Performance */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Monthly Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#0088FE" />
                  <YAxis yAxisId="right" orientation="right" stroke="#FFBB28" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#0088FE" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue ($)" fill="#FFBB28" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Order Status */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Order Status</h3>
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
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" fill="#8884d8" name="Units Sold" />
                <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-700">Recent Orders</h3>
              <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                View All
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
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
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id}
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
                        ${order.amount}
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