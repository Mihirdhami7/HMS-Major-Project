import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { FiRefreshCw, FiSearch, FiTruck, FiChevronDown, FiChevronRight, FiX } from "react-icons/fi";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierOrders, fulfillOrder, cancelOrder } from "../../services/orderService";
import { StatCard, Card, Empty, Modal, OrderStatus } from "./SupplierUi";
import {
  GRID, ORDER_COLORS, STATUS_LABELS, getId, orderDate, orderQty, orderAmount, orderTitle, money, capitalize,
  formatDate, sortByNewest, PAGE_FRAME, inputClass, labelClass,
} from "./supplierUtils";

const RANGES = [
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "year", label: "12 months" },
  { key: "all", label: "All time" },
];
const STATUS_FILTERS = ["all", "requested", "processing", "completed", "cancelled"];

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;
const todayISO = () => new Date().toISOString().split("T")[0];

/** Chart buckets: days for week/month, months for year/all. */
const buildBuckets = (range, orders) => {
  const now = new Date();
  if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
      return { key: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, orders: 0, revenue: 0 };
    });
  }
  let start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  if (range === "all") {
    const earliest = orders.map(orderDate).filter(Boolean).sort((a, b) => a - b)[0];
    if (earliest && earliest < start) start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  }
  const out = [];
  for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    out.push({ key: monthKey(d), label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), orders: 0, revenue: 0 });
  }
  return out;
};

/** Supplier orders: purchase orders from hospitals (one order = many items), fulfilment and analytics. */
const SupplierOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState("year");
  const [expanded, setExpanded] = useState(null);

  // fulfil dialog
  const [fulfilOrder, setFulfilOrder] = useState(null);
  const [lines, setLines] = useState([]);
  const [fulfilNotes, setFulfilNotes] = useState("");
  const [fulfilError, setFulfilError] = useState("");
  const [saving, setSaving] = useState(false);

  // decline dialog
  const [declineOrder, setDeclineOrder] = useState(null);
  const [declineReason, setDeclineReason] = useState("");

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSupplierOrders(token);
    if (result.success) setOrders(pickList(result, "orders"));
    else setError(result.message);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openFulfil = (order) => {
    setFulfilOrder(order);
    setFulfilNotes("");
    setFulfilError("");
    // start with "send everything at the hospital's price"
    setLines(order.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_type: i.product_type,
      quantity_ordered: i.quantity_ordered,
      quantity_fulfilled: String(i.quantity_ordered),
      price_per_strip: String(i.price_per_strip),
      expiry_date: "",
    })));
  };

  const setLine = (index, field, value) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));

  const fulfilTotal = lines.reduce((s, l) => s + (Number(l.quantity_fulfilled) || 0) * (Number(l.price_per_strip) || 0), 0);
  const fulfilStrips = lines.reduce((s, l) => s + (Number(l.quantity_fulfilled) || 0), 0);

  const submitFulfil = async () => {
    setFulfilError("");
    for (const l of lines) {
      const qty = Number(l.quantity_fulfilled);
      if (!Number.isInteger(qty) || qty < 0 || qty > l.quantity_ordered) {
        setFulfilError(`${l.product_name}: send between 0 and ${l.quantity_ordered} strips.`);
        return;
      }
      if (qty > 0 && (!(Number(l.price_per_strip) > 0) || !l.expiry_date)) {
        setFulfilError(`${l.product_name}: price and expiry date are required.`);
        return;
      }
    }
    if (fulfilStrips <= 0) {
      setFulfilError("Send at least one product, or decline the order.");
      return;
    }
    setSaving(true);
    const result = await fulfillOrder(token, getId(fulfilOrder), {
      notes: fulfilNotes,
      items: lines.map((l) => ({
        product_id: l.product_id,
        quantity_fulfilled: Number(l.quantity_fulfilled),
        price_per_strip: Number(l.price_per_strip),
        expiry_date: l.expiry_date || null,
      })),
    });
    setSaving(false);
    if (result.success) {
      setFulfilOrder(null);
      setNotice(result.message || "Order fulfilled.");
      fetchOrders();
    } else {
      setFulfilError(result.message);
    }
  };

  const submitDecline = async () => {
    setSaving(true);
    const result = await cancelOrder(token, getId(declineOrder), declineReason);
    setSaving(false);
    if (result.success) {
      setDeclineOrder(null);
      setDeclineReason("");
      setNotice(result.message || "Order declined.");
      fetchOrders();
    } else {
      setError(result.message);
      setDeclineOrder(null);
    }
  };

  const stats = useMemo(() => {
    const by = (s) => orders.filter((o) => (o.status || "requested") === s);
    const completed = by("completed");
    const processing = by("processing");
    return {
      requested: by("requested").length,
      processing: processing.length,
      completed: completed.length,
      revenue: completed.reduce((s, o) => s + orderAmount(o), 0),
      awaitingPayment: processing.reduce((s, o) => s + orderAmount(o), 0),
    };
  }, [orders]);

  const timeline = useMemo(() => {
    const buckets = buildBuckets(range, orders);
    const daily = range === "week" || range === "month";
    const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    orders.forEach((o) => {
      const d = orderDate(o);
      if (!d) return;
      const i = index[daily ? dayKey(d) : monthKey(d)];
      if (i === undefined) return;
      buckets[i].orders += 1;
      if (o.status === "completed") buckets[i].revenue += orderAmount(o);
    });
    return {
      buckets: buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue) })),
      inRange: buckets.reduce((s, b) => s + b.orders, 0),
    };
  }, [orders, range]);

  const statusPie = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const s = o.status || "requested";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([s, value]) => ({ name: STATUS_LABELS[s] || capitalize(s), value, color: ORDER_COLORS[s] || "#9ca3af" }));
  }, [orders]);

  const byHospital = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.hospitalName || "Unknown";
      if (!map[name]) map[name] = { name, orders: 0, revenue: 0 };
      map[name].orders += 1;
      if (o.status === "completed") map[name].revenue += orderAmount(o);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders).slice(0, 6)
      .map((h) => ({ ...h, revenue: Math.round(h.revenue) }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = {};
    orders.filter((o) => o.status !== "cancelled").forEach((o) => (o.items || []).forEach((i) => {
      const name = i.product_name || "Unknown";
      map[name] = (map[name] || 0) + (i.quantity_fulfilled || i.quantity_ordered || 0);
    }));
    return Object.entries(map).map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 6);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortByNewest(orders).filter((o) => {
      if (statusFilter !== "all" && (o.status || "requested") !== statusFilter) return false;
      if (!query) return true;
      return [o.orderNumber, o.hospitalName, ...(o.items || []).map((i) => i.product_name)]
        .some((x) => (x || "").toLowerCase().includes(query));
    });
  }, [orders, statusFilter, searchQuery]);

  const v = (n) => (loading ? "…" : n);

  return (
    <div className={PAGE_FRAME}>
      <Slidebar activeTab="orders" />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Stock Orders</h1>
              <p className="text-sm text-gray-500">Each hospital order holds all products it needs from you — fulfil the whole order, the hospital pays it in one payment</p>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex justify-between">
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError("")}><FiX /></button>
            </div>
          )}
          {notice && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded flex justify-between">
              <p className="text-green-700">{notice}</p>
              <button onClick={() => setNotice("")}><FiX /></button>
            </div>
          )}

          {/* Order summary (click to filter) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📥" label="New Orders" value={v(stats.requested)} sub="Waiting for you to fulfil" onClick={() => setStatusFilter("requested")} active={statusFilter === "requested"} />
            <StatCard icon="⏳" label="Awaiting Payment" value={v(stats.processing)} sub={`${money(stats.awaitingPayment)} to receive`} onClick={() => setStatusFilter("processing")} active={statusFilter === "processing"} />
            <StatCard icon="✅" label="Paid" value={v(stats.completed)} sub="Completed orders" onClick={() => setStatusFilter("completed")} active={statusFilter === "completed"} />
            <StatCard icon="💰" label="Total Revenue" value={loading ? "…" : money(stats.revenue)} sub={`${orders.length} orders in total`} onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
          </div>

          {/* Orders */}
          <Card
            title="Orders"
            subtitle={`${filteredOrders.length} of ${orders.length} shown · newest first · click a row to see its products`}
            right={
              <div className="flex flex-wrap bg-gray-100 rounded-lg p-0.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === s ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}
                  >
                    {s === "all" ? "All" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            }
          >
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, hospital or product"
                className={`${inputClass} pl-9`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredOrders.length === 0 ? (
              <Empty text={loading ? "Loading orders…" : "No orders found."} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3 font-medium">Order</th>
                      <th className="py-2 pr-3 font-medium">Hospital</th>
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
                              <p className="font-medium text-gray-800 flex items-center gap-1">
                                {open ? <FiChevronDown /> : <FiChevronRight />}{o.orderNumber}
                              </p>
                              <p className="text-xs text-gray-500 pl-5">{formatDate(o.order_date)}</p>
                            </td>
                            <td className="py-2.5 pr-3 text-gray-700">{o.hospitalName}</td>
                            <td className="py-2.5 pr-3 text-gray-700">
                              {orderTitle(o)}
                              <p className="text-xs text-gray-400">{o.item_count} product{o.item_count === 1 ? "" : "s"}</p>
                            </td>
                            <td className="py-2.5 pr-3 text-gray-700">{orderQty(o)}</td>
                            <td className="py-2.5 pr-3 text-gray-800 font-medium">{money(orderAmount(o))}</td>
                            <td className="py-2.5 pr-3"><OrderStatus status={o.status} /></td>
                            <td className="py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {(o.status || "requested") === "requested" ? (
                                <span className="inline-flex gap-2">
                                  <button
                                    onClick={() => openFulfil(o)}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 inline-flex items-center gap-1"
                                  >
                                    <FiTruck /> Fulfil
                                  </button>
                                  <button
                                    onClick={() => setDeclineOrder(o)}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                                  >
                                    Decline
                                  </button>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {o.status === "processing" ? "Hospital will pay" : o.status === "completed" ? `Paid ${formatDate(o.payment?.paid_at || o.completed_at)}` : "—"}
                                </span>
                              )}
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
                                      <th className="py-1 pr-3 font-medium">Sent</th>
                                      <th className="py-1 pr-3 font-medium">Price / strip</th>
                                      <th className="py-1 pr-3 font-medium">Expiry</th>
                                      <th className="py-1 font-medium text-right">Line total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {o.items.map((i) => (
                                      <tr key={i.product_id}>
                                        <td className="py-1 pr-3 text-gray-800">{i.product_name} <span className="text-gray-400">{i.product_type}</span></td>
                                        <td className="py-1 pr-3">{i.quantity_ordered}</td>
                                        <td className="py-1 pr-3">{o.status === "requested" || o.status === "cancelled" ? "—" : i.quantity_fulfilled}</td>
                                        <td className="py-1 pr-3">₹{i.price_per_strip}</td>
                                        <td className="py-1 pr-3">{i.expiry_date ? formatDate(i.expiry_date) : "—"}</td>
                                        <td className="py-1 text-right">{money((o.status === "requested" ? i.quantity_ordered : i.quantity_fulfilled) * i.price_per_strip)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-500">
                                  {o.notes && <span>Hospital note: {o.notes}</span>}
                                  {o.fulfillment_notes && <span>Your note: {o.fulfillment_notes}</span>}
                                  {o.cancel_reason && <span>Reason: {o.cancel_reason}</span>}
                                  {o.payment?.payment_id && <span>Payment: {o.payment.payment_id} ({o.payment.method || "online"})</span>}
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

          {/* Analytics */}
          <Card
            title="Orders & revenue"
            subtitle={`${timeline.inRange} orders in range · revenue from paid orders`}
            right={
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`px-2.5 py-1 text-xs rounded-md ${range === r.key ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          >
            {timeline.inRange === 0 ? (
              <Empty text={loading ? "Loading…" : "No orders in this period."} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timeline.buckets} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} formatter={(val, name) => (name === "Revenue" ? money(val) : val)} />
                  <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#4ade80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card title="Order status" subtitle="All orders">
              {statusPie.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {statusPie.map((s) => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
                    {statusPie.map((s) => (
                      <span key={s.name} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name} ({s.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card title="Revenue by hospital" subtitle="Paid orders">
              {byHospital.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={byHospital} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} formatter={(val, name) => (name === "Revenue" ? money(val) : val)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Most ordered products" subtitle="Strips ordered by hospitals">
              {topProducts.length === 0 ? (
                <Empty text={loading ? "Loading…" : "No orders yet."} />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Bar dataKey="units" name="Strips" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Fulfil the whole order */}
      {fulfilOrder && (
        <Modal
          title={`Fulfil ${fulfilOrder.orderNumber}`}
          subtitle={`${fulfilOrder.hospitalName} · ${fulfilOrder.item_count} product${fulfilOrder.item_count === 1 ? "" : "s"} · ordered ${formatDate(fulfilOrder.order_date)}`}
          onClose={() => setFulfilOrder(null)}
          size="max-w-4xl"
          footer={
            <>
              <button onClick={() => setFulfilOrder(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submitFulfil}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? <><FiRefreshCw className="animate-spin" /> Sending...</> : <><FiTruck /> Send order · {money(fulfilTotal)}</>}
              </button>
            </>
          }
        >
          <p className="text-xs text-gray-500 mb-3">
            Enter what you are sending for every product. Put 0 for a product you cannot supply. The hospital pays the total once.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Ordered</th>
                  <th className="py-2 pr-3 font-medium w-28">Send</th>
                  <th className="py-2 pr-3 font-medium w-32">Price / strip (₹)</th>
                  <th className="py-2 pr-3 font-medium w-40">Expiry date</th>
                  <th className="py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const qty = Number(l.quantity_fulfilled) || 0;
                  return (
                    <tr key={l.product_id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-medium text-gray-800">{l.product_name}</p>
                        <p className="text-xs text-gray-500">{l.product_type}</p>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{l.quantity_ordered}</td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" max={l.quantity_ordered} value={l.quantity_fulfilled}
                          onChange={(e) => setLine(idx, "quantity_fulfilled", e.target.value)} className={inputClass} />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="0.01" value={l.price_per_strip} disabled={qty === 0}
                          onChange={(e) => setLine(idx, "price_per_strip", e.target.value)} className={inputClass} />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="date" min={todayISO()} value={l.expiry_date} disabled={qty === 0}
                          onChange={(e) => setLine(idx, "expiry_date", e.target.value)} className={inputClass} />
                      </td>
                      <td className="py-2 text-right text-gray-800">{money(qty * (Number(l.price_per_strip) || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-3 text-gray-500 text-xs">{fulfilStrips} strips</td>
                  <td colSpan={4} className="pt-3 text-right">
                    <span className="text-gray-600 mr-2">Hospital pays</span>
                    <span className="text-lg font-bold text-blue-700">₹{fulfilTotal.toFixed(2)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {fulfilOrder.notes && <p className="text-xs text-gray-500 mt-3">Hospital note: {fulfilOrder.notes}</p>}
          <div className="mt-4">
            <label className={labelClass} htmlFor="fulfilNotes">Note for the hospital (optional)</label>
            <textarea id="fulfilNotes" rows="2" value={fulfilNotes} onChange={(e) => setFulfilNotes(e.target.value)}
              className={`${inputClass} resize-none`} placeholder="e.g. Batch numbers, delivery date" />
          </div>
          {fulfilError && <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{fulfilError}</div>}
        </Modal>
      )}

      {/* Decline */}
      {declineOrder && (
        <Modal
          title={`Decline ${declineOrder.orderNumber}?`}
          subtitle={`${declineOrder.hospitalName} · ${orderTitle(declineOrder)}`}
          onClose={() => setDeclineOrder(null)}
          size="max-w-md"
          footer={
            <>
              <button onClick={() => setDeclineOrder(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Keep order
              </button>
              <button onClick={submitDecline} disabled={saving} className="px-5 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
                {saving ? "Declining..." : "Decline order"}
              </button>
            </>
          }
        >
          <label className={labelClass} htmlFor="declineReason">Reason (shown to the hospital)</label>
          <textarea id="declineReason" rows="3" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
            className={`${inputClass} resize-none`} placeholder="e.g. Out of stock until next month" />
        </Modal>
      )}
    </div>
  );
};

export default SupplierOrders;
