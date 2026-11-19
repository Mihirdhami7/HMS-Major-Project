import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight, FiX, FiMail } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
  getSaHospitals, createSaHospital, updateSaHospital, deleteSaHospital, createSaAdmin, updateSaAdmin, resendAdminInvite,
} from "../../services/superAdminService";
import { Card, Empty, Modal } from "../Supplier/SupplierUi";
import { money, PAGE_FRAME, inputClass, labelClass } from "../Supplier/supplierUtils";
import { KpiCard, InviteLinkBox, AccountStatus } from "./SuperAdminUi";
import { AXIS, GRID, CURSOR } from "./superAdminConfig";

const emptyHospital = { name: "", description: "", address: "", contactNo: "" };
const emptyAdmin = { name: "", email: "", contactNo: "", gender: "", dateOfBirth: "", hospitalName: "" };

function Stat({ label, value, warn = false }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className={`text-lg font-bold ${warn ? "text-yellow-700" : "text-gray-800"}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

Stat.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node, warn: PropTypes.bool };

/** Super admin: every hospital with its departments, admins and numbers; add hospitals and invite admins. */
export default function Hospitals() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("hospitals");
  const [hospitals, setHospitals] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // {text, invite?: {link, emailSent, email}}
  const [openDepts, setOpenDepts] = useState({});

  // dialogs
  const [hospitalForm, setHospitalForm] = useState(null); // {id?, ...fields}
  const [adminForm, setAdminForm] = useState(null);
  const [moveAdmin, setMoveAdmin] = useState(null); // {admin, hospitalName}
  const [confirm, setConfirm] = useState(null); // {title, text, action, danger}
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSaHospitals(token);
    if (result.success) {
      setHospitals(result.data?.hospitals || []);
      setUnassigned(result.data?.unassignedAdmins || []);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const admins = hospitals.flatMap((h) => h.admins);
    return {
      admins: admins.length,
      activeAdmins: admins.filter((a) => a.active).length,
      invites: admins.filter((a) => a.invitePending).length,
      departments: hospitals.reduce((s, h) => s + h.departments.length, 0),
      doctors: hospitals.reduce((s, h) => s + h.doctors, 0),
      pendingDoctors: hospitals.reduce((s, h) => s + h.pendingDoctors, 0),
      patients: hospitals.reduce((s, h) => s + h.patients, 0),
      noAdmin: hospitals.filter((h) => !h.admins.some((a) => a.active || a.invitePending)).length,
    };
  }, [hospitals]);

  const run = async (fn, onSuccess) => {
    setSaving(true);
    setFormError("");
    const result = await fn();
    setSaving(false);
    if (!result.success) {
      setFormError(result.message);
      return false;
    }
    onSuccess?.(result.data || {});
    load();
    return true;
  };

  // ---------- hospital
  const saveHospital = () => {
    const f = hospitalForm;
    if (!f.name.trim()) {
      setFormError("Hospital name is required.");
      return;
    }
    const payload = { name: f.name.trim(), description: f.description, address: f.address, contactNo: f.contactNo };
    run(() => (f.id ? updateSaHospital(token, f.id, payload) : createSaHospital(token, payload)), (data) => {
      setHospitalForm(null);
      setNotice({ text: data.message || "Hospital saved." });
      if (!f.id) setAdminForm({ ...emptyAdmin, hospitalName: payload.name }); // next step: its admin
    });
  };

  // ---------- admin
  const saveAdmin = () => {
    const f = adminForm;
    if (!f.hospitalName || !f.name.trim() || !f.email.trim() || !f.contactNo.trim() || !f.gender || !f.dateOfBirth) {
      setFormError("Hospital, full name, email, contact number, gender and date of birth are required.");
      return;
    }
    const born = new Date(`${f.dateOfBirth}T00:00:00`);
    const adult = new Date(born.getFullYear() + 18, born.getMonth(), born.getDate()) <= new Date();
    if (!adult) {
      setFormError("A hospital admin must be at least 18 years old.");
      return;
    }
    if (!/^\d{10}$/.test(f.contactNo.trim())) {
      setFormError("Contact number must be exactly 10 digits.");
      return;
    }
    run(() => createSaAdmin(token, f), (data) => {
      setAdminForm(null);
      setNotice({ text: data.message, invite: { link: data.inviteLink, emailSent: data.emailSent, email: f.email } });
    });
  };

  const resend = (admin) =>
    run(() => resendAdminInvite(token, admin.id), (data) =>
      setNotice({ text: data.message, invite: { link: data.inviteLink, emailSent: data.emailSent, email: admin.email } }));

  const toggleActive = (admin) => setConfirm({
    title: admin.active ? `Deactivate ${admin.name}?` : `Activate ${admin.name}?`,
    text: admin.active ? "They will be logged out and cannot log in until activated again." : "They can log in again with their password.",
    danger: admin.active,
    action: () => run(() => updateSaAdmin(token, admin.id, { active: !admin.active }), () => {
      setConfirm(null);
      setNotice({ text: `${admin.name} ${admin.active ? "deactivated" : "activated"}.` });
    }),
  });

  const saveMove = () =>
    run(() => updateSaAdmin(token, moveAdmin.admin.id, { hospitalName: moveAdmin.hospitalName }), () => {
      setNotice({ text: `${moveAdmin.admin.name} is now admin of ${moveAdmin.hospitalName}.` });
      setMoveAdmin(null);
    });

  const removeHospital = (h) => setConfirm({
    title: `Delete ${h.name}?`,
    text: "This hospital has no staff, patients or data yet, so it can be deleted.",
    danger: true,
    action: () => run(() => deleteSaHospital(token, h.id), (data) => {
      setConfirm(null);
      setNotice({ text: data.message || "Hospital deleted." });
    }),
  });

  const chartRows = hospitals.map((h) => ({
    name: h.name, Doctors: h.doctors, Patients: h.patients, Departments: h.departments.length,
    "All appointments": h.appointments, "This month": h.appointmentsThisMonth,
  }));
  const v = (n) => (loading && !hospitals.length ? "…" : n);

  return (
    <div className={PAGE_FRAME}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hospitals</h1>
              <p className="text-sm text-gray-500">Every hospital on the platform, its departments and its admins</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm">
                <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={() => { setFormError(""); setAdminForm({ ...emptyAdmin }); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-green-700 rounded-xl hover:bg-green-50 shadow-sm">
                <FiMail /> Add hospital admin
              </button>
              <button onClick={() => { setFormError(""); setHospitalForm({ ...emptyHospital }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 shadow-sm">
                <FiPlus /> Add hospital
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
            <KpiCard icon="🏥" label="Hospitals" value={v(hospitals.length)} sub={totals.noAdmin ? `${totals.noAdmin} without an admin` : "All have an admin"} />
            <KpiCard icon="🛡️" label="Hospital admins" value={v(totals.admins)} sub={`${totals.activeAdmins} active · ${totals.invites} invited`} />
            <KpiCard icon="🏷️" label="Departments" value={v(totals.departments)} sub="Across all hospitals" />
            <KpiCard icon="🧑‍⚕️" label="Doctors" value={v(totals.doctors)} sub={`${totals.pendingDoctors} waiting for approval`} />
            <KpiCard icon="🧑‍🤝‍🧑" label="Patients" value={v(totals.patients)} sub="Registered" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Staff and patients by hospital" subtitle="Current totals">
              {!chartRows.length ? <Empty text={loading ? "Loading…" : "No hospitals yet."} /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={CURSOR} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Departments" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Doctors" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Patients" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card title="Appointments by hospital" subtitle="All time and this month">
              {!chartRows.some((r) => r["All appointments"]) ? <Empty text={loading ? "Loading…" : "No appointments yet."} /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip cursor={CURSOR} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="All appointments" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="This month" fill="#facc15" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Hospital cards */}
          {loading && !hospitals.length ? <Empty text="Loading hospitals…" /> : (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              {hospitals.map((h) => {
                const open = !!openDepts[h.id];
                const hasAdmin = h.admins.some((a) => a.active || a.invitePending);
                return (
                  <div key={h.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 px-5 py-4 flex justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-800">🏥 {h.name}</h2>
                        {h.description && <p className="text-sm text-gray-600">{h.description}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          {h.address && <span className="mr-3">📍 {h.address}</span>}
                          {h.contactNo && <span>📞 {h.contactNo}</span>}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0 h-fit">
                        <button title="Edit hospital" onClick={() => { setFormError(""); setHospitalForm({ id: h.id, name: h.name, description: h.description, address: h.address, contactNo: h.contactNo, locked: !h.canDelete }); }}
                          className="p-2 rounded-lg text-blue-600 hover:bg-white"><FiEdit2 /></button>
                        {h.canDelete && (
                          <button title="Delete hospital" onClick={() => removeHospital(h)} className="p-2 rounded-lg text-red-600 hover:bg-white"><FiTrash2 /></button>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <Stat label="Departments" value={h.departments.length} />
                        <Stat label="Doctors" value={h.doctors} />
                        <Stat label="Pending doctors" value={h.pendingDoctors} warn={h.pendingDoctors > 0} />
                        <Stat label="Patients" value={h.patients} />
                        <Stat label="Appointments" value={h.appointments} />
                        <Stat label="Revenue" value={money(h.revenue)} />
                      </div>

                      {/* admins */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-gray-700">Hospital admins</p>
                          <button onClick={() => { setFormError(""); setAdminForm({ ...emptyAdmin, hospitalName: h.name }); }}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">+ Add admin</button>
                        </div>
                        {!hasAdmin && <p className="text-xs p-2 rounded-lg bg-red-50 text-red-600 mb-2">No active admin — nobody can manage this hospital.</p>}
                        <div className="space-y-2">
                          {h.admins.map((a) => (
                            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{a.name} <AccountStatus account={a} /></p>
                                <p className="text-xs text-gray-500">{a.email}{a.contactNo ? ` · ${a.contactNo}` : ""}</p>
                              </div>
                              <div className="flex gap-1.5 text-xs">
                                {a.invitePending && (
                                  <button onClick={() => resend(a)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Resend link</button>
                                )}
                                <button onClick={() => setMoveAdmin({ admin: a, hospitalName: h.name })} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Move</button>
                                {!a.invitePending && (
                                  <button onClick={() => toggleActive(a)} className={`px-2.5 py-1 rounded-lg ${a.active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                                    {a.active ? "Deactivate" : "Activate"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* departments */}
                      <div>
                        <button onClick={() => setOpenDepts((o) => ({ ...o, [h.id]: !open }))} className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                          {open ? <FiChevronDown /> : <FiChevronRight />} Departments ({h.departments.length})
                        </button>
                        {open && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {h.departments.length === 0 && <p className="text-xs text-gray-400">No departments yet — the hospital admin adds them.</p>}
                            {h.departments.map((d) => (
                              <div key={d.id} className="p-2.5 rounded-xl bg-gray-50 text-sm">
                                <p className="font-medium text-gray-800">{d.name}</p>
                                <p className="text-xs text-gray-500">{d.head ? `⭐ ${d.head}` : "No head"} · {d.doctors} doctor{d.doctors === 1 ? "" : "s"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unassigned.length > 0 && (
            <Card title="Admins without a hospital" subtitle="Their hospital no longer exists — move them to a hospital">
              <div className="space-y-2">
                {unassigned.map((a) => (
                  <div key={a.id} className="flex justify-between items-center p-2.5 rounded-xl border border-gray-100 text-sm">
                    <span>{a.name} · <span className="text-gray-500">{a.email}</span></span>
                    <button onClick={() => setMoveAdmin({ admin: a, hospitalName: "" })} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">Move</button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add / edit hospital */}
      {hospitalForm && (
        <Modal
          title={hospitalForm.id ? `Edit ${hospitalForm.name}` : "Add hospital"}
          subtitle={hospitalForm.id ? "Hospital details" : "Next you will add its hospital admin"}
          onClose={() => setHospitalForm(null)}
          size="max-w-lg"
          footer={<>
            <button onClick={() => setHospitalForm(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={saveHospital} disabled={saving} className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </>}
        >
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="h-name">Hospital name<span className="text-red-500"> *</span></label>
              <input id="h-name" className={inputClass} value={hospitalForm.name} disabled={hospitalForm.locked}
                onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })} />
              {hospitalForm.locked && <p className="text-xs text-gray-400 mt-1">The name cannot change once the hospital has staff or data.</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="h-desc">Description</label>
              <textarea id="h-desc" rows="2" className={`${inputClass} resize-none`} value={hospitalForm.description}
                onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="h-address">Address</label>
                <input id="h-address" className={inputClass} value={hospitalForm.address} onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="h-contact">Contact number</label>
                <input id="h-contact" className={inputClass} value={hospitalForm.contactNo} placeholder="10 digits" onChange={(e) => setHospitalForm({ ...hospitalForm, contactNo: e.target.value })} />
              </div>
            </div>
            {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
          </div>
        </Modal>
      )}

      {/* Add hospital admin (invitation) */}
      {adminForm && (
        <Modal
          title="Add hospital admin"
          subtitle="They get an email link to set their own password"
          onClose={() => setAdminForm(null)}
          size="max-w-lg"
          footer={<>
            <button onClick={() => setAdminForm(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={saveAdmin} disabled={saving} className="px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
              <FiMail /> {saving ? "Sending..." : "Create & send link"}
            </button>
          </>}
        >
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="a-hospital">Hospital<span className="text-red-500"> *</span></label>
              <select id="a-hospital" className={inputClass} value={adminForm.hospitalName} onChange={(e) => setAdminForm({ ...adminForm, hospitalName: e.target.value })}>
                <option value="">Select hospital</option>
                {hospitals.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="a-name">Full name<span className="text-red-500"> *</span></label>
              <input id="a-name" className={inputClass} value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="a-email">Email<span className="text-red-500"> *</span></label>
                <input id="a-email" type="email" className={inputClass} value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="a-contact">Contact number<span className="text-red-500"> *</span></label>
                <input id="a-contact" className={inputClass} value={adminForm.contactNo} placeholder="10 digits" onChange={(e) => setAdminForm({ ...adminForm, contactNo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="a-gender">Gender<span className="text-red-500"> *</span></label>
                <select id="a-gender" className={inputClass} value={adminForm.gender} onChange={(e) => setAdminForm({ ...adminForm, gender: e.target.value })}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="a-dob">Date of birth<span className="text-red-500"> *</span></label>
                <input id="a-dob" type="date" className={inputClass} value={adminForm.dateOfBirth} max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setAdminForm({ ...adminForm, dateOfBirth: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-gray-400">Fields marked <span className="text-red-500">*</span> are required. The admin sets their own password from the email link.</p>
            {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
          </div>
        </Modal>
      )}

      {/* Move admin to another hospital */}
      {moveAdmin && (
        <Modal
          title={`Move ${moveAdmin.admin.name}`}
          subtitle="Choose the hospital this admin manages"
          onClose={() => setMoveAdmin(null)}
          size="max-w-md"
          footer={<>
            <button onClick={() => setMoveAdmin(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={saveMove} disabled={saving || !moveAdmin.hospitalName} className="px-5 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Move"}</button>
          </>}
        >
          <select className={inputClass} value={moveAdmin.hospitalName} onChange={(e) => setMoveAdmin({ ...moveAdmin, hospitalName: e.target.value })}>
            <option value="">Select hospital</option>
            {hospitals.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-2">They are logged out and see the new hospital at their next login.</p>
          {formError && <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
        </Modal>
      )}

      {/* Confirm */}
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
