import { useCallback, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FiRefreshCw, FiPlus, FiX, FiMail } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
  getSaSuppliers, createSaSupplier, updateSaSupplier, deleteSaSupplier, resendSupplierInvite,
} from "../../services/superAdminService";
import { Card, Empty, Modal } from "../Supplier/SupplierUi";
import { money, PAGE_FRAME, inputClass, labelClass } from "../Supplier/supplierUtils";
import { KpiCard, PeriodTabs, InviteLinkBox, AccountStatus } from "./SuperAdminUi";
import { AXIS, GRID, CURSOR, ORDER_STATUS, fmtDate } from "./superAdminConfig";

const emptySupplier = { companyName: "", name: "", email: "", contactNo: "", companyStartingDate: "", companyLicense: null };
const MAX_LICENSE_MB = 5;
const ORDER_LABEL = Object.fromEntries(ORDER_STATUS.map((s) => [s.key, s.label]));
const ORDER_STYLE = {
  requested: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

/** Super admin: supplier companies, their accounts, products, purchase orders and payments. */
export default function Suppliers() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [period, setPeriod] = useState("year");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSaSuppliers(token, period);
    if (result.success) setData(result.data);
    else setError(result.message);
    setLoading(false);
  }, [token, period]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, onSuccess) => {
    setSaving(true);
    setFormError("");
    const result = await fn();
    setSaving(false);
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    onSuccess?.(result.data || {});
    load();
  };

  const saveSupplier = () => {
    if (!form.companyName.trim() || !form.name.trim() || !form.email.trim() || !form.contactNo.trim()
      || !form.companyStartingDate || !form.companyLicense) {
      setFormError("Company name, contact person, email, contact number, company starting date and company license are required.");
      return;
    }
    if (!/\.pdf$/i.test(form.companyLicense.name) && form.companyLicense.type !== "application/pdf") {
      setFormError("Company license must be a PDF file.");
      return;
    }
    if (form.companyLicense.size > MAX_LICENSE_MB * 1024 * 1024) {
      setFormError(`Company license must be ${MAX_LICENSE_MB} MB or smaller.`);
      return;
    }
    if (!/^\d{10}$/.test(form.contactNo.trim())) {
      setFormError("Contact number must be exactly 10 digits.");
      return;
    }
    const payload = new FormData();
    ["companyName", "name", "email", "contactNo", "companyStartingDate"].forEach((k) => payload.append(k, String(form[k]).trim()));
    payload.append("companyLicense", form.companyLicense);
    run(() => createSaSupplier(token, payload), (d) => {
      setForm(null);
      setNotice({ text: d.message, invite: { link: d.inviteLink, emailSent: d.emailSent, email: form.email } });
    });
  };

  const resend = (acc) => run(() => resendSupplierInvite(token, acc.id), (d) =>
    setNotice({ text: d.message, invite: { link: d.inviteLink, emailSent: d.emailSent, email: acc.email } }));

  const toggle = (row) => setConfirm({
    title: row.account.active ? `Deactivate ${row.company}?` : `Activate ${row.company}?`,
    text: row.account.active
      ? "The supplier is logged out and cannot log in. Products and order history stay."
      : "The supplier can log in again.",
    danger: row.account.active,
    action: () => run(() => updateSaSupplier(token, row.account.id, { active: !row.account.active }), () => {
      setConfirm(null);
      setNotice({ text: `${row.company} ${row.account.active ? "deactivated" : "activated"}.` });
    }),
  });

  const remove = (row) => setConfirm({
    title: `Remove ${row.company}?`,
    text: "This supplier has no products or orders, so the account is deleted.",
    danger: true,
    action: () => run(() => deleteSaSupplier(token, row.account.id), (d) => {
      setConfirm(null);
      setNotice({ text: d.message });
    }),
  });

  const cards = data?.cards || {};
  const rows = data?.suppliers || [];
  const v = (n) => (loading && !data ? "…" : (n ?? 0).toLocaleString("en-IN"));
  const hasTimeline = (data?.timeline || []).some((t) => ORDER_STATUS.some((s) => t[s.key]));

  return (
    <div className={PAGE_FRAME}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
              <p className="text-sm text-gray-500">Supplier companies, their products and the stock orders hospitals place with them</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <PeriodTabs value={period} onChange={setPeriod} light />
              <button onClick={load} disabled={loading} className="p-2.5 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm" title="Refresh">
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => { setFormError(""); setForm({ ...emptySupplier }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 shadow-sm">
                <FiPlus /> Add supplier
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">{error}</div>}
          {notice && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex justify-between gap-4">
                <p className="text-green-700 font-medium">{notice.text}</p>
                <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
              </div>
              {notice.invite && <InviteLinkBox {...notice.invite} />}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard icon="🚚" label="Suppliers" value={v(cards.suppliers)} sub={`${v(cards.withAccount)} with a login account`} />
            <KpiCard icon="📦" label="Products" value={v(cards.products)} sub="Offered to hospitals" />
            <KpiCard icon="📥" label="Open orders" value={v(cards.openOrders)} sub="Sent or waiting for payment" />
            <KpiCard icon="⏳" label="Awaiting payment" value={loading && !data ? "…" : money(cards.awaitingPayment)} sub="Delivered, not paid yet" />
            <KpiCard icon="💰" label="Paid to suppliers" value={loading && !data ? "…" : money(cards.paid)} sub="All time" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2" title="Purchase orders over time" subtitle={`By status · ${data?.periodLabel || ""}`}>
              {!hasTimeline ? <Empty text={loading ? "Loading…" : "No orders in this period."} /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={CURSOR} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {ORDER_STATUS.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="o" fill={s.color} />)}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card title="Orders by hospital" subtitle={data?.periodLabel || ""}>
              {!(data?.byHospital || []).length ? <Empty text={loading ? "Loading…" : "No orders in this period."} /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.byHospital} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="hospital" width={110} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={CURSOR} />
                    <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card title="Paid and open value by supplier" subtitle="All time">
            {!rows.some((r) => r.paid || r.openValue) ? <Empty text={loading ? "Loading…" : "No orders yet."} /> : (
              <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 56)}>
                <BarChart data={rows} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="company" width={130} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => money(val)} cursor={CURSOR} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="paid" name="Paid" stackId="v" fill="#22c55e" />
                  <Bar dataKey="openValue" name="Open (not paid yet)" stackId="v" fill="#facc15" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Supplier list */}
          <Card title="All suppliers" subtitle="Companies with a login account, and companies that only appear on products">
            {!rows.length ? <Empty text={loading ? "Loading…" : "No suppliers yet."} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      {["Company", "Account", "Products", "Hospitals", "Orders", "Paid", "Open", "Last order", ""].map((hd) => (
                        <th key={hd} className="py-2 pr-3 font-medium whitespace-nowrap">{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.company} className="border-b border-gray-100 last:border-0 align-top">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-gray-800">{r.company}</p>
                          {r.account && <p className="text-xs text-gray-500">{r.account.name} · {r.account.email}</p>}
                        </td>
                        <td className="py-2.5 pr-3"><AccountStatus account={r.account} /></td>
                        <td className="py-2.5 pr-3 text-gray-700">{r.approvedProducts}/{r.products}<p className="text-xs text-gray-400">approved</p></td>
                        <td className="py-2.5 pr-3 text-gray-700">{r.hospitals.join(", ") || "—"}</td>
                        <td className="py-2.5 pr-3 text-gray-700">
                          {r.orders}
                          {(r.requested + r.processing) > 0 && <p className="text-xs text-yellow-700">{r.requested + r.processing} open</p>}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-800">{money(r.paid)}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{money(r.openValue)}</td>
                        <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{fmtDate(r.lastOrder)}</td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <span className="inline-flex gap-1.5 text-xs">
                            {!r.account && (
                              <button onClick={() => { setFormError(""); setForm({ ...emptySupplier, companyName: r.company }); }}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Create login</button>
                            )}
                            {r.account?.invitePending && (
                              <button onClick={() => resend(r.account)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Resend link</button>
                            )}
                            {r.account && !r.account.invitePending && (
                              <button onClick={() => toggle(r)} className={`px-2.5 py-1 rounded-lg ${r.account.active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                                {r.account.active ? "Deactivate" : "Activate"}
                              </button>
                            )}
                            {r.canDelete && (
                              <button onClick={() => remove(r)} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Remove</button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Recent purchase orders */}
          <Card title="Recent purchase orders" subtitle="Latest 25 across all hospitals">
            {!(data?.recentOrders || []).length ? <Empty text={loading ? "Loading…" : "No orders yet."} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      {["Order", "Date", "Hospital", "Supplier", "Products", "Amount", "Status"].map((hd) => (
                        <th key={hd} className="py-2 pr-3 font-medium">{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-3 font-medium text-gray-800">{o.orderNumber}</td>
                        <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{fmtDate(o.date)}</td>
                        <td className="py-2 pr-3 text-gray-700">{o.hospital}</td>
                        <td className="py-2 pr-3 text-gray-700">{o.supplier}</td>
                        <td className="py-2 pr-3 text-gray-700">{o.items}</td>
                        <td className="py-2 pr-3 text-gray-800">{money(o.amount)}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STYLE[o.status] || ORDER_STYLE.requested}`}>{ORDER_LABEL[o.status] || o.status}</span>
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

      {form && (
        <Modal
          title={form.companyName && rows.some((r) => r.company === form.companyName && !r.account) ? `Create login for ${form.companyName}` : "Add supplier"}
          subtitle="The contact person gets an email link to set a password"
          onClose={() => setForm(null)}
          size="max-w-lg"
          footer={<>
            <button onClick={() => setForm(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={saveSupplier} disabled={saving} className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
              <FiMail /> {saving ? "Sending..." : "Create & send link"}
            </button>
          </>}
        >
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="s-company">Company name<span className="text-red-500"> *</span></label>
              <input id="s-company" className={inputClass} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">Must match the company name on its products, so its orders link up.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="s-name">Contact person<span className="text-red-500"> *</span></label>
              <input id="s-name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="s-email">Email<span className="text-red-500"> *</span></label>
                <input id="s-email" type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="s-contact">Contact number<span className="text-red-500"> *</span></label>
                <input id="s-contact" className={inputClass} value={form.contactNo} placeholder="10 digits" onChange={(e) => setForm({ ...form, contactNo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="s-started">Company starting date<span className="text-red-500"> *</span></label>
              <input id="s-started" type="date" className={inputClass} value={form.companyStartingDate} max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, companyStartingDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="s-license">Company license (PDF)<span className="text-red-500"> *</span></label>
              <input id="s-license" type="file" accept="application/pdf,.pdf"
                className="block w-full text-sm text-gray-600 border border-gray-300 rounded-lg p-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
                onChange={(e) => setForm({ ...form, companyLicense: e.target.files?.[0] || null })} />
              <p className="text-xs text-gray-400 mt-1">PDF, up to {MAX_LICENSE_MB} MB.</p>
            </div>
            <p className="text-xs text-gray-400">Fields marked <span className="text-red-500">*</span> are required. The contact person sets their own password from the email link.</p>
            {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => setConfirm(null)}
          size="max-w-md"
          footer={<>
            <button onClick={() => setConfirm(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={confirm.action} disabled={saving} className={`px-5 py-2 rounded-lg text-white disabled:opacity-60 ${confirm.danger ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
              {saving ? "Working..." : "Confirm"}
            </button>
          </>}
        >
          <p className="text-sm text-gray-600">{confirm.text}</p>
          {formError && <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
        </Modal>
      )}
    </div>
  );
}
