import { useState, useEffect } from 'react';
import { Package, AlertCircle, Truck, Search, Check, X, ShoppingCart, RefreshCw } from 'lucide-react';
import Slidebar from '../../pages/Slidebar';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [stockRequests, setStockRequests] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState(50);
  const [showNewProductsModal, setShowNewProductsModal] = useState(false);

  const [requestLoading, setRequestLoading] = useState(false);


  useEffect(() => {
    fetchProducts();
    fetchStockRequests();
    fetchNewProducts(); 
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Get the hospital name from session storage
      const hospitalName = sessionStorage.getItem("hospitalName");
     
      if (!hospitalName) {
          console.error("Hospital name is missing in session storage.");
          return;
      }
      console.log("Hospital Name:", hospitalName);
   
      // Make an API call to fetch products for the specified hospital
      const response = await axios.get(`http://127.0.0.1:8000/api/get_products/${hospitalName}/`, {
          headers: {
              Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
          }
      });

      if (response.data.status === "success") {
          // Process products to add status based on stock level
          const processedProducts = response.data.products.map(product => ({
            name: product["Product Name"],
            type: product["Product Type"],
            supplier: product["Supplier Company"],
            price: product["Price (Per Unit/Strip)"],
            stock: product["Stock"],
            // expiryDate: product["Expiry Date"],
            status: (product["Stock"] || 0) <= 40 ? "Low Stock" : "In Stock",
          }));
          setProducts(processedProducts);
          console.log("Fetched products:", processedProducts);
      } else {
          console.error("Error in API response:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockRequests = async () => {
    try {
      const hospitalName = sessionStorage.getItem("hospitalName");
      if (!hospitalName) {
        console.error("Hospital name is missing in session storage.");
        return;
      }
      const response = await axios.get(`http://127.0.0.1:8000/api/get_stocks_requests_by_hospital/${hospitalName}/`,{
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
          }
      });
      
      if (response.data.status === "success") {
        setStockRequests(response.data.requests || []);
        
        // Add notifications for new requests
        const pendingRequests = (response.data.requests || []).filter(req => req.status === "requested");
        console.log("Pending Requests:", pendingRequests);
      }
    } catch (error) {
      console.error("Error fetching stock requests:", error);
    }
  };

  const handleRequestStock = async (product) => {
    setSelectedProduct(product);
    setShowRequestModal(true);
  };

  const submitStockRequest = async () => {
    try {
      setRequestLoading(true);
      const hospitalName = sessionStorage.getItem("hospitalName");
      
      if (!selectedProduct) {
        console.error("No product selected");
        return;
      }
      if (!hospitalName) {
        console.error("Hospital name is missing in session storage.");
        return;
      }
      if (requestQuantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
      }
      if(!selectedProduct.price || selectedProduct.price <= 0) {
        alert("Price is not available for this product.");
        return;
      }
      
      await axios.post("http://127.0.0.1:8000/api/request_stock/", {
        product_name: selectedProduct.name,
        product_type: selectedProduct.type,
        supplier: selectedProduct.supplier,
        hospital_name: hospitalName,
        quantity: requestQuantity,
        price_per_strip: parseFloat(selectedProduct.price) || 0  // Ensure this is sent as a number
        
      }, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
        }
      });

      console.log("Stock request sent successfully");
      alert("Stock request sent successfully!");

      
      setShowRequestModal(false);
      setSelectedProduct(null);
      setRequestQuantity(0);
      
      // Refresh stock requests
      fetchStockRequests();
    } catch (error) {
      console.error("Error requesting stock:", error);
      alert("Failed to send stock request. Please try again.");
    }
    finally {
      setRequestLoading(false);
    }
  };
  // Add this function to fetch new products from temp_products collection
const fetchNewProducts = async () => {
  try {
    const hospitalName = sessionStorage.getItem("hospitalName");
    if (!hospitalName) {
      console.error("Hospital name is missing in session storage.");
      return;
    }
    
    const response = await axios.get(`http://127.0.0.1:8000/api/get_new_products/${hospitalName}/`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
      }
    });
    
    if (response.data.status === "success") {
      setNewProducts(response.data.products || []);
      console.log("Fetched new products:", response.data.products);
    } else {
      console.error("Error in API response:", response.data.message);
    }
  } catch (error) {
    console.error("Error fetching new products:", error);
  }
};

  const handleApproveProduct = async (productId, status) => {
    try {
      const hospitalName = sessionStorage.getItem("hospitalName");
      
      await axios.put(`http://127.0.0.1:8000/api/approve_new_product/${productId}/`, {
        status,
        hospital_name: hospitalName
      }, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
        }
      });
      
      // Update product status locally
      setNewProducts(newProducts.map(product => 
        product._id === productId ? { ...product, status } : product
      ));
      
      // If approved, refresh products
      if (status === "approved") {
        fetchProducts();
      }
      
      // Add notification
      const product = newProducts.find(p => p._id === productId);
      console.log(`Product ${product.name} has been ${status}`);
    } catch (error) {
      console.error("Error updating product status:", error);
      alert("Failed to update product status. Please try again.");
    }
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

  // Calculate counts from actual data
  const totalProducts = products.length;
  const lowStockItems = products.filter(product => product.status === 'Low Stock').length;
  const pendingRequestsCount = stockRequests.filter(req => req.status === "requested").length || 0;
  const newProductsCount = newProducts.filter(prod => prod.status === "pending").length || 0;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
        console.log("Razorpay SDK loaded successfully.");
    };
    script.onerror = () => {
        console.error("Failed to load Razorpay SDK.");
    };
    document.body.appendChild(script);
}, []);

  const completeOrder = async (order) => {
    if (!order || !order._id) {
      alert("Invalid order information");
      return;
    }
  
    try {
      const hospitalName = sessionStorage.getItem("hospitalName");
      if (!hospitalName) {
        console.error("Hospital name is missing in session storage.");
        return;
      }
      if (!order.supplier) {
        alert("Supplier information is missing in the order.");
        return;
      }
      if (!order.product_name) {
        alert("Product name is missing in the order.");
        return;
      }


  
      // Calculate the total amount to be paid
      const amount = order.total_price || (order.quantity_fulfilled * order.price_per_strip);
      if (amount <= 0) {
        alert("Invalid amount for payment.");
        return;
      }
  
      // Create payment order
      const response = await axios.post("http://127.0.0.1:8000/api/create_payment_products/", {
        amount: amount,
        companyName: order.supplier,
        hospitalName: hospitalName,
        product_name: order.product_name,
        quantity: order.quantity_fulfilled,
        order_id: order._id // Pass the existing order ID to link the payment
      }, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
        }
      });
  
      const { order_id, key } = response.data;
  
      // Open Razorpay payment modal
      const options = {
        key: key,
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "HMS Healthcare",
        description: "Supplier payment for product order",
        order_id: order_id,
        handler: async function (paymentResult) {
          // Verify payment
          const payment_id = paymentResult.razorpay_payment_id;
          const verifyResponse = await axios.post("http://127.0.0.1:8000/api/verify_payment_products/", {
            payment_id: payment_id,
            order_id: order_id,
            companyName: hospitalName,
            hospitalName: hospitalName,
            product_name: order.product_name,
            quantity: order.quantity_fulfilled,
            amount: amount, 
          }, {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
            }
          });
  
          if (verifyResponse.data.status === "success") {
            console.log("Payment verification successful:", verifyResponse.data);
            
            // Update order status to fulfilled after successful payment
            const updateResponse = await axios.post(`http://127.0.0.1:8000/api/complete_order/${order._id}/`, {
              hospital_name: hospitalName,
              payment_id: payment_id,
            }, {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
              }
            });
            
            if (updateResponse.data.status === "success") {
              alert("Payment successful! Order has been completed.");
              
              // Update the local state to reflect the change
              setStockRequests(stockRequests.map(req => 
                req._id === order._id 
                  ? { ...req, status: "completed", updated_at: new Date() } 
                  : req
              ));
              
              // Refresh products to update stock
              await fetchProducts();
            } else {
              alert(updateResponse.data.message || "Failed to update order status. Please contact support.");
            }
          } else {
            alert("Payment verification failed. Please try again.");
          }
        },
        prefill: {
          email: sessionStorage.getItem("email"),
        },
        theme: {
          color: "#3399cc",
        },
      };
  
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("An error occurred while processing the payment. Please try again.");
    }
  };


  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchProducts();
      await fetchStockRequests();
      await fetchNewProducts();
      console.log("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Slidebar activeTab="department" userType="admin" />
      
     
      
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
                        fetchNewProducts(); // Fetch new products when the button is clicked
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
                    <option>Medicine</option>
                    <option>Equipment</option>
                  </select>
                  <select
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    <div className="px-4 py-2 flex items-center bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 transition-all"></div>
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
                    {stockRequests && stockRequests.filter(req => req.status === "requested" || !req.status).length > 0 ? (
                      stockRequests
                      .filter(req => req.status === "requested" || !req.status)
                      .map((request) => (
                        <tr key={request._id || Math.random().toString(36).substr(2, 9)} 
                            className="hover:bg-green-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.price_per_strip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            { new Date(request.created_at || new Date()).toLocaleString()}
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
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
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
                    {stockRequests && stockRequests.filter(req => req.status === "processing" || req.status === "fulfilled").length > 0 ? (
                      stockRequests
                        .filter(req => req.status === "processing" || req.status === "completed")
                        .map((order) => (
                          <tr key={order._id || Math.random().toString(36).substr(2, 9)} 
                              className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.product_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.supplier}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.quantity_fulfilled || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₹{order.total_price?.toFixed(2) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              { new Date(order.updated_at || new Date()).toLocaleString()}
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
                                  className="px-3 py-1 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 text-xs transition-colors"
                                >
                                  Complete Order
                                </button>
                              )}
                              {order.status === 'fulfilled' && (
                                <span className="text-xs text-gray-500">Completed</span>
                              )}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          No processing or fulfilled orders found
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
                  {newProducts && newProducts.length > 0 ? (
                    newProducts.map((product) => (
                      <tr key={product._id || Math.random().toString(36).substr(2, 9)} 
                          className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product["Product Name"]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product["Product Type"]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product["Supplier Company"]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{product["Price (Per Unit/Strip)"]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product["Stock"]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.status === 'approved' ? 'bg-green-100 text-green-800' :
                            product.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.status ? (product.status.charAt(0).toUpperCase() + product.status.slice(1)) : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {product.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveProduct(product._id, "approved")}
                                className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleApproveProduct(product._id, "rejected")}
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