// Shared helpers for the supplier pages (dashboard, products, orders).

export const LOW_STOCK = 40; // same threshold the backend uses for "Low Stock"
export const GRID = "rgba(148, 163, 184, 0.25)";
export const ORDER_COLORS = { requested: "#facc15", processing: "#60a5fa", completed: "#4ade80", cancelled: "#f87171" };
export const STATUS_STYLES = {
  requested: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export const getId = (doc) => doc?._id || doc?.id;

export const orderDate = (order) => {
  const raw = order.order_date || order.created_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

// Orders are batches (one supplier, many items). The server sends the totals:
// total_amount = delivered value once fulfilled, otherwise the ordered estimate.
export const orderQty = (o) => o.total_quantity_fulfilled || o.total_quantity_ordered || 0;
export const orderAmount = (o) => Number(o.total_amount) || 0;
export const orderTitle = (o) => {
  const items = o.items || [];
  if (!items.length) return "—";
  return items.length === 1 ? items[0].product_name : `${items[0].product_name} +${items.length - 1} more`;
};
export const STATUS_LABELS = {
  requested: "New",
  processing: "Awaiting payment",
  completed: "Paid",
  cancelled: "Cancelled",
};

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");

export const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export const isLowStock = (p) => p.is_approved && (Number(p.stock) || 0) < LOW_STOCK;

export const sortByNewest = (orders) =>
  [...orders].sort((a, b) => (orderDate(b)?.getTime() || 0) - (orderDate(a)?.getTime() || 0));

// shared class names
export const PAGE_FRAME = "flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900";
export const inputClass = "w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";
export const labelClass = "block text-xs font-medium text-gray-600 mb-1";
