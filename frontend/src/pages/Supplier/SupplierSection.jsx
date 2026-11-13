import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierProducts, getSupplierOrders } from "../../services/orderService";
import { StatCard, Card, Empty, OrderStatus } from "./SupplierUi";
import { LOW_STOCK, getId, orderDate, orderAmount, orderQty, money, isLowStock, sortByNewest, PAGE_FRAME } from "./supplierUtils";

/** Supplier home: welcome, key numbers, what needs attention and the latest orders. Details live on Products / Orders. */
function SupplierSection() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const [productsResult, ordersResult] = await Promise.all([getSupplierProducts(token), getSupplierOrders(token)]);
    setProducts(productsResult.success ? pickList(productsResult, "products") : []);
    setOrders(ordersResult.success ? pickList(ordersResult, "orders") : []);
    const failed = [productsResult, ordersResult].find((r) => !r.success);
    if (failed) setError(failed.message);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = user?.name || user?.email?.split("@")[0] || "Supplier";
  const v = (n) => (loading ? "…" : n);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    return {
      requested: orders.filter((o) => (o.status || "requested") === "requested").length,
      processing: orders.filter((o) => o.status === "processing").length,
      revenue: completed.reduce((s, o) => s + orderAmount(o), 0),
      awaiting: products.filter((p) => !p.is_approved).length,
      lowStock: products.filter(isLowStock).length,
      hospitals: new Set([...orders.map((o) => o.hospitalName), ...products.map((p) => p.hospitalName)].filter(Boolean)).size,
    };
  }, [orders, products]);

  const recentOrders = useMemo(() => sortByNewest(orders).slice(0, 5), [orders]);

  const attention = [
    { icon: "📥", label: "New stock requests to fulfil", count: stats.requested, to: "/supplier/orders" },
    { icon: "⏳", label: "Fulfilled, waiting for hospital payment", count: stats.processing, to: "/supplier/orders" },
    { icon: "🕒", label: "Products waiting for hospital approval", count: stats.awaiting, to: "/supplier/suppproduct" },
    { icon: "⚠️", label: `Products low on stock (< ${LOW_STOCK})`, count: stats.lowStock, to: "/supplier/suppproduct" },
  ];

  return (
    <div className={PAGE_FRAME}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl shrink-0">🚚</div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-white/80">Supplier dashboard</p>
                <h1 className="text-2xl font-bold">Welcome back, {displayName}! 👋</h1>
                <p className="text-sm text-white/90 mt-1">Here is a quick look at your products and stock orders.</p>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="self-start lg:self-center flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Key numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📥" label="New Requests" value={v(stats.requested)} sub="Stock orders to fulfil" onClick={() => navigate("/supplier/orders")} />
            <StatCard icon="💰" label="Total Revenue" value={loading ? "…" : money(stats.revenue)} sub="From completed orders" onClick={() => navigate("/supplier/orders")} />
            <StatCard icon="📦" label="Products" value={v(products.length)} sub={`${stats.awaiting} awaiting approval`} onClick={() => navigate("/supplier/suppproduct")} />
            <StatCard icon="🏥" label="Hospitals" value={v(stats.hospitals)} sub="You supply to" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Needs attention */}
            <Card title="Needs attention" subtitle="Open work for you">
              <div className="space-y-2">
                {attention.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.to)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm text-gray-700"><span>{a.icon}</span>{a.label}</span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${a.count ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-700"}`}>
                      {v(a.count)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Latest orders */}
            <Card
              className="xl:col-span-2"
              title="Latest orders"
              subtitle="Most recent stock requests from hospitals"
              right={
                <button onClick={() => navigate("/supplier/orders")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                  All orders
                </button>
              }
            >
              {recentOrders.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium">Product</th>
                        <th className="py-2 pr-3 font-medium">Hospital</th>
                        <th className="py-2 pr-3 font-medium">Qty</th>
                        <th className="py-2 pr-3 font-medium">Amount</th>
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o, i) => (
                        <tr key={getId(o) || i} className="border-b border-gray-100 last:border-0">
                          <td className="py-2.5 pr-3 text-gray-800">{o.product_name}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{o.hospitalName}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{orderQty(o)}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{money(orderAmount(o))}</td>
                          <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{orderDate(o) ? orderDate(o).toLocaleDateString() : "—"}</td>
                          <td className="py-2.5"><OrderStatus status={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierSection;
