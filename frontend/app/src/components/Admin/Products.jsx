import { useState, useEffect } from 'react';
import { Package, AlertCircle, Truck, RefreshCw, Search } from 'lucide-react';
import Slidebar from '../../pages/Slidebar';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [loading, setLoading] = useState(true);

  
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New stock received from PharmaCo", time: "2 hours ago", read: false },
    { id: 2, message: "MediSupply has confirmed your order", time: "5 hours ago", read: false },
    { id: 3, message: "Low stock alert for Azithromycin", time: "Yesterday", read: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchAppointments();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/get_product/");
      if (response.data.status === "success") {
        // Process products to add status based on stock level

        const allProductDetails = response.data.products;

        const processedProducts = response.data.products.map(product => ({
          ...product,
          status: (product.stock || product["Stock"] || 0) <= 40 ? "Low Stock" : "In Stock"
        }));
        setProducts(processedProducts);
        console.log("All product details:", allProductDetails);
      } else {
        console.error("Error in API response:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique product types from actual data for filter dropdown
  const productTypes = ["All Types", ...new Set(products.map(product => product.type).filter(Boolean))];

  const filteredProducts = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedType === "All Types" || product.type === selectedType) &&
      (selectedStatus === "All Status" || product.status === selectedStatus)
    );
  });



    const fetchAppointments = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/appointments/");
        setAppointments(response.data.appointments || []);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };

  // Pending orders data - keeping as is per your request
  const pendingOrders = [
    { id: 1, supplier: "PharmaCo", items: ["Paracetamol", "Cetirizine"], date: "2024-02-20", status: "Processing" },
    { id: 2, supplier: "MediSupply", items: ["Ibuprofen", "Aspirin"], date: "2024-02-22", status: "Confirmed" },
    { id: 3, supplier: "HealthMeds", items: ["Metformin"], date: "2024-02-25", status: "Pending" },
    { id: 4, supplier: "PharmaCo", items: ["Amoxicillin"], date: "2024-02-26", status: "Shipped" },
    { id: 5, supplier: "MediSupply", items: ["Azithromycin"], date: "2024-02-28", status: "Processing" }
  ];

  // Calculate counts from actual data
  const totalProducts = products.length;
  const lowStockItems = products.filter(product => product.status === 'Low Stock').length;
  const pendingOrdersCount = pendingOrders.length;
  const recentUpdatesCount = notifications.length;

  // Handle sending request to supplier
  const handleRequestStock = async (productId, productName, supplier) => {
    try {
      await axios.post("http://127.0.0.1:8000/api/requeststock/", {
        product_id: productId,
        supplier: supplier
      });
      alert(`Stock request for ${productName} sent to ${supplier}`);
      // Optionally refresh products after request
      fetchProducts();
    } catch (error) {
      console.error("Error requesting stock:", error);
      alert("Failed to send stock request. Please try again.");
    }
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
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
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
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option>All Types</option>
                    <option>Medicine</option>
                    <option>Equipment</option>
                  </select>
                  <select
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option>All Status</option>
                    <option>In Stock</option>
                    <option>Low Stock</option>
                  </select>
                </div>
              </div>
              
              {/* Products Table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-left">Supplier</th>
                        <th className="px-6 py-3 text-left">Price</th>
                        <th className="px-6 py-3 text-left">Stock</th>
                        <th className="px-6 py-3 text-left">Expiry Date</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.supplier}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₹{product.price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full ${
                                product.stock > 100 ? 'bg-green-100 text-green-800' :
                                product.stock > 50 ? 'bg-green-100 text-green-800' :
                                product.stock > 30 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.expiryDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                product.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.status === 'Low Stock' && (
                                <button
                                  onClick={() => handleRequestStock(product.id, product.name, product.supplier)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs"
                                >
                                  Request Stock
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                            No products found matching your search criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            {/* Recent Appointments Section
            <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-600 mb-4">Recent Appointments</h2>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50 sticky top-0">
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
                    {appointments.length > 0 ? (
                      appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {appointment.patient_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {appointment.doctor_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {appointment.appointment_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              appointment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {appointment.status === 'Completed' && (
                              <button 
                                onClick={() => navigate(`/admin/product/medicine?patient=${appointment.patient_id}`)}
                                className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                              >
                                Give Medicine
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No recent appointments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div> */}
            
            {/* Pending Orders Section - kept as is per request */}
            <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
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