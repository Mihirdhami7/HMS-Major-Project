import { useState, useEffect, useCallback } from 'react';
import { Package, AlertCircle, Truck, Search, Check, X, ShoppingCart, RefreshCw } from 'lucide-react';
import Slidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { pickList } from '../../services/apiClient';
import {
  listProducts,
  listOrders,
  createOrder,
  listUnapprovedProducts,
  approveProduct,
  completeOrder as completeOrderApi,
} from '../../services/orderService';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/paymentService';

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Load the Razorpay checkout script once, only when a payment is started.
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RAZORPAY_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const getId = (doc) => doc?._id || doc?.id;

const Products = () => {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stockRequests, setStockRequests] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState(50);
  const [showNewProductsModal, setShowNewProductsModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState(null);

  const fetchProducts = useCallback(async () => {
    if (!token || !hospitalName) return;
    const result = await listProducts(token, hospitalName);
    if (result.success) {
      const processedProducts = pickList(result, "products").map((product) => ({
        id: getId(product),
        name: product.product_name,
        type: product.product_type,
        supplier: product.supplier_company,
        price: product.price_per_strip,
        stock: product.stock ?? 0,
        department: product.department,
        status: product.status || ((product.stock || 0) < 40 ? "Low Stock" : "In Stock"),
      }));
      setProducts(processedProducts);
    } else {
      setError(result.message);
    }
  }, [token, hospitalName]);

  const fetchStockRequests = useCallback(async () => {
    if (!token) return;
    const result = await listOrders(token);
    if (result.success) {
      setStockRequests(pickList(result, "orders"));
    } else {
      setError(result.message);
    }
  }, [token]);

  const fetchNewProducts = useCallback(async () => {
    if (!token || !hospitalName) return;
    const result = await listUnapprovedProducts(token, hospitalName);
    if (result.success) {
      setNewProducts(pickList(result, "products"));
    } else {
      setError(result.message);
    }
  }, [token, hospitalName]);

  const loadAll = useCallback(async () => {
    if (!hospitalName) {
      setError("Hospital information is missing from your account. Please log in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    await Promise.all([fetchProducts(), fetchStockRequests(), fetchNewProducts()]);
    setLoading(false);
  }, [hospitalName, fetchProducts, fetchStockRequests, fetchNewProducts]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRequestStock = (product) => {
    setSelectedProduct(product);
    setShowRequestModal(true);
  };

  const submitStockRequest = async () => {
    if (!selectedProduct) return;
    if (requestQuantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    if (!selectedProduct.price || selectedProduct.price <= 0) {
      alert("Price is not available for this product.");
      return;
    }
    setRequestLoading(true);
    const result = await createOrder(token, {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_type: selectedProduct.type,
      supplier_company: selectedProduct.supplier,
      hospitalName,
      department: selectedProduct.department || "",
      quantity: requestQuantity,
      price_per_strip: parseFloat(selectedProduct.price),
    });
    setRequestLoading(false);
    if (result.success) {
      alert(result.message || "Stock request sent successfully!");
      setShowRequestModal(false);
      setSelectedProduct(null);
      setRequestQuantity(50);
      fetchStockRequests();
    } else {
      alert(result.message);
    }
  };

  const handleApproveProduct = async (productId, status) => {
    const result = await approveProduct(token, productId, { status });
    if (!result.success) {
      alert(result.message);
      return;
    }
    // Approved products move to the inventory; rejected ones are deleted by the backend.
    setNewProducts((prev) => prev.filter((product) => getId(product) !== productId));
    if (status === "approved") fetchProducts();
  };

  // Filter products based on search and selected filters
  const filteredProducts = products.filter((product) => {
    const name = typeof product.name === "string" ? product.name : "";
    const type = product.type || "";
    const status = product.status || "";

    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedType === "All Types" || type === selectedType) &&
      (selectedStatus === "All Status" || status === selectedStatus)
    );
  });

  const productTypes = [...new Set(products.map((p) => p.type).filter(Boolean))];

  // Calculate counts from actual data
  const totalProducts = products.length;
  const lowStockItems = products.filter(product => product.status !== 'In Stock').length;
  const pendingRequestsCount = stockRequests.filter(req => req.status === "requested").length;
  const newProductsCount = newProducts.length;

  const finishOrder = async (order, paymentId) => {
    const result = await completeOrderApi(token, getId(order), {
      hospitalName,
      payment_id: paymentId,
    });
    if (result.success) {
      alert("Payment successful! Order has been completed.");
      await Promise.all([fetchStockRequests(), fetchProducts()]);
    } else {
      setNotice(`Payment went through but the order could not be marked completed: ${result.message}`);
    }
  };

  const completeOrder = async (order) => {
    const orderId = getId(order);
    if (!orderId) {
      alert("Invalid order information");
      return;
    }
    const quantity = order.quantity_fulfilled || order.quantity_ordered;
    const amount = (quantity * order.price_per_strip) || Number(order.total_price);
    if (!amount || amount <= 0) {
      alert("Invalid amount for payment.");
      return;
    }

    setNotice("");
    setPayingOrderId(orderId);
    const paymentId = `PAY-${orderId}-${Date.now()}`;
    const paymentData = {
      payment_id: paymentId,
      order_id: orderId,
      source: "SUPPLIER",
      category: "SUPPLIER_PURCHASE",
      amount: Number(amount.toFixed(2)),
      currency: "INR",
      quantity,
      hospital_name: hospitalName,
      company_name: order.supplier_company,
      product_name: order.product_name,
      // Orders do not store the supplier's user id; the company name identifies the supplier.
      supplier_id: order.supplier_company,
      supplier_name: order.supplier_company,
      purchase_order_id: orderId,
    };

    try {
      const created = await createRazorpayOrder(token, paymentData);
      if (!created.success) {
        setNotice(`Payment could not be started: ${created.message}`);
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setNotice("Could not load the Razorpay checkout. Check your internet connection.");
        return;
      }
      const { razorpay_key_id, razorpay_order } = created.data || {};
      const razorpay = new window.Razorpay({
        key: razorpay_key_id,
        amount: razorpay_order?.amount,
        currency: razorpay_order?.currency || "INR",
        name: "HMS Healthcare",
        description: `Supplier payment for ${order.product_name}`,
        order_id: razorpay_order?.id,
        handler: async (paymentResult) => {
          const verified = await verifyRazorpayPayment(token, {
            ...paymentData,
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          });
          if (!verified.success) {
            setNotice(`Payment verification failed: ${verified.message}`);
            return;
          }
          await finishOrder(order, paymentId);
        },
        prefill: { email: user?.email, name: user?.name },
        theme: { color: "#3399cc" },
      });
      razorpay.open();
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleRefresh = () => {
    loadAll();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Slidebar activeTab="product" />
      
     
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 mt-8">
          {/* Main Content */}
          <div className="container mx-auto py-6 px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-teal-700">Inventory Management</h1>
            
            {/* Add refresh button */}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 flex items-center transition-colors"
              disabled={loading}
            >
              <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
          )}
          {notice && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex justify-between items-start">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} className="ml-4 text-yellow-700 hover:text-yellow-900"><X size={16} /></button>
            </div>
          )}
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-teal-100 rounded-full">
                    <Package size={20} className="text-teal-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Products</p>
                    <h3 className="text-2xl font-bold">{totalProducts}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500 hover:shadow-md transition-shadow">
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
              
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Truck size={20} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Pending Orders</p>
                    <h3 className="text-2xl font-bold">{pendingRequestsCount}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <ShoppingCart size={20} className="text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">New Products</p>
                      <h3 className="text-2xl font-bold">{newProductsCount}</h3>
                    </div>
                  </div>
                  { (
                    <button 
                      onClick={() => {
                        fetchNewProducts();
                        setShowNewProductsModal(true);
                      }} 
                      className="px-3 py-1 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-md text-xs hover:from-teal-600 hover:to-blue-600 transition-colors"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Inventory Search & Filters */}
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
                <div className="flex gap-4">
                  <select
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option>All Types</option>
                    {productTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                  <select
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option>All Status</option>
                    <option>In Stock</option>
                    <option>Low Stock</option>
                    <option>Out of Stock</option>
                  </select>
                </div>
              </div>
              
              {/* Products Table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <RefreshCw size={24} className="animate-spin text-teal-600" />
                  </div>
                ) : (
                  <table className="min-w-full bg-white">
                    <thead className=" bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-left">Supplier</th>
                        <th className="px-6 py-3 text-left">Price</th>
                        <th className="px-6 py-3 text-left">Stock</th>
                        {/* <th className="px-6 py-3 text-left">Expiry Date</th> */}
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product, index) => (
                          <tr key={`${product.id || index}`} className="hover:bg-green-50 transition-colors">
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
                            {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.expiryDate}
                            </td> */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                product.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.status === 'Low Stock' ? (
                                <button
                                  onClick={() => handleRequestStock(product)}
                                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 text-xs transition-colors"
                                >
                                  Request Stock
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRequestStock(product)}
                                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 text-xs transition-colors"
                                >
                                  Request More
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
            
          {/*Pending Stock Requests Section */}
          <div className="mt-6 w-full bg-white p-6 rounded-lg shadow-lg border border-teal-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold from-blue-500">Pending Stock Requests</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Requested Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        price (per strip)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Request Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockRequests.filter(req => req.status === "requested" || !req.status).length > 0 ? (
                      stockRequests
                      .filter(req => req.status === "requested" || !req.status)
                      .map((request) => (
                        <tr key={getId(request)} 
                            className="hover:bg-green-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.supplier_company}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.quantity_ordered}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.price_per_strip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.order_date || request.created_at ? new Date(request.order_date || request.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Requested
                            </span>
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
              </div>
            </div>
            
            {/* Processing and Completed Orders Section */}
            <div className="mt-6 w-full bg-white p-6 rounded-lg shadow-lg border border-teal-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-green-600">Order Tracking</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Requested Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Fulfilled Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Update Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockRequests.filter(req => req.status === "processing" || req.status === "completed").length > 0 ? (
                      stockRequests
                        .filter(req => req.status === "processing" || req.status === "completed")
                        .map((order) => (
                          <tr key={getId(order)} 
                              className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.product_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.supplier_company}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.quantity_ordered}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.quantity_fulfilled || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.quantity_fulfilled && order.price_per_strip
                                ? `₹${(order.quantity_fulfilled * order.price_per_strip).toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.updated_at ? new Date(order.updated_at).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.status === 'processing' ? 'Processing' : 'Completed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {order.status === 'processing' && (
                                <button
                                  onClick={() => completeOrder(order)}
                                  disabled={payingOrderId === getId(order)}
                                  className="px-3 py-1 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 text-xs transition-colors disabled:opacity-50"
                                >
                                  {payingOrderId === getId(order) ? 'Starting payment...' : 'Pay & Complete'}
                                </button>
                              )}
                              {order.status === 'completed' && (
                                <span className="text-xs text-gray-500">Completed</span>
                              )}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                          No processing or completed orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stock Request Modal */}
      {showRequestModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-teal-700">Request Stock</h3>
              <button 
                className="text-gray-400 hover:text-gray-500" 
                onClick={() => setShowRequestModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-teal-100 rounded-full mr-3">
                  <Package size={20} className="text-teal-600" />
                </div>
                <h4 className="text-md font-semibold text-teal-700">{selectedProduct.name}</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <p className="text-xs text-gray-500">Product Type</p>
                  <p className="font-medium">{selectedProduct.type || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedProduct.supplier}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <p className="text-xs text-gray-500">Current Stock</p>
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full ${
                    selectedProduct.stock > 50 ? 'bg-green-100 text-green-800' :
                    selectedProduct.stock > 30 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedProduct.stock} units
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-medium">₹{selectedProduct.price}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* <div>
                  <p className="text-xs text-gray-500">Expiry Date</p>
                  <p className="font-medium">{selectedProduct.expiryDate || "N/A"}</p>
                </div> */}
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedProduct.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedProduct.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Request
              </label>
              <div className="flex items-center">
                <button 
                  onClick={() => setRequestQuantity(Math.max(1, requestQuantity - 10))}
                  className="bg-gray-200 p-2 rounded-l-md hover:bg-gray-300"
                >
                  -
                </button>
                <input
                  type="number"
                  id="quantity"
                  value={requestQuantity}
                  onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full border-y border-gray-300 py-2 px-3 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button 
                  onClick={() => setRequestQuantity(requestQuantity + 10)}
                  className="bg-gray-200 p-2 rounded-r-md hover:bg-gray-300"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Recommend to order at least 20% more than minimum requirement</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitStockRequest}
                disabled={requestLoading} // Disable button when loading
                className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                  requestLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600"
                }`}
              >
                {requestLoading ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Truck size={16} className="mr-2" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* New Products Modal */}
      {showNewProductsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-teal-700">New Products from Suppliers</h3>
              <button 
                className="text-gray-400 hover:text-gray-500" 
                onClick={() => setShowNewProductsModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full bg-white">
                <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price (per Strip)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {newProducts.length > 0 ? (
                    newProducts.map((product) => (
                      <tr key={getId(product)} 
                          className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.product_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.supplier_company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{product.price_per_strip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {!product.is_approved && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveProduct(getId(product), "approved")}
                                className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleApproveProduct(getId(product), "rejected")}
                                className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        No new products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowNewProductsModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-md hover:from-teal-600 hover:to-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;