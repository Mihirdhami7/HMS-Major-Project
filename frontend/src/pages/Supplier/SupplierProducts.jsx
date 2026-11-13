import { useState, useEffect, useCallback, useMemo } from "react";
import { FiPlus, FiRefreshCw, FiSearch } from "react-icons/fi";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierProducts, createProduct } from "../../services/orderService";
import { useHospitals, useDepartments } from "../../hooks/useHospitals";
import { StatCard, Card, Empty, Modal } from "./SupplierUi";
import {
  LOW_STOCK, getId, formatDate, isLowStock, money, PAGE_FRAME, inputClass, labelClass,
} from "./supplierUtils";

const EMPTY_PRODUCT = {
  name: "",
  productType: "Medicine",
  department: "",
  description: "",
  price: "",
  stock: "",
  expiryDate: "",
  hospitalName: "",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "pending", label: "Awaiting approval" },
  { key: "low", label: "Low stock" },
];

const stockBadge = (stock) => {
  const n = Number(stock) || 0;
  if (n <= 0) return "bg-red-100 text-red-700";
  if (n < LOW_STOCK) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-700";
};

/** Supplier products: everything the supplier offers to hospitals, plus adding new products. */
const SupplierProducts = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [hospitalFilter, setHospitalFilter] = useState("");

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);

  const { hospitals, loading: hospitalsLoading, error: hospitalsError } = useHospitals(token);
  const { departments, loading: departmentsLoading } = useDepartments(
    token,
    newProduct.hospitalName ? { hospitalName: newProduct.hospitalName } : {}
  );

  // Supplier's own products (approved and pending approval)
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSupplierProducts(token);
    if (result.success) setProducts(pickList(result, "products"));
    else setError(result.message);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  const stats = useMemo(() => {
    const approved = products.filter((p) => p.is_approved);
    return {
      approved: approved.length,
      pending: products.length - approved.length,
      low: products.filter(isLowStock).length,
      stockValue: approved.reduce((s, p) => s + (Number(p.stock) || 0) * (Number(p.price_per_strip) || 0), 0),
      hospitals: [...new Set(products.map((p) => p.hospitalName).filter(Boolean))].sort(),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "approved" && !p.is_approved) return false;
      if (filter === "pending" && p.is_approved) return false;
      if (filter === "low" && !isLowStock(p)) return false;
      if (hospitalFilter && p.hospitalName !== hospitalFilter) return false;
      if (!query) return true;
      return [p.product_name, p.product_type, p.hospitalName, p.department].some((v) => (v || "").toLowerCase().includes(query));
    });
  }, [products, filter, hospitalFilter, searchQuery]);

  const v = (n) => (loading ? "…" : n);

  return (
    <div className={PAGE_FRAME}>
      <Slidebar activeTab="suppproduct" />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Products</h1>
              <p className="text-sm text-gray-500">Medicines and supplies you offer to hospitals</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchProducts}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 shadow-sm"
              >
                <FiPlus /> Add New Product
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Product summary (click to filter) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📦" label="Total Products" value={v(products.length)} sub={`${stats.hospitals.length} hospitals`} onClick={() => setFilter("all")} active={filter === "all"} />
            <StatCard icon="✅" label="Approved" value={v(stats.approved)} sub={`Stock value ${money(stats.stockValue)}`} onClick={() => setFilter("approved")} active={filter === "approved"} />
            <StatCard icon="🕒" label="Awaiting Approval" value={v(stats.pending)} sub="Hospital admin must approve" onClick={() => setFilter("pending")} active={filter === "pending"} />
            <StatCard icon="⚠️" label="Low Stock" value={v(stats.low)} sub={`Approved, under ${LOW_STOCK} strips`} onClick={() => setFilter("low")} active={filter === "low"} />
          </div>

          {/* Product list */}
          <Card
            title="Products"
            subtitle={`${filteredProducts.length} of ${products.length} shown`}
            right={
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-2.5 py-1 text-xs rounded-md ${filter === f.key ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, type, hospital or department"
                  className={`${inputClass} pl-9`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select value={hospitalFilter} onChange={(e) => setHospitalFilter(e.target.value)} className={`${inputClass} md:w-56`}>
                <option value="">All hospitals</option>
                {stats.hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {filteredProducts.length === 0 ? (
              <Empty text={loading ? "Loading products…" : "No products found."} />
            ) : (
              <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3 font-medium">Product</th>
                      <th className="py-2 pr-3 font-medium">Hospital</th>
                      <th className="py-2 pr-3 font-medium">Department</th>
                      <th className="py-2 pr-3 font-medium">Price / strip</th>
                      <th className="py-2 pr-3 font-medium">Stock</th>
                      <th className="py-2 pr-3 font-medium">Approval</th>
                      <th className="py-2 font-medium text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => (
                      <tr key={getId(product) || index} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-gray-800">{product.product_name}</p>
                          <p className="text-xs text-gray-500">{product.product_type}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-700">{product.hospitalName}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{product.department || "General"}</td>
                        <td className="py-2.5 pr-3 text-gray-700">₹{product.price_per_strip}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge(product.stock)}`}>{product.stock ?? 0}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.is_approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>
                            {product.is_approved ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Product Details */}
      {selectedProduct && (
        <Modal
          title={selectedProduct.product_name}
          subtitle={`${selectedProduct.product_type || "Product"} · ${selectedProduct.hospitalName || ""}`}
          onClose={() => setSelectedProduct(null)}
          size="max-w-md"
          footer={
            <button onClick={() => setSelectedProduct(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              Close
            </button>
          }
        >
          <div className="space-y-3 text-sm">
            {[
              ["Department", selectedProduct.department || "General"],
              ["Price (per strip)", `₹${selectedProduct.price_per_strip}`],
              ["Expiry date", formatDate(selectedProduct.expiry_date)],
              ["Approval", selectedProduct.is_approved ? "Approved by hospital admin" : "Waiting for hospital admin approval"],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-800 text-right">{val}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
              <span className="text-gray-500">Current stock</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge(selectedProduct.stock)}`}>{selectedProduct.stock ?? 0} strips</span>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Description</p>
              <p className="text-gray-700">{selectedProduct.description || "No description available for this product."}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Product */}
      {showAddProductModal && (
        <Modal
          title="Add New Product"
          subtitle="New products need hospital admin approval before they appear in the inventory"
          onClose={() => setShowAddProductModal(false)}
          size="max-w-3xl"
          footer={
            <>
              <button onClick={() => setShowAddProductModal(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={addProductLoading}
                className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
              >
                <FiPlus /> {addProductLoading ? "Adding..." : "Add Product"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className={labelClass}>Product Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className={inputClass}
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <label htmlFor="productType" className={labelClass}>Product Type <span className="text-red-500">*</span></label>
                <select
                  id="productType"
                  value={newProduct.productType}
                  onChange={(e) => setNewProduct({ ...newProduct, productType: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="Medicine">Medicine</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Supplies">Supplies</option>
                </select>
              </div>
              <div>
                <label htmlFor="hospital" className={labelClass}>Hospital <span className="text-red-500">*</span></label>
                <select
                  id="hospital"
                  value={newProduct.hospitalName}
                  onChange={(e) => setNewProduct({ ...newProduct, hospitalName: e.target.value, department: "" })}
                  className={inputClass}
                  required
                  disabled={hospitalsLoading}
                >
                  <option value="">{hospitalsLoading ? "Loading hospitals..." : "Select Hospital"}</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id || hospital.name} value={hospital.name}>{hospital.name}</option>
                  ))}
                </select>
                {hospitalsError && <p className="text-xs text-red-600 mt-1">{hospitalsError}</p>}
              </div>
              <div>
                <label htmlFor="department" className={labelClass}>Department</label>
                <select
                  id="department"
                  value={newProduct.department}
                  onChange={(e) => setNewProduct({ ...newProduct, department: e.target.value })}
                  className={inputClass}
                  disabled={!newProduct.hospitalName || departmentsLoading}
                >
                  <option value="">
                    {!newProduct.hospitalName ? "Select a hospital first" : departmentsLoading ? "Loading departments..." : "General (no specific department)"}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="price" className={labelClass}>Price Per Strip (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    id="price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className={inputClass}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="stock" className={labelClass}>Initial Stock <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    id="stock"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className={inputClass}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="expiryDate" className={labelClass}>Expiry Date</label>
                <input
                  type="date"
                  id="expiryDate"
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                  className={inputClass}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows="5"
                  placeholder="Enter product description, usage, side effects, etc."
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupplierProducts;
