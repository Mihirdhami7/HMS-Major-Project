import { useState, useEffect } from 'react';
import { Package, AlertCircle, Truck, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Slidebar from '../../pages/Slidebar';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedType, setSelectedType] = useState("All Types");
  //const [showLowStock, setShowLowStock] = useState(false);

  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New stock received from PharmaCo", time: "2 hours ago", read: false },
    { id: 2, message: "MediSupply has confirmed your order", time: "5 hours ago", read: false },
    { id: 3, message: "Low stock alert for Azithromycin", time: "Yesterday", read: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/getproducts/");
      setProducts(response.data.products);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const filteredProducts = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedDepartment === "All Departments" || product.department === selectedDepartment) &&
      (selectedType === "All Types" || product.type === selectedType)
    );
  });




  // Pending orders data
  const pendingOrders = [
    { id: 1, supplier: "PharmaCo", items: ["Paracetamol", "Cetirizine"], date: "2024-02-20", status: "Processing" },
    { id: 2, supplier: "MediSupply", items: ["Ibuprofen", "Aspirin"], date: "2024-02-22", status: "Confirmed" },
    { id: 3, supplier: "HealthMeds", items: ["Metformin"], date: "2024-02-25", status: "Pending" },
    { id: 4, supplier: "PharmaCo", items: ["Amoxicillin"], date: "2024-02-26", status: "Shipped" },
    { id: 5, supplier: "MediSupply", items: ["Azithromycin"], date: "2024-02-28", status: "Processing" }
  ];

  // Recent appointments
  const recentAppointments = [
    { id: 1, patientName: "John Doe", doctor: "Dr. Smith", date: "2024-02-28", status: "Completed" },
    { id: 2, patientName: "Jane Smith", doctor: "Dr. Johnson", date: "2024-02-28", status: "Scheduled" },
    { id: 3, patientName: "Michael Brown", doctor: "Dr. Lee", date: "2024-02-27", status: "Completed" },
    { id: 4, patientName: "Emily Wilson", doctor: "Dr. Patel", date: "2024-02-27", status: "Cancelled" },
    { id: 5, patientName: "Robert Davis", doctor: "Dr. Garcia", date: "2024-02-26", status: "Completed" }
  ];


  // Calculate counts
  const totalProducts = products.length;
  const lowStockItems = products.filter(med => med.status === 'Low Stock').length;
  const pendingOrdersCount = pendingOrders.length;
  const recentUpdatesCount = notifications.length;

  // Handle sending request to supplier
  const handleRequestStock = (medicineName, supplier) => {
    alert(`Stock request for ${medicineName} sent to ${supplier}`);
    // In a real app, this would make an API call
  };
  
  // Handle notification click
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({...n, read: true})));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab="department" userType="admin" />
      {/* Change this div's classes to handle overflow properly */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Add a wrapper div for scrollable content */}
        <div className="flex-1 overflow-y-auto p-8 mt-16 bg-gray-50">
          {/* Main Content */}
          <div className="container mx-auto py-6 px-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Package size={20} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Products</p>
                    <h3 className="text-2xl font-bold">{totalProducts}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle size={20} className="text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Low Stock Items</p>
                    <h3 className="text-2xl font-bold">{lowStockItems}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Truck size={20} className="text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Pending Orders</p>
                    <h3 className="text-2xl font-bold">{pendingOrdersCount}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <RefreshCw size={20} className="text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Recent Updates</p>
                    <h3 className="text-2xl font-bold">{recentUpdatesCount}</h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Inventory Search & Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <select 
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option>All Departments</option>
                    <option>Cardiology</option>
                    <option>Neurology</option>
                    <option>Orthopedics</option>
                    <option>Pediatrics</option>
                    <option>Generic</option>
                  </select>
                  <select
                    className="border rounded-lg px-4 py-2"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option>All Types</option>
                    <option>Medicine</option>
                    <option>Equipment</option>
                  </select>
                  {/* <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="lowStockFilter" 
                      className="rounded"
                      checked={showLowStock}
                      onChange={() => setShowLowStock(!showLowStock)}
                    />
                    <label htmlFor="lowStockFilter" className="text-sm">Show Low Stock Only</label>
                  </div> */}
                </div>
              </div>
              
              {/* Inventory Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Department</th>
                    <th className="px-6 py-3 text-left">Supplier</th>
                    <th className="px-6 py-3 text-left">Price</th>
                    <th className="px-6 py-3 text-left">Last Restocked</th>
                    <th className="px-6 py-3 text-left">Expiry Date</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Stock</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((products) => (
                      <tr key={products.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {products.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {products.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {products.supplier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {products.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {products.lastRestocked}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {products.expiryDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-12 h-6 rounded-full ${
                            products.stock > 100 ? 'bg-green-100 text-green-800' :
                            products.stock > 50 ? 'bg-green-100 text-green-800' :
                            products.stock > 30 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {products.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            products.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {products.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {products.status === 'Low Stock' && (
                            <button
                              onClick={() => handleRequestStock(products.name, products.supplier)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs"
                            >
                              Request Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Recent Appointments Section */}
            <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-600 mb-4">Recent Appointments</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {appointment.patientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.doctor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            appointment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.status === 'Completed' && (
                            <button 
                            onClick={() => navigate(`/admin/product/medicine`)}
                            className="text-blue-500 hover:text-blue-700 text-sm font-medium">
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
            
            {/* Pending Orders Section */}
            <div className=" mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-600 mb-4">Pending Orders</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id.toString().padStart(4, '0')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.supplier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'Shipped' ? 'bg-green-100 text-green-800' :
                            order.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
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
    </div>
  );
};

export default Products;