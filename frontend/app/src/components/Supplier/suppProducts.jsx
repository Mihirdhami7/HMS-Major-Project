import { useState, useEffect } from 'react';
import { Package, Truck, AlertCircle, Plus, Search, Check, X, RefreshCw} from 'lucide-react';
import Slidebar from '../../pages/Slidebar';
import axios from 'axios';

const SupplierPortal = () => {
  // State management
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supplierInfo, setSupplierInfo] = useState({
    name: "",
    totalProducts: 0,
    pendingRequests: 0,
    revenue: 0
  });
  
  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFulfillRequestModal, setShowFulfillRequestModal] = useState(false);
  

  const [fulfillrequestloding, setFulfillRequestLoading] = useState(false);
  // Form states
  const [newProduct, setNewProduct] = useState({
    name: '',
    productType: 'Medicine',
    price: '',
    stock: '',
    expiryDate: '',
    supplierInfo: ''
  });

  // Fetch data when component mounts
  useEffect(() => {
    const email = sessionStorage.getItem("email");
    fetchCompanyName(email);   
    fetchStockRequests();
  }, []);

  
  // Fetch supplier's products
  const fetchCompanyName = async (email) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://127.0.0.1:8000/api/get_company_name/${email}/`);
      
      if (response.data.status === "success") {
        const companyName = response.data.companyName || " Supplier";
        sessionStorage.setItem("companyName", companyName);

        console.log("CompanyName:", companyName);

        fetchProducts(companyName);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch supplier's products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const companyName = sessionStorage.getItem("companyName");
      if (!companyName) return;
      const response = await axios.get(`http://127.0.0.1:8000/api/get_supplier_products/${companyName}/`);
      
      if (response.data.status === "success") {
        setProducts(response.data.products || []);
        
        // Update supplier info
        setSupplierInfo(prev => ({
          ...prev,
          name: companyName,
          totalProducts: response.data.products.length || 0
        }));
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add new product
  const handleAddProduct = async () => {
    try {
      
      const companyName = sessionStorage.getItem("companyName");
      if (!companyName) return;

      
      if (!newProduct.name || !newProduct.productType || !newProduct.price || !newProduct.stock || !newProduct.expiryDate ) {
        alert("Please fill in all required fields");
        return;
      }

      const productData = {
        "Product Name": newProduct.name,
        "Product Type": newProduct.productType,
        "Department": newProduct.productType === 'Medicine' ? newProduct.department : "N/A",
        "Price (Per Unit/Strip)": newProduct.price,
        "Stock": parseInt(newProduct.stock),
        "Expiry Date": newProduct.expiryDate,
        "Supplier Info": companyName,
        "description": newProduct.description || "No description available",
        "Hospital Name": newProduct.hospital_name || "General"
      };
      
      const response = await axios.post("http://127.0.0.1:8000/api/add_product/", productData);
      
      if (response.data.status === "success") {
        alert("Product added successfully and waiting for admin approval");
        setShowAddProductModal(false);
        
        // Reset form
        setNewProduct({
          name: '',
          productType: 'Medicine',
          department: '',
          description: '',
          price: '',
          stock: '',
          expiryDate: '',
          hospital_name: ''
        });
      }
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product: " + (error.response?.data?.message || error.message));
    }
  };


  // Fetch stock requests for this supplier
  const fetchStockRequests = async () => {
    const companyName = sessionStorage.getItem("companyName");
    if (!companyName) return;
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/get_stock_request_by_supplier/${companyName}/`);
      
      if (response.data.status === "success") {
        setStockRequests(response.data.requests || []);
        
        // Update pending requests count
        const pendingCount = (response.data.requests || []).filter(
          req => req.status === "requested"
        ).length;
        
        setSupplierInfo(prev => ({
          ...prev,
          pendingRequests: pendingCount
        }));
      }
    } catch (error) {
      console.error("Error fetching stock requests:", error);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product["Product Type"]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product["Product Name"]?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const [requestFulfillment, setRequestFulfillment] = useState({
    quantity: '',
    expiryDate: '',
    notes: '',
    price_per_strip: '',
    total_price: 0
  });


  // Fulfill stock request
  const handleFulfillRequest = async () => {
    try {
      setFulfillRequestLoading(true);
      const total = requestFulfillment.quantity * requestFulfillment.price_per_strip;
      if (!selectedRequest._id || !requestFulfillment.quantity || !requestFulfillment.expiryDate) {
        alert("Please fill in all required fields");
        return;
      }
      if (requestFulfillment.quantity < selectedRequest.quantity) {
        alert("Fulfilled quantity cannot exceed requested quantity");
        return;
      }
      
      const fulfillData = {
        request_id: selectedRequest._id,
        hospital_name: selectedRequest.hospital_name,  // Add this missing field
        quantity_fulfilled: parseInt(requestFulfillment.quantity),
        expiry_date: requestFulfillment.expiryDate,
        notes: requestFulfillment.notes,
        price_per_strip: parseFloat(selectedRequest.price_per_strip || 0),  // Ensure it's never null
        total_price: total,
      };
      if (!fulfillData.hospital_name) {
        alert("Hospital name is missing from the request");
        return;
      }
      
      if (isNaN(fulfillData.price_per_strip)) {
        alert("Invalid price format");
        return;
      }
      
      const response = await axios.post("http://127.0.0.1:8000/api/fulfill_request/", fulfillData);
      
      if (response.data.status === "success") {
        alert("Request fulfilled successfully");
        setShowFulfillRequestModal(false);
        fetchStockRequests();
      }
    } catch (error) {
      console.error("Error fulfilling request:", error);
      alert("Failed to fulfill request: " + (error.response?.data?.message || error.message));
    }
    finally {
      setFulfillRequestLoading(false);
    }
  };

    // Create a refresh function
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchCompanyName(sessionStorage.getItem("email"));
      await fetchStockRequests();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };
  const [statusFilter, setStatusFilter] = useState('all');

// Add this function to filter requests by status
const filteredStockRequests = stockRequests.filter(request => {
  if (statusFilter === 'all') return true;
  return request.status === statusFilter;
});

  // Format date strings
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Slidebar activeTab="department" userType="supplier" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 mt-8">
          <div className="container mx-auto py-6 px-4">
            <h1 className="text-2xl font-bold text-teal-700 mb-8">Supplier Portal</h1>
            
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-teal-100 rounded-full">
                    <Package size={20} className="text-teal-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Products</p>
                    <h3 className="text-2xl font-bold">{supplierInfo.totalProducts}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <AlertCircle size={20} className="text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Pending Requests</p>
                    <h3 className="text-2xl font-bold">{supplierInfo.pendingRequests}</h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="bg-white shadow-sm rounded-lg mb-6">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'products'
                      ? 'text-teal-700 border-b-2 border-teal-500'
                      : 'text-gray-500 hover:text-teal-700'
                  }`}
                >
                  <Package size={18} className="inline mr-2" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'orders' 
                      ? 'text-teal-700 border-b-2 border-teal-500'
                      : 'text-gray-500 hover:text-teal-700'
                  }`}
                >
                  <Truck size={18} className="inline mr-2" />
                  Orders
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'products' && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-green-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search size={18} className="text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {/* Add refresh button here */}
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 flex items-center transition-colors"
                    disabled={loading}
                  >
                    <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 flex items-center"
                  >
                    <Plus size={18} className="mr-2" />
                    Add New Product
                  </button>
                </div>
                
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <RefreshCw size={24} className="animate-spin text-teal-600" />
                    </div>
                  ) : (
                    <table className="min-w-full bg-white">
                      <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 sticky top-0">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Product Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Hospital</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price (Per Strip)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product, index) => (
                            <tr key={product._id || index} className="hover:bg-green-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {product["Product Name"] || product.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product["Product Type"] || product.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product["Product Type"] || product.hospital_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product["Department"] || product.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.description || "No description available"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₹{product["Price (Per Unit/Strip)"] || product.price}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    // setShowUpdateStockModal(true);
                                    setShowProductDetailsModal(true);
                                  }}
                                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 text-xs transition-colors"
                                >
                                  More Details
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                              {loading ? "Loading products..." : "No products found"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'orders' && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-green-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-teal-600">Stock Requests</h2>
                
                <div className="flex items-center space-x-2">
                  {/* Status filter dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="requested">Requested</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </select>
                  
                  {/* Refresh button */}
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 flex items-center transition-colors"
                    disabled={loading}
                  >
                    <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <RefreshCw size={24} className="animate-spin text-teal-600" />
                  </div>
                ) : (
                  <table className="min-w-full bg-white">
                    <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Product Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Hospital</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Requested Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price Per Strip</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Request Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStockRequests.length > 0 ? (
                        filteredStockRequests.map((request, index) => (
                          <tr key={request._id || index} className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {request.product_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.hospital_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                {request.quantity} units
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.price_per_strip} 
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(request.created_at || request.request_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Requested'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {request.status === 'requested' && (
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowFulfillRequestModal(true);
                                    // Pre-populate with requested quantity
                                    setRequestFulfillment({
                                      ...requestFulfillment,
                                      quantity: request.quantity
                                    });
                                  }}
                                  className="px-3 py-1 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-md hover:from-teal-600 hover:to-blue-600 text-xs transition-colors flex items-center"
                                >
                                  <Check size={14} className="mr-1" />
                                  Fulfill
                                </button>
                              )}
                           
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                            No stock requests found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    
      {/* Product Details Modal */}
      {showProductDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-teal-700">Product Details</h3>
              <button 
                className="text-gray-400 hover:text-gray-500" 
                onClick={() => setShowProductDetailsModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h4 className="text-xl font-semibold text-teal-700 mb-3">
                  {selectedProduct["Product Name"] || selectedProduct.name}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Product Type</p>
                    <p className="font-medium">{selectedProduct["Product Type"] || selectedProduct.type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium">{selectedProduct["Department"] || selectedProduct.department || "N/A"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Price (Per Strip)</p>
                    <p className="font-medium">₹{selectedProduct["Price (Per Unit/Strip)"] || selectedProduct.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Stock</p>
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full ${
                      (selectedProduct.Stock || selectedProduct.stock) > 50 ? 'bg-green-100 text-green-800' :
                      (selectedProduct.Stock || selectedProduct.stock) > 20 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedProduct["Stock"] || selectedProduct.stock} units
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Expiry Date</p>
                  <p className="font-medium">{formatDate(selectedProduct["Expiry Date"] || selectedProduct.expiryDate)}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Hospital</p>
                  <p className="font-medium">{selectedProduct["Hospital Name"] || "General"}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedProduct.description || selectedProduct.Description || "No description available for this product."}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowProductDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h3 className="text-lg font-semibold text-teal-700">Add New Product</h3>
              <button 
                className="text-gray-400 hover:text-gray-500" 
                onClick={() => setShowAddProductModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-teal-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  
                  <div className="mt-3">
                    <label htmlFor="productType" className="block text-sm font-medium text-teal-700 mb-1">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="productType"
                      value={newProduct.productType}
                      onChange={(e) => setNewProduct({...newProduct, productType: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      required
                    >
                      <option value="Medicine">Medicine</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Supplies">Supplies</option>
                    </select>
                  </div>
                  
                  {newProduct.productType === 'Medicine' && (
                    <div className="mt-3">
                      <label htmlFor="department" className="block text-sm font-medium text-teal-700 mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="department"
                        value={newProduct.department}
                        onChange={(e) => setNewProduct({...newProduct, department: e.target.value})}
                        className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        required
                      >
                        <option value="">Select Department</option>
                        <option value="Generic">Generic</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Pediatric">Pediatric</option>
                        <option value="Orthopedic">Orthopedic</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Gastroenterology">Gastroenterology</option>
                        <option value="Oncology">Oncology</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-teal-700 mb-1">
                        Price Per Strip (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="price"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                        className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="stock" className="block text-sm font-medium text-teal-700 mb-1">
                        Initial Stock <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="stock"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                        className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-teal-700 mb-1">
                      Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="expiryDate"
                      value={newProduct.expiryDate}
                      onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div>
                    <label htmlFor="hospital" className="block text-sm font-medium text-teal-700 mb-1">
                      Hospital <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="hospital"
                      value={newProduct.hospital_name}
                      onChange={(e) => setNewProduct({...newProduct, hospital_name: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      required
                    >
                      <option value="">Select Hospital</option>
                      <option value="Zydus">Zydus</option>
                      <option value="Iris">Iris</option>
                      <option value="Agrawal Medical">Agrawal Medical</option>
                    </select>
                  </div>
                  
                  <div className="mt-3">
                    <label htmlFor="description" className="block text-sm font-medium text-teal-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      rows="8"
                      placeholder="Enter product description, usage, side effects, etc."
                    ></textarea>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-teal-700 mb-2">Additional Information</h4>
                  <p className="text-xs text-gray-600 mb-4">
                    New products require admin approval before they appear in the inventory.
                    Please ensure all information is accurate and complete.
                  </p>
                  
                  <div className="flex items-center mt-2">
                    <input 
                      type="checkbox" 
                      id="confirm" 
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="confirm" className="ml-2 block text-sm text-gray-700">
                      I confirm that the information provided is correct
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-md hover:from-teal-600 hover:to-blue-600 transition-colors flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showFulfillRequestModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-teal-700">Fulfill Stock Request</h3>
              <button 
                className="text-gray-400 hover:text-gray-500" 
                onClick={() => setShowFulfillRequestModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Request Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-teal-100 rounded-full mr-3">
                      <AlertCircle size={20} className="text-teal-600" />
                    </div>
                    <h4 className="text-md font-semibold text-teal-700">Request Details</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Hospital</p>
                        <p className="font-medium">{selectedRequest.hospital_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Product</p>
                        <p className="font-medium">{selectedRequest.product_name}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="font-medium">{selectedRequest.productType || "Medicine"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Requested Quantity</p>
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {selectedRequest.quantity} units
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Price Per Strip</p>
                        <p className="font-medium">₹{selectedRequest.price_per_strip}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Request Date</p>
                        <p className="font-medium">{formatDate(selectedRequest.created_at || selectedRequest.request_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-teal-700 mb-3">Calculation Preview</h4>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Quantity:</span>
                    <span className="font-medium">{requestFulfillment.quantity || 0} units</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Price per strip:</span>
                    <span className="font-medium">₹{requestFulfillment.price_per_strip || selectedRequest.price_per_strip}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-gray-200 my-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-teal-700">Total Amount:</span>
                      <span className="text-lg font-bold text-teal-700">
                        ₹{((requestFulfillment.quantity || 0) * (parseFloat(requestFulfillment.price_per_strip) || parseFloat(selectedRequest.price_per_strip))).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Fulfillment Form */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-teal-700 mb-3">Fulfillment Details</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="fulfillQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity to Fulfill <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="fulfillQuantity"
                        value={requestFulfillment.quantity}
                        onChange={(e) => {
                          const quantity = e.target.value;
                          const price = requestFulfillment.price_per_strip || selectedRequest.price_per_strip;
                          const total = quantity * price;
                          setRequestFulfillment({
                            ...requestFulfillment, 
                            quantity: quantity,
                            total_price: total
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        min="1"
                      />
                      {parseInt(requestFulfillment.quantity) < parseInt(selectedRequest.quantity) && requestFulfillment.quantity && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Warning: You&apos;re fulfilling less than the requested quantity.
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="pricePerStrip" className="block text-sm font-medium text-gray-700 mb-1">
                        Price Per Strip (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="pricePerStrip"
                        value={requestFulfillment.price_per_strip || selectedRequest.price_per_strip}
                        onChange={(e) => {
                          const price = e.target.value;
                          const quantity = requestFulfillment.quantity || 0;
                          const total = quantity * price;
                          setRequestFulfillment({
                            ...requestFulfillment, 
                            price_per_strip: price,
                            total_price: total
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="fulfillExpiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="fulfillExpiryDate"
                        value={requestFulfillment.expiryDate}
                        onChange={(e) => setRequestFulfillment({...requestFulfillment, expiryDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="fulfillNotes" className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        id="fulfillNotes"
                        value={requestFulfillment.notes}
                        onChange={(e) => setRequestFulfillment({...requestFulfillment, notes: e.target.value})}
                        className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        rows="3"
                        placeholder="Any additional information..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Check size={16} className="text-green-600 mr-2" />
                    <p className="text-sm text-gray-700">
                      The hospital will be notified of the fulfillment status.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowFulfillRequestModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFulfillRequest}
                disabled={fulfillrequestloding} // Disable button when loading
                className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                  fulfillrequestloding
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600"
                }`}
              >
                {fulfillrequestloding ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Truck size={16} className="mr-2" />
                    fulfill Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPortal;