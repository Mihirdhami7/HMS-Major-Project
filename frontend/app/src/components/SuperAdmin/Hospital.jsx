import React, { useState } from 'react';
import { BarChart, PieChart, LineChart, Hospital, Calendar, PlusCircle, ShoppingCart, DollarSign, Users } from 'lucide-react';
import Slidebar from '../../pages/Slidebar';

const HospitalDashboard = () => {
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Dummy hospital data
  const hospitals = [
    {
      id: 1,
      name: "Zydus Hospital",
      address: "123 Healthcare Blvd, Cityville",
      phone: "(555) 123-4567",
      totalStaff: 120,
      totalDoctors: 45,
      totalPatients: 1250,
      totalAppointments: 523,
      totalRevenue: 527600,
      medicineSales: 145300,
      medicinePurchases: 89700,
      appointmentsLastMonth: 187,
      logo: "Z"
    },
    {
      id: 2,
      name: "Iris Medical Center",
      address: "456 Wellness Drive, Healthtown",
      phone: "(555) 987-6543",
      totalStaff: 95,
      totalDoctors: 32,
      totalPatients: 980,
      totalAppointments: 412,
      totalRevenue: 384500,
      medicineSales: 112400,
      medicinePurchases: 67300,
      appointmentsLastMonth: 153,
      logo: "I"
    },
    {
      id: 3,
      name: "Agrawal Medical",
      address: "789 Care Street, Medville",
      phone: "(555) 567-8901",
      totalStaff: 75,
      totalDoctors: 28,
      totalPatients: 780,
      totalAppointments: 298,
      totalRevenue: 256700,
      medicineSales: 98500,
      medicinePurchases: 52800,
      appointmentsLastMonth: 124,
      logo: "A"
    }
  ];

  // Calculate system-wide statistics
  const totalPatients = hospitals.reduce((sum, hospital) => sum + hospital.totalPatients, 0);
  const totalAppointments = hospitals.reduce((sum, hospital) => sum + hospital.totalAppointments, 0);
  const totalRevenue = hospitals.reduce((sum, hospital) => sum + hospital.totalRevenue, 0);
  const totalMedicineSales = hospitals.reduce((sum, hospital) => sum + hospital.medicineSales, 0);

  // Handle hospital click
  const handleHospitalClick = (hospital) => {
    setSelectedHospital(hospital);
  };

  // Hospital card component
  const HospitalCard = ({ hospital }) => (
    <div 
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all border-l-4 border-blue-500"
      onClick={() => handleHospitalClick(hospital)}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
          {hospital.logo}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{hospital.name}</h3>
          <p className="text-sm text-gray-500">{hospital.address}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="text-sm">
          <span className="text-gray-500">Doctors:</span>
          <span className="ml-1 font-medium">{hospital.totalDoctors}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Staff:</span>
          <span className="ml-1 font-medium">{hospital.totalStaff}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Patients:</span>
          <span className="ml-1 font-medium">{hospital.totalPatients}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Appointments:</span>
          <span className="ml-1 font-medium">{hospital.appointmentsLastMonth} <span className="text-xs text-gray-400">(last month)</span></span>
        </div>
      </div>
    </div>
  );

  // Stat card component
  const StatCard = ({ icon, title, value, bgColor }) => (
    <div className={`${bgColor} rounded-lg shadow-md p-4`}>
      <div className="flex items-center">
        <div className="p-3 rounded-full bg-white bg-opacity-30 text-white">
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-white text-sm font-medium">{title}</h3>
          <p className="text-white text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="superadmin" />
      <div className="min-h-screen bg-gray-100">
        {/* Navbar */}
        <nav className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Hospital Management System</h1>
            <div className="flex items-center space-x-4">
              <span>Super Admin</span>
              <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold">
                SA
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <div className="container mx-auto p-4">
          {selectedHospital ? (
            // Single hospital view
            <div>
              <button 
                onClick={() => setSelectedHospital(null)}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Back to All Hospitals
              </button>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedHospital.logo}
                  </div>
                  <div className="ml-6">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedHospital.name}</h2>
                    <p className="text-gray-600">{selectedHospital.address}</p>
                    <p className="text-gray-600">{selectedHospital.phone}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard 
                  icon={<Users size={24} />} 
                  title="Total Patients" 
                  value={selectedHospital.totalPatients.toLocaleString()} 
                  bgColor="bg-blue-500" 
                />
                <StatCard 
                  icon={<Calendar size={24} />} 
                  title="Total Appointments" 
                  value={selectedHospital.totalAppointments.toLocaleString()} 
                  bgColor="bg-green-500" 
                />
                <StatCard 
                  icon={<ShoppingCart size={24} />} 
                  title="Medicine Sales" 
                  value={`$${selectedHospital.medicineSales.toLocaleString()}`} 
                  bgColor="bg-indigo-500" 
                />
                <StatCard 
                  icon={<DollarSign size={24} />} 
                  title="Total Revenue" 
                  value={`$${selectedHospital.totalRevenue.toLocaleString()}`} 
                  bgColor="bg-teal-500" 
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Last Month's Appointments</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Doctor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...Array(5)].map((_, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Patient {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Dr. {['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][index]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {['Feb 15', 'Feb 17', 'Feb 20', 'Feb 22', 'Feb 28'][index]}, 2025
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                ['bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-green-100 text-green-800', 'bg-red-100 text-red-800', 'bg-green-100 text-green-800'][index]
                              }`}>
                                {['Completed', 'Scheduled', 'Completed', 'Cancelled', 'Completed'][index]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Medicine Inventory</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Medicine Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...Array(5)].map((_, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {['Amoxicillin', 'Paracetamol', 'Ibuprofen', 'Aspirin', 'Cetirizine'][index]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {['Antibiotic', 'Pain Relief', 'Anti-inflammatory', 'Pain Relief', 'Antihistamine'][index]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {[124, 258, 87, 196, 142][index]} units
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                ['bg-green-100 text-green-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-green-100 text-green-800', 'bg-green-100 text-green-800'][index]
                              }`}>
                                {['In Stock', 'In Stock', 'Low Stock', 'In Stock', 'In Stock'][index]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Medicine Sales</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...Array(5)].map((_, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #INV-{20000 + index}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {['Feb 28', 'Feb 27', 'Feb 25', 'Feb 23', 'Feb 20'][index]}, 2025
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Brown', 'Michael Davis'][index]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${[125, 87, 210, 65, 145][index]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Medicine Purchases</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...Array(5)].map((_, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #PO-{1000 + index}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {['Feb 15', 'Feb 10', 'Feb 5', 'Jan 28', 'Jan 20'][index]}, 2025
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {['MedSupply Inc.', 'Pharma Solutions', 'Global Meds', 'MediTech', 'HealthCare Supplies'][index]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${[2500, 1800, 3200, 1500, 2100][index]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Main dashboard view
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Super Admin Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard 
                  icon={<Users size={24} />} 
                  title="Total Patients" 
                  value={totalPatients.toLocaleString()} 
                  bgColor="bg-blue-500" 
                />
                <StatCard 
                  icon={<Calendar size={24} />} 
                  title="Total Appointments" 
                  value={totalAppointments.toLocaleString()} 
                  bgColor="bg-green-500" 
                />
                <StatCard 
                  icon={<ShoppingCart size={24} />} 
                  title="Medicine Sales" 
                  value={`$${totalMedicineSales.toLocaleString()}`} 
                  bgColor="bg-indigo-500" 
                />
                <StatCard 
                  icon={<DollarSign size={24} />} 
                  title="Total Revenue" 
                  value={`$${totalRevenue.toLocaleString()}`} 
                  bgColor="bg-teal-500" 
                />
              </div>

              <h3 className="text-xl font-semibold mb-4 text-gray-800">Hospital Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {hospitals.map(hospital => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">System Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-600 mb-2">Total Doctors</h4>
                    <p className="text-2xl font-bold">{hospitals.reduce((sum, h) => sum + h.totalDoctors, 0)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-600 mb-2">Total Staff</h4>
                    <p className="text-2xl font-bold">{hospitals.reduce((sum, h) => sum + h.totalStaff, 0)}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <h4 className="text-sm font-medium text-indigo-600 mb-2">Last Month Appointments</h4>
                    <p className="text-2xl font-bold">{hospitals.reduce((sum, h) => sum + h.appointmentsLastMonth, 0)}</p>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <h4 className="text-sm font-medium text-teal-600 mb-2">Medicine Purchases</h4>
                    <p className="text-2xl font-bold">${hospitals.reduce((sum, h) => sum + h.medicinePurchases, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;