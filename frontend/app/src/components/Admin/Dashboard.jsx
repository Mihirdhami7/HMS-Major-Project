import { useState, useEffect } from "react";
import Slidebar from "../../pages/Slidebar";
import { 
  FiUsers, FiCalendar, FiDollarSign, FiActivity,
  FiArrowUp, FiArrowDown, FiPackage 
} from "react-icons/fi";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timeRange, setTimeRange] = useState("month");

  // Sample data - replace with API calls
  const stats = {
    totalAppointments: 1250,
    completedAppointments: 980,
    pendingAppointments: 270,
    totalPatients: 850,
    totalRevenue: 45000,
    totalDoctors: 25
  };

  const appointmentsByMonth = [
    { month: 'Jan', appointments: 120, completed: 100, cancelled: 20 },
    { month: 'Feb', appointments: 150, completed: 130, cancelled: 20 },
    { month: 'Mar', appointments: 180, completed: 160, cancelled: 20 },
    // Add more months...
  ];

  const departmentStats = [
    { name: 'Orthopedic', value: 350, color: '#0088FE' },
    { name: 'Cardiology', value: 280, color: '#00C49F' },
    { name: 'Neurology', value: 200, color: '#FFBB28' },
    { name: 'Pediatric', value: 180, color: '#FF8042' },
    { name: 'General', value: 240, color: '#8884d8' }
  ];

  const topMedicines = [
    { name: 'Paracetamol', sales: 450, revenue: 2250 },
    { name: 'Amoxicillin', sales: 320, revenue: 4800 },
    { name: 'Omeprazole', sales: 280, revenue: 3360 },
    { name: 'Ibuprofen', sales: 250, revenue: 1750 },
    { name: 'Vitamin D3', sales: 220, revenue: 2200 }
  ];

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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Total Appointments</p>
                  <h3 className="text-2xl font-bold">{stats.totalAppointments}</h3>
                </div>
                <FiCalendar className="text-2xl text-blue-500" />
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
                  <p className="text-gray-600">Total Patients</p>
                  <h3 className="text-2xl font-bold">{stats.totalPatients}</h3>
                </div>
                <FiUsers className="text-2xl text-green-500" />
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
                  <h3 className="text-2xl font-bold">${stats.totalRevenue}</h3>
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
                  <p className="text-gray-600">Total Doctors</p>
                  <h3 className="text-2xl font-bold">{stats.totalDoctors}</h3>
                </div>
                <FiActivity className="text-2xl text-purple-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <FiArrowUp className="text-green-500 mr-1" />
                <span className="text-green-500">2</span>
                <span className="text-gray-500 ml-2">new this month</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Appointments Trend */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Appointments Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={appointmentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#0088FE" />
                  <Line type="monotone" dataKey="cancelled" stroke="#FF8042" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Department Distribution */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Department Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {departmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Selling Medicines */}
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">Top Selling Medicines</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMedicines}>
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

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {/* Add your recent activity items here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


