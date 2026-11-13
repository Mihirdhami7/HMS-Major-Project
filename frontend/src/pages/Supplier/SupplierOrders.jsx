import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { FiRefreshCw, FiSearch, FiTruck } from "react-icons/fi";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { getSupplierOrders, fulfillOrder } from "../../services/orderService";
import { StatCard, Card, Empty, Modal, OrderStatus } from "./SupplierUi";
import {
  GRID, ORDER_COLORS, getId, orderDate, orderQty, orderAmount, money, capitalize, formatDate, sortByNewest,
  PAGE_FRAME, inputClass, labelClass,
} from "./supplierUtils";

const RANGES = [
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "year", label: "12 months" },
  { key: "all", label: "All time" },
];
const STATUS_FILTERS = ["all", "requested", "processing", "completed"];

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;

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

const EMPTY_FULFILLMENT = { quantity: "", expiryDate: "", notes: "", price_per_strip: "", total_price: 0 };

/** Supplier orders: stock requests from hospitals, fulfilment and order analytics. */
const SupplierOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState("year");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestFulfillment, setRequestFulfillment] = useState(EMPTY_FULFILLMENT);
  const [fulfillLoading, setFulfillLoading] = useState(false);

  // Stock requests (orders) addressed to this supplier's company
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

  const openFulfill = (request) => {
    setSelectedRequest(request);
    // Pre-populate with requested quantity
    setRequestFulfillment({
      quantity: request.quantity_ordered,
      expiryDate: "",
      notes: "",
      price_per_strip: request.price_per_strip,
      total_price: request.quantity_ordered * request.price_per_strip,
    });
  };

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

    setFulfillLoading(true);
    const result = await fulfillOrder(token, orderId, {
      hospitalName: selectedRequest.hospitalName,
      quantity_fulfilled: quantity,
      price_per_strip: price,
      expiry_date: requestFulfillment.expiryDate,
      fulfillment_notes: requestFulfillment.notes,
    });
    setFulfillLoading(false);

    if (result.success) {
      alert(result.message || "Request fulfilled successfully");
      setSelectedRequest(null);
      fetchOrders();
    } else {
      alert("Failed to fulfill request: " + result.message);
    }
  };

  const stats = useMemo(() => {
    const by = (s) => orders.filter((o) => (o.status || "requested") === s);
    const completed = by("completed");
    return {
      requested: by("requested").length,
      processing: by("processing"),
      completed: completed.length,
      revenue: completed.reduce((s, o) => s + orderAmount(o), 0),
      awaitingPayment: by("processing").reduce((s, o) => s + orderAmount(o), 0),
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
    return Object.entries(counts).map(([s, value]) => ({ name: capitalize(s), value, color: ORDER_COLORS[s] || "#9ca3af" }));
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
    orders.forEach((o) => {
      const name = o.product_name || "Unknown";
      map[name] = (map[name] || 0) + orderQty(o);
    });
    return Object.entries(map).map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 6);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortByNewest(orders).filter((o) => {
      if (statusFilter !== "all" && (o.status || "requested") !== statusFilter) return false;
      if (!query) return true;
      return [o.product_name, o.hospitalName].some((x) => (x || "").toLowerCase().includes(query));
    });
  }, [orders, statusFilter, searchQuery]);

  const v = (n) => (loading ? "…" : n);
  const fulfilPrice = parseFloat(requestFulfillment.price_per_strip) || parseFloat(selectedRequest?.price_per_strip) || 0;
  const fulfilTotal = (Number(requestFulfillment.quantity) || 0) * fulfilPrice;

  return (
    <div className={PAGE_FRAME}>
      <Slidebar activeTab="orders" />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Stock Orders</h1>
              <p className="text-sm text-gray-500">Stock requests from hospitals, fulfilment and payments</p>
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
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Order summary (click to filter) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📥" label="New Requests" value={v(stats.requested)} sub="Waiting for you to fulfil" onClick={() => setStatusFilter("requested")} active={statusFilter === "requested"} />
            <StatCard icon="⏳" label="Processing" value={v(stats.processing.length)} sub={`${money(stats.awaitingPayment)} awaiting payment`} onClick={() => setStatusFilter("processing")} active={statusFilter === "processing"} />
            <StatCard icon="✅" label="Completed" value={v(stats.completed)} sub="Paid by hospitals" onClick={() => setStatusFilter("completed")} active={statusFilter === "completed"} />
            <StatCard icon="💰" label="Total Revenue" value={loading ? "…" : money(stats.revenue)} sub={`${orders.length} orders in total`} onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
          </div>

          {/* Orders table */}
          <Card
            title="Stock requests"
            subtitle={`${filteredOrders.length} of ${orders.length} shown · newest first`}
            right={
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === s ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}
                  >
                    {s === "all" ? "All" : capitalize(s)}
                  </button>
                ))}
              </div>
            }
          >
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product or hospital"
                className={`${inputClass} pl-9`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredOrders.length === 0 ? (
              <Empty text={loading ? "Loading orders…" : "No stock requests found."} />
            ) : (
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3 font-medium">Product</th>
                      <th className="py-2 pr-3 font-medium">Hospital</th>
                      <th className="py-2 pr-3 font-medium">Quantity</th>
                      <th className="py-2 pr-3 font-medium">Price / strip</th>
                      <th className="py-2 pr-3 font-medium">Amount</th>
                      <th className="py-2 pr-3 font-medium">Requested</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o, index) => (
                      <tr key={getId(o) || index} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-gray-800">{o.product_name}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{o.hospitalName}</td>
                        <td className="py-2.5 pr-3 text-gray-700">
                          {o.quantity_fulfilled && o.quantity_fulfilled !== o.quantity_ordered
                            ? `${o.quantity_fulfilled} / ${o.quantity_ordered}`
                            : o.quantity_ordered}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-700">₹{o.price_per_strip}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{money(orderAmount(o))}</td>
                        <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{formatDate(o.order_date || o.created_at)}</td>
                        <td className="py-2.5 pr-3"><OrderStatus status={o.status} /></td>
                        <td className="py-2.5 text-right">
                          {(o.status || "requested") === "requested" ? (
                            <button
                              onClick={() => openFulfill(o)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 inline-flex items-center gap-1"
                            >
                              <FiTruck /> Fulfil
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">{o.status === "processing" ? "Awaiting payment" : "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Analytics */}
          <Card
            title="Orders & revenue"
            subtitle={`${timeline.inRange} orders in range · revenue from completed orders`}
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
            <Card title="Order status" subtitle="All stock orders">
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

            <Card title="Revenue by hospital" subtitle="Completed orders">
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

      {/* Fulfil stock request */}
      {selectedRequest && (
        <Modal
          title="Fulfil Stock Request"
          subtitle={`${selectedRequest.product_name} for ${selectedRequest.hospitalName}`}
          onClose={() => setSelectedRequest(null)}
          size="max-w-3xl"
          footer={
            <>
              <button onClick={() => setSelectedRequest(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleFulfillRequest}
                disabled={fulfillLoading}
                className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
              >
                {fulfillLoading ? <><FiRefreshCw className="animate-spin" /> Processing...</> : <><FiTruck /> Fulfil Request</>}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
                <p className="font-semibold text-gray-800 mb-1">Request</p>
                {[
                  ["Hospital", selectedRequest.hospitalName],
                  ["Product", selectedRequest.product_name],
                  ["Type", selectedRequest.product_type || "N/A"],
                  ["Requested quantity", `${selectedRequest.quantity_ordered} strips`],
                  ["Price per strip", `₹${selectedRequest.price_per_strip}`],
                  ["Request date", formatDate(selectedRequest.order_date || selectedRequest.created_at)],
                ].map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 text-right">{val}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-sm space-y-1.5">
                <p className="font-semibold text-gray-800 mb-1">Bill preview</p>
                <div className="flex justify-between"><span className="text-gray-600">Quantity</span><span>{requestFulfillment.quantity || 0} strips</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Price per strip</span><span>₹{fulfilPrice}</span></div>
                <div className="flex justify-between border-t border-dashed border-blue-200 pt-2 mt-2">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="text-lg font-bold text-blue-700">₹{fulfilTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="fulfillQuantity" className={labelClass}>Quantity to Fulfil <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  id="fulfillQuantity"
                  value={requestFulfillment.quantity}
                  onChange={(e) => {
                    const quantity = e.target.value;
                    const price = requestFulfillment.price_per_strip || selectedRequest.price_per_strip;
                    setRequestFulfillment({ ...requestFulfillment, quantity, total_price: quantity * price });
                  }}
                  className={inputClass}
                  min="1"
                />
                {requestFulfillment.quantity && parseInt(requestFulfillment.quantity, 10) < parseInt(selectedRequest.quantity_ordered, 10) && (
                  <p className="text-xs text-yellow-600 mt-1">You are fulfilling less than the requested quantity.</p>
                )}
              </div>
              <div>
                <label htmlFor="pricePerStrip" className={labelClass}>Price Per Strip (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  id="pricePerStrip"
                  value={requestFulfillment.price_per_strip}
                  onChange={(e) => {
                    const price = e.target.value;
                    const quantity = requestFulfillment.quantity || 0;
                    setRequestFulfillment({ ...requestFulfillment, price_per_strip: price, total_price: quantity * price });
                  }}
                  className={inputClass}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="fulfillExpiryDate" className={labelClass}>Expiry Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  id="fulfillExpiryDate"
                  value={requestFulfillment.expiryDate}
                  onChange={(e) => setRequestFulfillment({ ...requestFulfillment, expiryDate: e.target.value })}
                  className={inputClass}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label htmlFor="fulfillNotes" className={labelClass}>Notes (optional)</label>
                <textarea
                  id="fulfillNotes"
                  value={requestFulfillment.notes}
                  onChange={(e) => setRequestFulfillment({ ...requestFulfillment, notes: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows="3"
                  placeholder="Any additional information..."
                />
              </div>
              <p className="text-xs text-gray-500">The hospital will be notified and can then pay for this order.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupplierOrders;
