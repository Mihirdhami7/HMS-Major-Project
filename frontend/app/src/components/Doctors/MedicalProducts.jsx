import { useState, useEffect } from 'react';
import Slidebar from "../../pages/Slidebar";
import { FiPackage, FiSearch, FiFilter, FiRefreshCw } from "react-icons/fi";
import axios from 'axios';

const MedicalProducts = () => {
  const [activeTab, setActiveTab] = useState("medical_products");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [hospitalName, setHospitalName] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Get the hospital name from session storage
      const hospitalName = sessionStorage.getItem("hospitalName");
      setHospitalName(hospitalName);
     
      if (!hospitalName) {
          console.error("Hospital name is missing in session storage.");
          return;
      }
      
      // Make an API call to fetch products for the specified hospital
      const response = await axios.get(`http://127.0.0.1:8000/api/get_products/${hospitalName}/`, {
          headers: {
              Authorization: `Bearer ${sessionStorage.getItem("session_Id")}`
          }
      });

      if (response.data.status === "success") {
          // Process products to match the format needed for display
          const processedProducts = response.data.products.map(product => ({
            name: product["Product Name"],
            category: product["Product Type"],
            price: `$${product["Price (Per Unit/Strip)"]}`,
            description: product["Product Description"] || `High-quality ${product["Product Type"].toLowerCase()}`,
            image: product["Image"] || `/images/products/${product["Product Type"].toLowerCase()}.jpg`,
            stock: product["Stock"],
            supplier: product["Supplier Company"]
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Better category matching
    const matchesCategory = 
      category === "all" || 
      product.category.toLowerCase() === category.toLowerCase();
      
    return matchesSearch && matchesCategory;
  });

  const handleRefresh = async () => {
    await fetchProducts();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar userType="doctor" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 p-8 overflow-auto mt-16">

        {/* Hospital Name Display */}
        {hospitalName && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-lg flex items-center border-l-4 border-blue-500">
              <img
                src={
                  hospitalName === "Zydus"
                    ? "/public/images/zydus.png"
                    : hospitalName === "Iris"
                    ? "/public/images/iris.png"
                    : "/public/images/default-hospital.png"
                }
                alt={`${hospitalName} Hospital`}
                className="w-20 h-20 rounded-full mr-4 object-cover"
                onError={(e) => {
                  e.target.src = "/public/images/default-hospital.png";
                  e.target.onerror = null;
                }}
              />
              <div>
                <h3 className="text-lg font-bold text-blue-700">{hospitalName} Hospital</h3>
                <p className="text-sm text-gray-600">
                  {hospitalName === "Zydus"
                    ? "Zydus Hospital is a leading healthcare provider offering world-class medical services and facilities. Our team of specialists ensures the best care for your health."
                    : hospitalName === "Iris"
                    ? "Iris Hospital is known for its advanced medical technology and compassionate care, providing exceptional healthcare services to patients."
                    : "Welcome to our hospital. We are committed to providing quality healthcare services tailored to your needs."}
                </p>
              </div>
            </div>
          )}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-blue-700 flex items-center">
            <FiPackage className="mr-2 text-green-600" />
            Medical Products
          </h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 flex items-center transition-colors"
            disabled={loading}
          >
            <FiRefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-48">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Equipment">Equipment</option>
                <option value="Medicine">Medicines</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all hover:scale-105 border border-blue-100 hover:border-green-200">
                  <div className="h-48 bg-gradient-to-r from-blue-100 to-green-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/400x200?text=Product+Image";
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-blue-700">{product.name}</h3>
                      <span className="text-green-600 font-semibold">{product.price}</span>
                    </div>
                    <p className="text-gray-600 mb-4">{product.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {product.category}
                      </span>
                      <span className="text-gray-600 text-sm">
                        Stock: {product.stock}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Supplier: {product.supplier}
                    </div>
                    <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-2 rounded-lg hover:from-blue-600 hover:to-green-600 transition-all">
                      Order Now
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500">No products found matching your search criteria</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalProducts;