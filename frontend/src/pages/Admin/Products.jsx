import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  FiRefreshCw, FiSearch, FiShoppingCart, FiTrash2, FiChevronDown, FiChevronRight, FiX, FiCheck, FiPlus,
} from "react-icons/fi";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import {
  listProducts, listOrders, createOrder, cancelOrder, listUnapprovedProducts, approveProduct,
} from "../../services/orderService";
import { createRazorpayOrder, verifyRazorpayPayment } from "../../services/paymentService";
import { StatCard, Card, Empty, Modal, OrderStatus } from "../Supplier/SupplierUi";
import {
  LOW_STOCK, STATUS_LABELS, getId, orderAmount, orderQty, orderTitle, money, formatDate, sortByNewest,
  PAGE_FRAME, inputClass,
} from "../Supplier/supplierUtils";

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

const TABS = [
  { key: "inventory", label: "Inventory" },
  { key: "orders", label: "Purchase Orders" },
  { key: "new", label: "New Products" },
];
const ORDER_FILTERS = ["all", "requested", "processing", "completed", "cancelled"];
const DEFAULT_QTY = 50;

const stockLabel = (stock) => {
  const n = Number(stock) || 0;
  if (n <= 0) return "Out of Stock";
  return n < LOW_STOCK ? "Low Stock" : "In Stock";
};
const stockBadge = (stock) => {
  const n = Number(stock) || 0;
  if (n <= 0) return "bg-red-100 text-red-700";
  if (n < LOW_STOCK) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-700";
};
const ADMIN_STATUS_LABELS = { ...STATUS_LABELS, requested: "Sent to supplier", processing: "Ready to pay" };

/** Admin inventory & purchasing: stock, cart -> one purchase order per supplier, pay each order once. */
const Products = () => {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const [tab, setTab] = useState("inventory");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // inventory filters
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("");

  // cart: { [productId]: quantity }
  const [cart, setCart] = useState({});
  const [cartNotes, setCartNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [cartError, setCartError] = useState("");

  // orders
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSupplier, setOrderSupplier] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const fetchProducts = useCallback(async () => {
    const result = await listProducts(token, hospitalName);
    if (result.success) setProducts(pickList(result, "products"));
    else setError(result.message);
  }, [token, hospitalName]);

  const fetchOrders = useCallback(async () => {
    const result = await listOrders(token);
    if (result.success) setOrders(pickList(result, "orders"));
    else setError(result.message);
  }, [token]);

  const fetchNewProducts = useCallback(async () => {
    const result = await listUnapprovedProducts(token, hospitalName);
    if (result.success) setNewProducts(pickList(result, "products"));
    else setError(result.message);
  }, [token, hospitalName]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    if (!hospitalName) {
      setError("Hospital information is missing from your account. Please log in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    await Promise.all([fetchProducts(), fetchOrders(), fetchNewProducts()]);
    setLoading(false);
  }, [token, hospitalName, fetchProducts, fetchOrders, fetchNewProducts]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [getId(p), p])), [products]);
  const suppliers = useMemo(
    () => [...new Set([...products.map((p) => p.supplier_company), ...orders.map((o) => o.supplier_company)].filter(Boolean))].sort(),
    [products, orders]
  );

  // products already on an open order (sent or ready to pay) -> shown in the inventory table
  const onOrder = useMemo(() => {
    const map = {};
    orders.filter((o) => ["requested", "processing"].includes(o.status)).forEach((o) =>
      o.items.forEach((i) => { map[i.product_id] = (map[i.product_id] || 0) + (i.quantity_fulfilled || i.quantity_ordered); }));
    return map;
  }, [orders]);

  const stats = useMemo(() => {
    const processing = orders.filter((o) => o.status === "processing");
    return {
      low: products.filter((p) => (Number(p.stock) || 0) < LOW_STOCK).length,
      requested: orders.filter((o) => o.status === "requested").length,
      processing: processing.length,
      toPay: processing.reduce((s, o) => s + orderAmount(o), 0),
      paid: orders.filter((o) => o.status === "completed").reduce((s, o) => s + orderAmount(o), 0),
    };
  }, [products, orders]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const label = stockLabel(p.stock);
      if (stockFilter === "low" && label === "In Stock") return false;
      if (stockFilter === "ok" && label !== "In Stock") return false;
      if (supplierFilter && p.supplier_company !== supplierFilter) return false;
      if (!q) return true;
      return [p.product_name, p.product_type, p.supplier_company, p.department].some((x) => (x || "").toLowerCase().includes(q));
    }).sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
  }, [products, searchQuery, stockFilter, supplierFilter]);

  // ---------------- cart ----------------
  // low / out of stock products are topped up to ~100 strips, others get the default quantity
  const restockQty = (product) => (stockLabel(product.stock) === "In Stock" ? DEFAULT_QTY : Math.max(DEFAULT_QTY, 100 - (Number(product.stock) || 0)));
  const addToCart = (product) => setCart((c) => ({ ...c, [getId(product)]: c[getId(product)] || restockQty(product) }));
  const setCartQty = (id, qty) => setCart((c) => ({ ...c, [id]: qty }));
  const removeFromCart = (id) => setCart((c) => {
    const next = { ...c };
    delete next[id];
    return next;
  });
  // Every Low Stock and Out of Stock product goes into the cart, topped up to ~100 strips.
  const addLowStockToCart = () => {
    const low = products.filter((p) => stockLabel(p.stock) !== "In Stock");
    if (!low.length) {
      setNotice("All products are in stock.");
      return;
    }
    setCart((c) => {
      const next = { ...c };
      low.forEach((p) => { next[getId(p)] = next[getId(p)] || restockQty(p); });
      return next;
    });
    const alreadyOrdered = low.filter((p) => onOrder[getId(p)]).length;
    setNotice(`${low.length} low / out of stock product(s) added to the cart.` +
      (alreadyOrdered ? ` ${alreadyOrdered} of them already have an open order ("On order" column) — remove them if you don't need more.` : ""));
  };

  const cartGroups = useMemo(() => {
    const groups = {};
    Object.entries(cart).forEach(([id, qty]) => {
      const p = productById[id];
      if (!p) return;
      const key = p.supplier_company || "Unknown supplier";
      if (!groups[key]) groups[key] = { supplier: key, lines: [], total: 0 };
      const line = { id, product: p, qty: Number(qty) || 0, total: (Number(qty) || 0) * (Number(p.price_per_strip) || 0) };
      groups[key].lines.push(line);
      groups[key].total += line.total;
    });
    return Object.values(groups).sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [cart, productById]);
  const cartTotal = cartGroups.reduce((s, g) => s + g.total, 0);
  const cartCount = Object.keys(cart).length;

  const placeOrders = async () => {
    setCartError("");
    const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) }));
    if (!items.length) return;
    if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)) {
      setCartError("Every product needs a quantity of at least 1.");
      return;
    }
    setPlacing(true);
    const result = await createOrder(token, { items, notes: cartNotes });
    setPlacing(false);
    if (result.success) {
      setCart({});
      setCartNotes("");
      setNotice(result.data?.message || result.message || "Orders sent to suppliers.");
      setOrderFilter("all");
      setTab("orders");
      fetchOrders();
    } else {
      setCartError(result.message);
    }
  };

  // ---------------- orders ----------------
  const filteredOrders = useMemo(() => sortByNewest(orders).filter((o) =>
    (orderFilter === "all" || o.status === orderFilter) && (!orderSupplier || o.supplier_company === orderSupplier)
  ), [orders, orderFilter, orderSupplier]);

  const payOrder = async (order) => {
    const id = getId(order);
    setNotice("");
    setError("");
    setPayingId(id);
    // amount, items and supplier are taken from the stored order on the server
    const body = {
      payment_id: `PO-${id}`,
      order_id: id,
      amount: Number(orderAmount(order).toFixed(2)),
      currency: "INR",
      source: "SUPPLIER",
      category: "SUPPLIER_PURCHASE",
      purchase_order_id: id,
      hospital_name: hospitalName,
      company_name: order.supplier_company,
    };
    const created = await createRazorpayOrder(token, body);
    if (!created.success) {
      setError(`Payment could not be started: ${created.message}`);
      setPayingId(null);
      return;
    }
    if (created.data?.already_paid) {
      setNotice(created.data.message);
      setPayingId(null);
      loadAll();
      return;
    }
    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      setError("Could not load the Razorpay checkout. Check your internet connection.");
      setPayingId(null);
      return;
    }
    const { razorpay_key_id, razorpay_order } = created.data || {};
    const checkout = new window.Razorpay({
      key: razorpay_key_id,
      amount: razorpay_order?.amount,
      currency: razorpay_order?.currency || "INR",
      name: "HMS Healthcare",
      description: `${order.orderNumber} · ${order.supplier_company}`,
      order_id: razorpay_order?.id,
      handler: async (paymentResult) => {
        const verified = await verifyRazorpayPayment(token, {
          ...body,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
        });
        setPayingId(null);
        if (verified.success) {
          setNotice(verified.data?.message || "Payment successful. The order is completed.");
        } else {
          setError(`Payment verification failed: ${verified.message}`);
        }
        loadAll();
      },
      modal: { ondismiss: () => setPayingId(null) },
      prefill: { email: user?.email, name: user?.name },
      theme: { color: "#3399cc" },
    });
    checkout.open();
  };

  const confirmCancel = async () => {
    const result = await cancelOrder(token, getId(cancelTarget), "Cancelled by hospital");
    setCancelTarget(null);
    if (result.success) setNotice(result.data?.message || result.message);
    else setError(result.message);
    fetchOrders();
  };

  const handleApproveProduct = async (productId, status) => {
    const result = await approveProduct(token, productId, { status });
    if (!result.success) {
      setError(result.message);
      return;
    }
    // Approved products move to the inventory; rejected ones are deleted by the backend.
    setNewProducts((prev) => prev.filter((p) => getId(p) !== productId));
    if (status === "approved") fetchProducts();
  };

  const v = (n) => (loading ? "…" : n);

  return (
    <div className={PAGE_FRAME}>
      <Slidebar activeTab="product" />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inventory & Purchasing</h1>
              <p className="text-sm text-gray-500">Add products to the cart — one order goes to each supplier, and you pay each order once after it is delivered</p>
            </div>
            <button
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex justify-between gap-4">
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError("")}><FiX /></button>
            </div>
          )}
          {notice && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded flex justify-between gap-4">
              <p className="text-green-700">{notice}</p>
              <button onClick={() => setNotice("")}><FiX /></button>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon="📦" label="Products" value={v(products.length)} sub={`${suppliers.length} suppliers`} onClick={() => { setTab("inventory"); setStockFilter("all"); }} />
            <StatCard icon="⚠️" label="Low / Out of Stock" value={v(stats.low)} sub={`Under ${LOW_STOCK} strips`} onClick={() => { setTab("inventory"); setStockFilter("low"); }} />
            <StatCard icon="📤" label="Sent to Suppliers" value={v(stats.requested)} sub="Waiting for delivery" onClick={() => { setTab("orders"); setOrderFilter("requested"); }} />
            <StatCard icon="💳" label="Ready to Pay" value={v(stats.processing)} sub={`${money(stats.toPay)} due`} onClick={() => { setTab("orders"); setOrderFilter("processing"); }} />
            <StatCard icon="🆕" label="New Products" value={v(newProducts.length)} sub="Waiting for approval" onClick={() => setTab("new")} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((t) => {
              const badge = t.key === "orders" ? stats.processing : t.key === "new" ? newProducts.length : cartCount;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  {t.label}
                  {badge > 0 && <span className="text-xs px-1.5 rounded-full bg-blue-100 text-blue-700">{badge}</span>}
                </button>
              );
            })}
          </div>

          {/* ---------------- Inventory + cart ---------------- */}
          {tab === "inventory" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <Card
                className="xl:col-span-2"
                title="Hospital inventory"
                subtitle={`${filteredProducts.length} of ${products.length} products · lowest stock first`}
                right={
                  <button onClick={addLowStockToCart} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-800 hover:bg-yellow-100">
                    + Add all low / out of stock to cart
                  </button>
                }
              >
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search product, type, supplier or department" value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)} className={`${inputClass} pl-9`} />
                  </div>
                  <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className={`${inputClass} md:w-48`}>
                    <option value="">All suppliers</option>
                    {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className={`${inputClass} md:w-40`}>
                    <option value="all">All stock</option>
                    <option value="low">Low / out</option>
                    <option value="ok">In stock</option>
                  </select>
                </div>
                {filteredProducts.length === 0 ? (
                  <Empty text={loading ? "Loading products…" : "No products found."} />
                ) : (
                  <div className="overflow-x-auto max-h-[34rem] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="py-2 pr-3 font-medium">Product</th>
                          <th className="py-2 pr-3 font-medium">Supplier</th>
                          <th className="py-2 pr-3 font-medium">Price</th>
                          <th className="py-2 pr-3 font-medium">Stock</th>
                          <th className="py-2 pr-3 font-medium">On order</th>
                          <th className="py-2 font-medium text-right">Cart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => {
                          const id = getId(p);
                          const inCart = cart[id] !== undefined;
                          return (
                            <tr key={id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2.5 pr-3">
                                <p className="font-medium text-gray-800">{p.product_name}</p>
                                <p className="text-xs text-gray-500">{p.product_type}{p.department ? ` · ${p.department}` : ""}</p>
                              </td>
                              <td className="py-2.5 pr-3 text-gray-700">{p.supplier_company}</td>
                              <td className="py-2.5 pr-3 text-gray-700">₹{p.price_per_strip}</td>
                              <td className="py-2.5 pr-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge(p.stock)}`}>{p.stock ?? 0}</span>
                              </td>
                              <td className="py-2.5 pr-3 text-xs text-gray-500">{onOrder[id] ? `${onOrder[id]} strips` : "—"}</td>
                              <td className="py-2.5 text-right">
                                {inCart ? (
                                  <button onClick={() => removeFromCart(id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 inline-flex items-center gap-1">
                                    <FiCheck /> In cart
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => addToCart(p)}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${stockLabel(p.stock) === "In Stock" ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}`}
                                  >
                                    <FiPlus /> {stockLabel(p.stock) === "In Stock" ? "Add" : "Restock"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Cart */}
              <Card title="Order cart" subtitle={cartCount ? `${cartCount} products · ${cartGroups.length} supplier order(s)` : "Add products from the inventory"} className="xl:sticky xl:top-0">
                {cartCount === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <FiShoppingCart className="mx-auto text-3xl mb-2" />
                    <p className="text-xs">Your cart is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartGroups.map((g) => (
                      <div key={g.supplier} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-gray-800">🚚 {g.supplier}</p>
                          <p className="text-xs text-gray-500">1 order · {money(g.total)}</p>
                        </div>
                        <div className="space-y-2">
                          {g.lines.map((l) => (
                            <div key={l.id} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 truncate">{l.product.product_name}</p>
                                <p className="text-xs text-gray-400">₹{l.product.price_per_strip} × {l.qty} = {money(l.total)}</p>
                              </div>
                              <input type="number" min="1" value={cart[l.id]} onChange={(e) => setCartQty(l.id, e.target.value)}
                                className="w-20 p-1.5 border border-gray-300 rounded-lg text-sm text-center" aria-label={`Quantity of ${l.product.product_name}`} />
                              <button onClick={() => removeFromCart(l.id)} className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full" title="Remove"><FiTrash2 /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <textarea rows="2" value={cartNotes} onChange={(e) => setCartNotes(e.target.value)} className={`${inputClass} resize-none`}
                      placeholder="Note for suppliers (optional)" />
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                      <span className="text-sm text-gray-600">Estimated total</span>
                      <span className="text-lg font-bold text-blue-700">{money(cartTotal)}</span>
                    </div>
                    <p className="text-xs text-gray-400">Final amount is what the supplier delivers. You pay after delivery.</p>
                    {cartError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{cartError}</div>}
                    <div className="flex gap-2">
                      <button onClick={() => setCart({})} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">Clear</button>
                      <button onClick={placeOrders} disabled={placing}
                        className="flex-1 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 disabled:opacity-60 text-sm font-medium">
                        {placing ? "Sending..." : `Send ${cartGroups.length} order${cartGroups.length === 1 ? "" : "s"}`}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ---------------- Purchase orders ---------------- */}
          {tab === "orders" && (
            <Card
              title="Purchase orders"
              subtitle={`${filteredOrders.length} of ${orders.length} · paid so far ${money(stats.paid)} · click a row to see its products`}
              right={
                <div className="flex flex-wrap gap-2 items-center">
                  <select value={orderSupplier} onChange={(e) => setOrderSupplier(e.target.value)} className="p-1.5 border border-gray-300 rounded-lg text-xs">
                    <option value="">All suppliers</option>
                    {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="flex flex-wrap bg-gray-100 rounded-lg p-0.5">
                    {ORDER_FILTERS.map((s) => (
                      <button key={s} onClick={() => setOrderFilter(s)}
                        className={`px-2.5 py-1 text-xs rounded-md ${orderFilter === s ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}>
                        {s === "all" ? "All" : ADMIN_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              }
            >
              {filteredOrders.length === 0 ? (
                <Empty text={loading ? "Loading orders…" : "No purchase orders found."} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium">Order</th>
                        <th className="py-2 pr-3 font-medium">Supplier</th>
                        <th className="py-2 pr-3 font-medium">Products</th>
                        <th className="py-2 pr-3 font-medium">Strips</th>
                        <th className="py-2 pr-3 font-medium">Amount</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const id = getId(o);
                        const open = expanded === id;
                        return (
                          <Fragment key={id}>
                            <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(open ? null : id)}>
                              <td className="py-2.5 pr-3">
                                <p className="font-medium text-gray-800 flex items-center gap-1">{open ? <FiChevronDown /> : <FiChevronRight />}{o.orderNumber}</p>
                                <p className="text-xs text-gray-500 pl-5">{formatDate(o.order_date)}</p>
                              </td>
                              <td className="py-2.5 pr-3 text-gray-700">{o.supplier_company}</td>
                              <td className="py-2.5 pr-3 text-gray-700">
                                {orderTitle(o)}
                                <p className="text-xs text-gray-400">{o.item_count} product{o.item_count === 1 ? "" : "s"}</p>
                              </td>
                              <td className="py-2.5 pr-3 text-gray-700">{orderQty(o)}</td>
                              <td className="py-2.5 pr-3 font-medium text-gray-800">
                                {money(orderAmount(o))}
                                {o.status === "requested" && <p className="text-xs text-gray-400 font-normal">estimate</p>}
                              </td>
                              <td className="py-2.5 pr-3">
                                <OrderStatus status={o.status} />
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {o.status === "processing" && (
                                  <button onClick={() => payOrder(o)} disabled={payingId === id}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
                                    {payingId === id ? "Opening payment..." : `Pay ${money(orderAmount(o))}`}
                                  </button>
                                )}
                                {o.status === "requested" && (
                                  <button onClick={() => setCancelTarget(o)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">
                                    Cancel
                                  </button>
                                )}
                                {o.status === "completed" && <span className="text-xs text-gray-400">Paid {formatDate(o.payment?.paid_at || o.completed_at)}</span>}
                                {o.status === "cancelled" && <span className="text-xs text-gray-400">—</span>}
                              </td>
                            </tr>
                            {open && (
                              <tr className="border-b border-gray-100 bg-gray-50/60">
                                <td colSpan={7} className="px-4 py-3">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-gray-500">
                                        <th className="py-1 pr-3 font-medium">Product</th>
                                        <th className="py-1 pr-3 font-medium">Ordered</th>
                                        <th className="py-1 pr-3 font-medium">Delivered</th>
                                        <th className="py-1 pr-3 font-medium">Price / strip</th>
                                        <th className="py-1 pr-3 font-medium">Expiry</th>
                                        <th className="py-1 font-medium text-right">Line total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {o.items.map((i) => (
                                        <tr key={i.product_id}>
                                          <td className="py-1 pr-3 text-gray-800">{i.product_name}</td>
                                          <td className="py-1 pr-3">{i.quantity_ordered}</td>
                                          <td className="py-1 pr-3">{["processing", "completed"].includes(o.status) ? i.quantity_fulfilled : "—"}</td>
                                          <td className="py-1 pr-3">₹{i.price_per_strip}</td>
                                          <td className="py-1 pr-3">{i.expiry_date ? formatDate(i.expiry_date) : "—"}</td>
                                          <td className="py-1 text-right">{money((o.status === "requested" || o.status === "cancelled" ? i.quantity_ordered : i.quantity_fulfilled) * i.price_per_strip)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-500">
                                    {o.notes && <span>Your note: {o.notes}</span>}
                                    {o.fulfillment_notes && <span>Supplier note: {o.fulfillment_notes}</span>}
                                    {o.cancel_reason && <span>Reason: {o.cancel_reason}</span>}
                                    {o.payment?.payment_id && <span>Payment: {o.payment.payment_id} ({o.payment.method || "online"}) · stock added</span>}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ---------------- New products ---------------- */}
          {tab === "new" && (
            <Card title="New products from suppliers" subtitle="Approve to add them to your inventory; rejected products are removed">
              {newProducts.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No products waiting for approval."} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium">Product</th>
                        <th className="py-2 pr-3 font-medium">Supplier</th>
                        <th className="py-2 pr-3 font-medium">Department</th>
                        <th className="py-2 pr-3 font-medium">Price / strip</th>
                        <th className="py-2 pr-3 font-medium">Stock</th>
                        <th className="py-2 font-medium text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProducts.map((p) => (
                        <tr key={getId(p)} className="border-b border-gray-100 last:border-0">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium text-gray-800">{p.product_name}</p>
                            <p className="text-xs text-gray-500">{p.product_type}{p.description ? ` · ${p.description}` : ""}</p>
                          </td>
                          <td className="py-2.5 pr-3 text-gray-700">{p.supplier_company}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{p.department || "General"}</td>
                          <td className="py-2.5 pr-3 text-gray-700">₹{p.price_per_strip}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{p.stock}</td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <span className="inline-flex gap-2">
                              <button onClick={() => handleApproveProduct(getId(p), "approved")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">Approve</button>
                              <button onClick={() => handleApproveProduct(getId(p), "rejected")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {cancelTarget && (
        <Modal
          title={`Cancel ${cancelTarget.orderNumber}?`}
          subtitle={`${cancelTarget.supplier_company} · ${orderTitle(cancelTarget)}`}
          onClose={() => setCancelTarget(null)}
          size="max-w-md"
          footer={
            <>
              <button onClick={() => setCancelTarget(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Keep order</button>
              <button onClick={confirmCancel} className="px-5 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">Cancel order</button>
            </>
          }
        >
          <p className="text-sm text-gray-600">The supplier has not delivered this order yet. It will be cancelled and the supplier is notified.</p>
        </Modal>
      )}
    </div>
  );
};

export default Products;
