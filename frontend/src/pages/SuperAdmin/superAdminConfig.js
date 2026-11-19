// Shared constants for the super admin pages.

export const PERIODS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
];

export const APPOINTMENT_STATUS = [
  { key: "pending", label: "Pending", color: "#facc15" },
  { key: "approved", label: "Approved", color: "#60a5fa" },
  { key: "completed", label: "Completed", color: "#4ade80" },
  { key: "rejected", label: "Rejected", color: "#f87171" },
  { key: "cancelled", label: "Cancelled", color: "#9ca3af" },
];

export const ORDER_STATUS = [
  { key: "requested", label: "Sent to supplier", color: "#facc15" },
  { key: "processing", label: "Ready to pay", color: "#60a5fa" },
  { key: "completed", label: "Paid", color: "#4ade80" },
  { key: "cancelled", label: "Cancelled", color: "#f87171" },
];

export const MONEY_KINDS = [
  { key: "booking", label: "Booking fees", color: "#3b82f6" },
  { key: "pharmacy", label: "Pharmacy bills", color: "#22c55e" },
  { key: "purchase", label: "Supplier purchases", color: "#f97316" },
];

export const GRID = "rgba(148, 163, 184, 0.25)";
export const AXIS = { fontSize: 11, fill: "#94a3b8" };
export const CURSOR = { fill: "rgba(37,99,235,0.08)" };

export const fmtDate = (iso) =>
  iso ? new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
