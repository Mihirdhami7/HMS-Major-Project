import { useState, useEffect, useCallback, useMemo } from 'react';
import Slidebar from "../../components/Sidebar";
import { FiPackage, FiSearch, FiFilter, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { listProducts } from "../../services/orderService";

const MedicalProducts = () => {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const [activeTab, setActiveTab] = useState("medical_products");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    if (!hospitalName) {
      setError("No hospital is linked to your account.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await listProducts(token, hospitalName);
    if (result.success) {
      setProducts(
        pickList(result, "products").map((product) => ({
          id: product._id || product.id,
          name: product.product_name || "Unnamed product",
          category: product.product_type || "Other",
          price: Number(product.price_per_strip) || 0,
          description: product.description || "",
          stock: Number(product.stock) || 0,
          status: product.status || "",
          supplier: product.supplier_company || "-",
          department: product.department || "",
        }))
      );
      setError(null);
    } else {
      setProducts([]);
      setError(result.message || "Failed to fetch products");
    }
    setLoading(false);
  }, [token, hospitalName]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      category === "all" ||
      product.category.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 p-6 overflow-y-auto">

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-blue-700 flex items-center">
            <FiPackage className="mr-2 text-green-600" />
            Medical Products
          </h2>
          <button
            onClick={fetchProducts}
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
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all hover:scale-105 border border-blue-100 hover:border-green-200">
                  <div className="h-24 bg-gradient-to-r from-blue-100 to-green-100 flex items-center justify-center">
                    <FiPackage className="text-blue-400" size={40} />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-blue-700">{product.name}</h3>
                      <span className="text-green-600 font-semibold">₹{product.price}</span>
                    </div>
                    {product.description && (
                      <p className="text-gray-600 mb-4">{product.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {product.category}
                      </span>
                      <span className={`text-sm ${product.stock > 0 ? "text-gray-600" : "text-red-500"}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Supplier: {product.supplier}
                    </div>
                    {product.department && (
                      <div className="text-sm text-gray-500">Department: {product.department}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500">
                  {products.length === 0 && !error
                    ? "No approved products for this hospital yet."
                    : "No products found matching your search criteria"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalProducts;
