import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierProducts, getSupplierOrders } from "../../services/orderService";

const LOW_STOCK_LIMIT = 40; // same threshold the backend uses for "Low Stock"

function SupplierSection() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("suppdashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const [productsResult, ordersResult] = await Promise.all([
        getSupplierProducts(token),
        getSupplierOrders(token),
      ]);
      if (cancelled) return;
      if (productsResult.success) setProducts(pickList(productsResult, "products"));
      else setError(productsResult.message);
      if (ordersResult.success) setOrders(pickList(ordersResult, "orders"));
      else setError(ordersResult.message);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const displayName = user?.name || user?.email?.split("@")[0] || "Supplier";
  const lowStock = products.filter((p) => p.is_approved && (p.stock || 0) < LOW_STOCK_LIMIT).length;
  const awaitingApproval = products.filter((p) => !p.is_approved).length;
  const newRequests = orders.filter((o) => o.status === "requested").length;
  const processing = orders.filter((o) => o.status === "processing").length;
  const completed = orders.filter((o) => o.status === "completed").length;

  const summary = (text) => (loading ? "Loading..." : text);

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-8 mt-16">
        <div>
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-lg opacity-90">
              Manage your inventory and track your performance all in one place.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-gray-800">Inventory Status</h3>
              <p className="text-gray-600">
                {summary(`${products.length} products, ${lowStock} low in stock, ${awaitingApproval} awaiting approval`)}
              </p>
              <Link to="/supplier/suppproduct" className="inline-block mt-4 text-indigo-500 hover:text-indigo-600">
                View Inventory →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-gray-800">Stock Requests</h3>
              <p className="text-gray-600">
                {summary(`${newRequests} new requests to fulfill, ${processing} awaiting hospital payment`)}
              </p>
              <Link to="/supplier/suppproduct" className="inline-block mt-4 text-indigo-500 hover:text-indigo-600">
                Process Orders →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-gray-800">Performance</h3>
              <p className="text-gray-600">
                {summary(`${completed} of ${orders.length} orders completed`)}
              </p>
              <Link to="/supplier/suppdashboard" className="inline-block mt-4 text-indigo-500 hover:text-indigo-600">
                View Reports →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierSection;
