import { useState } from 'react';
import { Package, Truck, AlertCircle, DollarSign, Plus, Search } from 'lucide-react';
import Slidebar from '../../pages/Slidebar';

const SupplierPortal = () => {
  
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Low stock request for Cetirizine from Zydus Hospital", time: "10 minutes ago", read: false, type: "request" },
    { id: 2, message: "Low stock request for Aspirin from Iris Medical", time: "1 hour ago", read: false, type: "request" },
    { id: 3, message: "Payment received for Order #1052", time: "3 hours ago", read: true, type: "payment" },
    { id: 4, message: "Order #1048 has been delivered", time: "Yesterday", read: true, type: "delivery" },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Supplier company info
  const supplierInfo = {
    name: "PharmaCo Medical Supplies",
    logo: "P",
    totalProducts: 35,
    pendingOrders: 8,
    lowStockRequests: 3,
    revenue: 28500
  };
  
  // Products data
  const products = [
    { id: 1, name: "Paracetamol", stock: 340, price: "$5.99", category: "Pain Relief", expiryDate: "2025-12-30", status: "In Stock" },
    { id: 2, name: "Amoxicillin", stock: 210, price: "$15.99", category: "Antibiotic", expiryDate: "2025-10-15", status: "In Stock" },
    { id: 3, name: "Cetirizine", stock: 15, price: "$8.50", category: "Antihistamine", expiryDate: "2025-11-20", status: "Low Stock" },
    { id: 4, name: "Omeprazole", stock: 30, price: "$14.50", category: "Gastric", expiryDate: "2025-09-15", status: "Low Stock" },
    { id: 5, name: "Atorvastatin", stock: 120, price: "$22.99", category: "Cardiovascular", expiryDate: "2025-08-25", status: "In Stock" },
    { id: 6, name: "Metformin", stock: 180, price: "$12.50", category: "Diabetes", expiryDate: "2025-11-10", status: "In Stock" }
  ];
  
  // Orders data
  const orders = [
    { id: 1051, hospital: "Zydus Hospital", items: ["Paracetamol (100)", "Amoxicillin (50)"], date: "2024-02-28", status: "Processing", total: "$2,099.50" },
    { id: 1050, hospital: "Iris Medical Center", items: ["Cetirizine (30)", "Omeprazole (20)"], date: "2024-02-26", status: "Shipped", total: "$545.00" },
    { id: 1049, hospital: "Agrawal Medical", items: ["Atorvastatin (40)"], date: "2024-02-24", status: "Delivered", total: "$919.60" },
    { id: 1048, hospital: "Zydus Hospital", items: ["Metformin (60)"], date: "2024-02-22", status: "Delivered", total: "$750.00" },
    { id: 1047, hospital: "Iris Medical Center", items: ["Paracetamol (80)", "Amoxicillin (30)"], date: "2024-02-20", status: "Delivered", total: "$959.60" }
  ];
  
  // Stock Requests
  const stockRequests = [
    { id: 1, hospital: "Zydus Hospital", product: "Cetirizine", requestDate: "2024-03-13", status: "New" },
    { id: 2, hospital: "Iris Medical Center", product: "Aspirin", requestDate: "2024-03-13", status: "New" },
    { id: 3, hospital: "Agrawal Medical", product: "Metformin", requestDate: "2024-03-12", status: "Processing" }
  ];
  
  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Pain Relief',
    price: '',
    stock: '',
    expiryDate: ''
  });
  
  // Update stock form state
  const [stockUpdate, setStockUpdate] = useState({
    quantity: '',
    expiryDate: ''
  });
  
  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle adding new product
  const handleAddProduct = () => {
    alert(`New product added: ${newProduct.name}`);
    setShowAddProductModal(false);
    setNewProduct({
      name: '',
      category: 'Pain Relief',
      price: '',
      stock: '',
      expiryDate: ''
    });
    // In a real app, this would make an API call
  };
  
  // Handle updating stock
  const handleUpdateStock = () => {
    alert(`Stock updated for ${selectedProduct.name}: +${stockUpdate.quantity} units`);
    setShowUpdateStockModal(false);
    setStockUpdate({
      quantity: '',
      expiryDate: ''
    });
    // In a real app, this would make an API call
  };
  
  // Handle fulfilling stock request
  const handleFulfillRequest = (request) => {
    alert(`Fulfilling stock request for ${request.product} to ${request.hospital}`);
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
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
          {/* Dashboard Overview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 mt-16">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{supplierInfo.totalProducts}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{supplierInfo.pendingOrders}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Requests</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{supplierInfo.lowStockRequests}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                      <dd className="text-2xl font-semibold text-gray-900">${supplierInfo.revenue.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white shadow mt-6">
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="products">Products</option>
                <option value="orders">Orders</option>
                <option value="stock-requests">Stock Requests</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <nav className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'products'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Package className="h-5 w-5 inline-block mr-2" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'orders'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Truck className="h-5 w-5 inline-block mr-2" />
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab('stock-requests')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'stock-requests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <AlertCircle className="h-5 w-5 inline-block mr-2" />
                  Stock Requests
                </button>
              </nav>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="mt-6">
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="relative w-64">
                    <Search className="h-5 w-5 absolute top-3 left-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Product
                  </button>
                </div>
                
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.expiryDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                product.status === 'In Stock'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowUpdateStockModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Update Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hospital</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.hospital}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <ul className="list-disc list-inside">
                            {order.items.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'Processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : order.status === 'Shipped'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Stock Requests Tab */}
            {activeTab === 'stock-requests' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hospital</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.hospital}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.product}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.requestDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              request.status === 'New'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleFulfillRequest(request)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Fulfill Request
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
        
        {/* Add Product Modal */}
  {showAddProductModal && (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add New Product</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  id="category"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option>Pain Relief</option>
                  <option>Antibiotic</option>
                  <option>Antihistamine</option>
                  <option>Gastric</option>
                  <option>Cardiovascular</option>
                  <option>Diabetes</option>
                </select>
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Initial Stock</label>
                <input
                  type="number"
                  id="stock"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  id="expiryDate"
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleAddProduct}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Add Product
            </button>
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Update Stock Modal */}
  {showUpdateStockModal && selectedProduct && (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Update Stock for {selectedProduct.name}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Current Stock: {selectedProduct.stock} units</p>
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Additional Quantity</label>
                <input
                  type="number"
                  id="quantity"
                  value={stockUpdate.quantity}
                  onChange={(e) => setStockUpdate({...stockUpdate, quantity: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="updateExpiryDate" className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  id="updateExpiryDate"
                  value={stockUpdate.expiryDate}
                  onChange={(e) => setStockUpdate({...stockUpdate, expiryDate: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleUpdateStock}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Update Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUpdateStockModal(false);
                setSelectedProduct(null);
              }}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
      </div>
    </div>
  );
}

export default SupplierPortal;