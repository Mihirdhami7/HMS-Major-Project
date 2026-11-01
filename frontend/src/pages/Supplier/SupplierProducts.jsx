import { useState, useEffect, useCallback } from 'react';
import { Package, Truck, AlertCircle, Plus, Search, Check, X, RefreshCw} from 'lucide-react';
import Slidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { pickList } from '../../services/apiClient';
import { getUserProfile } from '../../services/authService';
import {
  getSupplierProducts,
  getSupplierOrders,
  createProduct,
  fulfillOrder,
} from '../../services/orderService';
import { useHospitals, useDepartments } from '../../hooks/useHospitals';

const getId = (doc) => doc?._id || doc?.id;

const EMPTY_PRODUCT = {
  name: '',
  productType: 'Medicine',
  department: '',
  description: '',
  price: '',
  stock: '',
  expiryDate: '',
  hospitalName: ''
};

const SupplierPortal = () => {
  const { token } = useAuth();
  // State management
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFulfillRequestModal, setShowFulfillRequestModal] = useState(false);

  const [fulfillrequestloding, setFulfillRequestLoading] = useState(false);
  const [addProductLoading, setAddProductLoading] = useState(false);
  // Form states
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);

  const { hospitals, loading: hospitalsLoading, error: hospitalsError } = useHospitals(token);
  const { departments, loading: departmentsLoading } = useDepartments(
    token,
    newProduct.hospitalName ? { hospitalName: newProduct.hospitalName } : {}
  );

  // Supplier's own products (approved and pending approval)
  const fetchProducts = useCallback(async () => {
    const result = await getSupplierProducts(token);
    if (result.success) {
      const list = pickList(result, "products");
      setProducts(list);
      if (list[0]?.supplier_company) setCompanyName((prev) => prev || list[0].supplier_company);
    } else {
      setError(result.message);
    }
  }, [token]);

  // Stock requests (orders) addressed to this supplier's company
  const fetchStockRequests = useCallback(async () => {
    const result = await getSupplierOrders(token);
    if (result.success) {
      setStockRequests(pickList(result, "orders"));
    } else {
      setError(result.message);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    await Promise.all([fetchProducts(), fetchStockRequests()]);
    setLoading(false);
  }, [token, fetchProducts, fetchStockRequests]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Company name for the header comes from the supplier's own profile.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getUserProfile(token).then((result) => {
      if (!cancelled && result.success && result.data?.user?.companyName) {
        setCompanyName(result.data.user.companyName);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Add new product (the backend sets supplier_company from the logged-in supplier)
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.productType || !newProduct.price || !newProduct.stock || !newProduct.hospitalName) {
      alert("Please fill in all required fields");
      return;
    }

    const productData = {
      product_name: newProduct.name.trim(),
      product_type: newProduct.productType,
      department: newProduct.department || "",
      description: newProduct.description || "",
      price_per_strip: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock, 10),
      hospitalName: newProduct.hospitalName,
      ...(newProduct.expiryDate ? { expiry_date: `${newProduct.expiryDate}T00:00:00` } : {}),
    };

    setAddProductLoading(true);
    const result = await createProduct(token, productData);
    setAddProductLoading(false);
    if (result.success) {
      alert(result.message || "Product added successfully and waiting for admin approval");
      setShowAddProductModal(false);
      setNewProduct(EMPTY_PRODUCT);
      fetchProducts();
    } else {
      alert("Failed to add product: " + result.message);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return (
      (product.product_name || '').toLowerCase().includes(query) ||
      (product.product_type || '').toLowerCase().includes(query) ||
      (product.hospitalName || '').toLowerCase().includes(query)
    );
  });


  const [requestFulfillment, setRequestFulfillment] = useState({
    quantity: '',
    expiryDate: '',
    notes: '',
    price_per_strip: '',
    total_price: 0
  });


  // Fulfill stock request
  const handleFulfillRequest = async () => {
    const orderId = getId(selectedRequest);
    const quantity = parseInt(requestFulfillment.quantity, 10);
    const price = parseFloat(requestFulfillment.price_per_strip || selectedRequest?.price_per_strip);
    if (!orderId || !quantity || !requestFulfillment.expiryDate) {
      alert("Please fill in all required fields");
      return;
    }
    if (quantity > selectedRequest.quantity_ordered) {
      alert("Fulfilled quantity cannot exceed requested quantity");
      return;
    }
    if (!selectedRequest.hospitalName) {
      alert("Hospital name is missing from the request");
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      alert("Invalid price");
      return;
    }

    setFulfillRequestLoading(true);
    const result = await fulfillOrder(token, orderId, {
      hospitalName: selectedRequest.hospitalName,
      quantity_fulfilled: quantity,
      price_per_strip: price,
      expiry_date: requestFulfillment.expiryDate,
      fulfillment_notes: requestFulfillment.notes,
    });
    setFulfillRequestLoading(false);

    if (result.success) {
      alert(result.message || "Request fulfilled successfully");
      setShowFulfillRequestModal(false);
      fetchStockRequests();
    } else {
      alert("Failed to fulfill request: " + result.message);
    }
  };

  const handleRefresh = () => {
    loadAll();
  };
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStockRequests = stockRequests.filter(request => {
    if (statusFilter === 'all') return true;
    return (request.status || 'requested') === statusFilter;
  });

  const pendingRequests = stockRequests.filter(req => req.status === "requested").length;

  // Format date strings
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Slidebar activeTab="suppproduct" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 mt-8">
          <div className="container mx-auto py-6 px-4">
            <h1 className="text-2xl font-bold text-teal-700 mb-8">
              Supplier Portal{companyName ? ` - ${companyName}` : ''}
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
            )}

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-teal-100 rounded-full">
                    <Package size={20} className="text-teal-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Products</p>
                    <h3 className="text-2xl font-bold">{products.length}</h3>
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
                    <h3 className="text-2xl font-bold">{pendingRequests}</h3>
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
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Approval</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product, index) => (
                            <tr key={getId(product) || index} className="hover:bg-green-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {product.product_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.product_type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.hospitalName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.department || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.description || "No description available"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₹{product.price_per_strip}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  product.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {product.is_approved ? 'Approved' : 'Pending'}
                                </span>
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
                          <tr key={getId(request) || index} className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {request.product_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.hospitalName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                {request.quantity_ordered} units
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.price_per_strip}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(request.order_date || request.created_at)}
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
                                      quantity: request.quantity_ordered,
                                      expiryDate: '',
                                      notes: '',
                                      price_per_strip: request.price_per_strip,
                                      total_price: request.quantity_ordered * request.price_per_strip
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
                          <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
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
                  {selectedProduct.product_name}
                </h4>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Product Type</p>
                    <p className="font-medium">{selectedProduct.product_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium">{selectedProduct.department || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Price (Per Strip)</p>
                    <p className="font-medium">₹{selectedProduct.price_per_strip}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Stock</p>
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full ${
                      selectedProduct.stock > 50 ? 'bg-green-100 text-green-800' :
                      selectedProduct.stock > 20 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedProduct.stock ?? 0} units
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Expiry Date</p>
                  <p className="font-medium">{formatDate(selectedProduct.expiry_date)}</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Hospital</p>
                  <p className="font-medium">{selectedProduct.hospitalName || "N/A"}</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Approval</p>
                  <p className="font-medium">{selectedProduct.is_approved ? "Approved by hospital admin" : "Waiting for hospital admin approval"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedProduct.description || "No description available for this product."}
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

                  <div className="mt-3">
                    <label htmlFor="department" className="block text-sm font-medium text-teal-700 mb-1">
                      Department
                    </label>
                    <select
                      id="department"
                      value={newProduct.department}
                      onChange={(e) => setNewProduct({...newProduct, department: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      disabled={!newProduct.hospitalName || departmentsLoading}
                    >
                      <option value="">
                        {!newProduct.hospitalName
                          ? "Select a hospital first"
                          : departmentsLoading
                            ? "Loading departments..."
                            : "General (no specific department)"}
                      </option>
                      {departments.map((dept) => (
                        <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
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
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      id="expiryDate"
                      value={newProduct.expiryDate}
                      onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                      value={newProduct.hospitalName}
                      onChange={(e) => setNewProduct({...newProduct, hospitalName: e.target.value, department: ''})}
                      className="w-full border border-green-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      required
                      disabled={hospitalsLoading}
                    >
                      <option value="">{hospitalsLoading ? "Loading hospitals..." : "Select Hospital"}</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id || hospital.name} value={hospital.name}>{hospital.name}</option>
                      ))}
                    </select>
                    {hospitalsError && (
                      <p className="text-xs text-red-600 mt-1">{hospitalsError}</p>
                    )}
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
                disabled={addProductLoading}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-md hover:from-teal-600 hover:to-blue-600 transition-colors flex items-center disabled:opacity-50"
              >
                <Plus size={16} className="mr-2" />
                {addProductLoading ? "Adding..." : "Add Product"}
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
                        <p className="font-medium">{selectedRequest.hospitalName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Product</p>
                        <p className="font-medium">{selectedRequest.product_name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="font-medium">{selectedRequest.product_type || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Requested Quantity</p>
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {selectedRequest.quantity_ordered} units
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
                        <p className="font-medium">{formatDate(selectedRequest.order_date || selectedRequest.created_at)}</p>
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
                      {parseInt(requestFulfillment.quantity) < parseInt(selectedRequest.quantity_ordered) && requestFulfillment.quantity && (
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
                        value={requestFulfillment.price_per_strip}
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