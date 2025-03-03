import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import { FiPackage, FiTruck, FiAlertCircle, FiSearch, FiRefreshCw } from "react-icons/fi";

// Sample medicine database
const medicineInventory = {
  painkillers: [
    { id: 1, name: "Paracetamol", stock: 150, minStock: 50, supplier: "PharmaCo", price: 5.99, lastRestocked: "2024-02-15", expiryDate: "2025-06-30" },
    { id: 2, name: "Ibuprofen", stock: 120, minStock: 40, supplier: "MediSupply", price: 7.99, lastRestocked: "2024-02-10", expiryDate: "2025-05-20" },
    // Add more painkillers...
  ],
  antibiotics: [
    { id: 3, name: "Amoxicillin", stock: 80, minStock: 30, supplier: "PharmaCo", price: 15.99, lastRestocked: "2024-02-01", expiryDate: "2025-04-15" },
    { id: 4, name: "Azithromycin", stock: 60, minStock: 25, supplier: "MediSupply", price: 19.99, lastRestocked: "2024-02-05", expiryDate: "2025-03-30" },
    // Add more antibiotics...
  ],
  // Add more categories with their medicines...
};

// Sample recent appointments
const recentAppointments = [
  { id: 1, patientName: "John Doe", doctorName: "Dr. Smith", date: "2024-02-28", status: "Completed", prescription: "Pending" },
  { id: 2, patientName: "Jane Smith", doctorName: "Dr. Johnson", date: "2024-02-27", status: "Completed", prescription: "Given" },
  // Add more appointments...
];

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const navigate = useNavigate();

  // Get all medicines in a flat array
  const allMedicines = Object.values(medicineInventory).flat();

  // Filter medicines based on search, category, and low stock
  const filteredMedicines = allMedicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || medicine.category === selectedCategory;
    const matchesLowStock = !showLowStock || medicine.stock <= medicine.minStock;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab="product" userType="admin" />
      
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-blue-700">Inventory Management</h2>
            <button
              onClick={() => navigate('/admin/product/medicine')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600"
            >
              Manage Medicines
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center">
                <FiPackage className="text-2xl text-blue-500 mr-3" />
                <div>
                  <p className="text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">{allMedicines.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-500">
              <div className="flex items-center">
                <FiAlertCircle className="text-2xl text-red-500 mr-3" />
                <div>
                  <p className="text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold">
                    {allMedicines.filter(m => m.stock <= m.minStock).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
              <div className="flex items-center">
                <FiTruck className="text-2xl text-green-500 mr-3" />
                <div>
                  <p className="text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
              <div className="flex items-center">
                <FiRefreshCw className="text-2xl text-yellow-500 mr-3" />
                <div>
                  <p className="text-gray-600">Recent Updates</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.keys(medicineInventory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="mr-2"
              />
              Show Low Stock Only
            </label>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Restocked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMedicines.map((medicine) => (
                  <tr key={medicine.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{medicine.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        medicine.stock <= medicine.minStock 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {medicine.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{medicine.supplier}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${medicine.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{medicine.lastRestocked}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{medicine.expiryDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {medicine.stock <= medicine.minStock ? (
                        <span className="text-red-500">Reorder</span>
                      ) : (
                        <span className="text-green-500">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">Recent Appointments</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left">Patient Name</th>
                    <th className="px-6 py-3 text-left">Doctor</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{appointment.patientName}</td>
                      <td className="px-6 py-4">{appointment.doctorName}</td>
                      <td className="px-6 py-4">{appointment.date}</td>
                      <td className="px-6 py-4">{appointment.status}</td>
                      <td className="px-6 py-4">
                        {appointment.prescription === "Pending" && (
                          <button
                            onClick={() => navigate(`/admin/product/medicine`)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            Give Medicine
                          </button>
                        )}
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

export default Products;
