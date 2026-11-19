import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { FiRefreshCw } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { getSaFinance } from "../../services/superAdminService";
import { Card, Empty } from "../Supplier/SupplierUi";
import { money, PAGE_FRAME } from "../Supplier/supplierUtils";
import { KpiCard, PeriodTabs } from "./SuperAdminUi";
import { AXIS, GRID, CURSOR, MONEY_KINDS, fmtDate } from "./superAdminConfig";

const KIND = Object.fromEntries(MONEY_KINDS.map((k) => [k.key, k]));
const TX_FILTERS = [{ key: "all", label: "All" }, ...MONEY_KINDS];

/** Super admin finance: booking fees, pharmacy bills and supplier purchases across hospitals. */
export default function Finance() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("finance");
  const [period, setPeriod] = useState("month");
  const [hospital, setHospital] = useState("");
  const [txFilter, setTxFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSaFinance(token, { period, hospital });
    if (result.success) setData(result.data);
    else setError(result.message);
    setLoading(false);
  }, [token, period, hospital]);

  useEffect(() => {
    load();
  }, [load]);

  const c = useMemo(() => data?.cards || {}, [data]);
  const m = (n) => (loading && !data ? "…" : money(n));
  const vs = data?.period && data.period !== "all" ? `vs last ${data.period}` : "";
  const split = useMemo(() => [
    { name: "Booking · online", value: c.bookingOnline || 0, color: "#3b82f6" },
    { name: "Booking · cash", value: c.bookingCash || 0, color: "#93c5fd" },
    { name: "Pharmacy · online", value: c.pharmacyOnline || 0, color: "#16a34a" },
    { name: "Pharmacy · cash", value: c.pharmacyCash || 0, color: "#86efac" },
  ].filter((s) => s.value > 0), [c]);
  const hasTimeline = (data?.timeline || []).some((t) => t.booking || t.pharmacy || t.purchase);
  const txs = (data?.transactions || []).filter((t) => txFilter === "all" || t.kind === txFilter);

  return (
    <div className={PAGE_FRAME}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header + filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Finance</h1>
              <p className="text-sm text-gray-500">
                {data ? `${hospital || "All hospitals"} · ${fmtDate(data.range.start)} – ${fmtDate(data.range.end)}` : "Money in and out across hospitals"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <PeriodTabs value={period} onChange={setPeriod} light />
              <select value={hospital} onChange={(e) => setHospital(e.target.value)} className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white" aria-label="Hospital">
                <option value="">All hospitals</option>
                {(data?.hospitals || []).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <button onClick={load} disabled={loading} className="p-2.5 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm" title="Refresh">
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">{error}</div>}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard icon="💰" label="Income" value={m(c.income)} change={c.incomeChange ?? undefined} vs={vs} sub="Fees + pharmacy" />
            <KpiCard icon="📅" label="Booking fees" value={m(c.booking)} sub={`${money(c.bookingOnline)} online · ${money(c.bookingCash)} cash`} />
            <KpiCard icon="💊" label="Pharmacy bills" value={m(c.pharmacy)} sub={`${money(c.pharmacyOnline)} online · ${money(c.pharmacyCash)} cash`} />
            <KpiCard icon="🚚" label="Supplier purchases" value={m(c.purchases)} sub="Paid for stock" />
            <KpiCard icon="💳" label="Paid online" value={loading && !data ? "…" : `${c.income ? Math.round((c.online * 100) / c.income) : 0}%`} sub={`${money(c.cash)} cash · ${c.transactions || 0} payments`} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2" title="Money over time" subtitle={`Income (fees + pharmacy) next to supplier purchases · ${data?.periodLabel || ""}`}>
              {!hasTimeline ? <Empty text={loading ? "Loading…" : "No money movements in this period."} /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val) => money(val)} cursor={CURSOR} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="booking" name={KIND.booking.label} stackId="in" fill={KIND.booking.color} />
                    <Bar dataKey="pharmacy" name={KIND.pharmacy.label} stackId="in" fill={KIND.pharmacy.color} />
                    <Bar dataKey="purchase" name={KIND.purchase.label} fill={KIND.purchase.color} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card title="Where income comes from" subtitle={data?.periodLabel || ""}>
              {!split.length ? <Empty text={loading ? "Loading…" : "No income in this period."} /> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={split} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {split.map((s) => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                      <Tooltip formatter={(val) => money(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 text-xs">
                    {split.map((s) => (
                      <div key={s.name} className="flex justify-between">
                        <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span>
                        <span className="font-medium text-gray-800">{money(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* By hospital */}
          <Card title="By hospital" subtitle={data?.periodLabel || ""}>
            {!(data?.byHospital || []).length ? <Empty text={loading ? "Loading…" : "No hospitals."} /> : (
              <>
                {data.byHospital.some((h) => h.income || h.purchases) && (
                  <ResponsiveContainer width="100%" height={Math.max(160, data.byHospital.length * 52)}>
                    <BarChart data={data.byHospital} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                      <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="hospital" width={120} tick={AXIS} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val) => money(val)} cursor={CURSOR} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="purchases" name="Supplier purchases" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        {["Hospital", "Booking · online", "Booking · cash", "Pharmacy · online", "Pharmacy · cash", "Income", "Purchases"].map((hd) => (
                          <th key={hd} className="py-2 pr-3 font-medium whitespace-nowrap">{hd}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.byHospital.map((h) => (
                        <tr key={h.hospital} className="border-b border-gray-100 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-gray-800">{h.hospital}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{money(h.bookingOnline)}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{money(h.bookingCash)}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{money(h.pharmacyOnline)}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{money(h.pharmacyCash)}</td>
                          <td className="py-2.5 pr-3 font-semibold text-green-700">{money(h.income)}</td>
                          <td className="py-2.5 pr-3 text-orange-600">{money(h.purchases)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* Transactions */}
          <Card
            title="Payments"
            subtitle={`Latest in ${data?.periodLabel || "the period"} (up to 60)`}
            right={
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {TX_FILTERS.map((f) => (
                  <button key={f.key} onClick={() => setTxFilter(f.key)}
                    className={`px-2.5 py-1 text-xs rounded-md ${txFilter === f.key ? "bg-white shadow-sm text-blue-700 font-semibold" : "text-gray-500"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            }
          >
            {!txs.length ? <Empty text={loading ? "Loading…" : "No payments in this period."} /> : (
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      {["Date", "Hospital", "Type", "From / to", "Method", "Reference", "Amount"].map((hd) => (
                        <th key={hd} className="py-2 pr-3 font-medium">{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t, i) => (
                      <tr key={`${t.reference}-${i}`} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{fmtDate(t.date)}</td>
                        <td className="py-2 pr-3 text-gray-700">{t.hospital}</td>
                        <td className="py-2 pr-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: KIND[t.kind]?.color }}>{KIND[t.kind]?.label}</span>
                        </td>
                        <td className="py-2 pr-3 text-gray-700">{t.party || "—"}</td>
                        <td className="py-2 pr-3 text-gray-700 capitalize">{t.method}</td>
                        <td className="py-2 pr-3 text-xs text-gray-500 font-mono">{t.reference}</td>
                        <td className={`py-2 pr-3 font-semibold ${t.kind === "purchase" ? "text-orange-600" : "text-green-700"}`}>
                          {t.kind === "purchase" ? "−" : "+"}{money(t.amount)}
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
    </div>
  );
}
