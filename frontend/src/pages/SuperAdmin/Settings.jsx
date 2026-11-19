import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FiRefreshCw, FiSave, FiCheckCircle } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { getSaSettings, saveSaSettings, testRazorpayKeys } from "../../services/superAdminService";
import { PAGE_FRAME, inputClass, labelClass } from "../Supplier/supplierUtils";

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="relative inline-flex items-center shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-green-500 transition" />
        <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

Toggle.propTypes = { checked: PropTypes.bool, onChange: PropTypes.func.isRequired, label: PropTypes.string.isRequired };

function Msg({ msg }) {
  if (!msg) return null;
  return <p className={`text-sm p-2.5 rounded-lg ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>;
}

Msg.propTypes = { msg: PropTypes.object };

/** Settings section card: title + badge on top, content, then message and buttons at the bottom right. */
function Section({ icon, title, subtitle, badge, children, msg, actions, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col ${className}`}>
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-xl shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge}
      </div>
      <div className="p-5 flex-1 space-y-4">{children}</div>
      {(msg || actions) && (
        <div className="px-5 pb-5 space-y-3">
          <Msg msg={msg} />
          {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}

Section.propTypes = {
  icon: PropTypes.node, title: PropTypes.string.isRequired, subtitle: PropTypes.string, badge: PropTypes.node,
  children: PropTypes.node, msg: PropTypes.object, actions: PropTypes.node, className: PropTypes.string,
};

/**
 * Secret field (Razorpay Key Secret, Gmail App Password).
 * Saved: shows dots + last 4 characters with a "Saved" badge and a Change button.
 * Change: empty password box for the new value (Cancel keeps the saved one).
 */
function SecretField({ id, label, isSet, masked, value, onChange, placeholder }) {
  const [editing, setEditing] = useState(!isSet);
  const last4 = (masked || "").replace(/•/g, "");
  if (isSet && !editing) {
    return (
      <div>
        <label className={labelClass} htmlFor={id}>{label}</label>
        <div className="flex items-center gap-2">
          <div id={id} className="flex-1 min-w-0 flex items-center justify-between gap-2 p-2.5 border border-green-200 bg-green-50 rounded-lg">
            <span className="font-mono text-sm text-gray-700 tracking-wider truncate">••••••••••••{last4}</span>
            <span className="text-xs font-semibold text-green-700 whitespace-nowrap">✓ Saved</span>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Change
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className={labelClass} htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={id} type="password" autoComplete="new-password" autoFocus={isSet} className={`${inputClass} font-mono`}
          value={value} placeholder={isSet ? `New ${label.toLowerCase()}` : placeholder} onChange={(e) => onChange(e.target.value)} />
        {isSet && (
          <button type="button" onClick={() => { onChange(""); setEditing(false); }} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

SecretField.propTypes = {
  id: PropTypes.string.isRequired, label: PropTypes.string.isRequired, isSet: PropTypes.bool, masked: PropTypes.string,
  value: PropTypes.string, onChange: PropTypes.func.isRequired, placeholder: PropTypes.string,
};

const Badge = ({ tone, children }) => {
  const tones = { green: "bg-green-100 text-green-700", yellow: "bg-yellow-100 text-yellow-800", red: "bg-red-50 text-red-600", gray: "bg-gray-100 text-gray-600" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
};

Badge.propTypes = { tone: PropTypes.string, children: PropTypes.node };

const primaryBtn = "flex items-center gap-2 px-4 py-2.5 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm font-medium";
const secondaryBtn = "flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-sm font-medium";

/** Super admin settings: booking fee, Razorpay keys, system mailbox, notifications (stored on the server). */
export default function Settings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("settings");
  const [tab, setTab] = useState("payments");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fee, setFee] = useState("");
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [mailAddress, setMailAddress] = useState("");
  const [mailName, setMailName] = useState("");
  const [mailPassword, setMailPassword] = useState("");
  const [notifications, setNotifications] = useState({});
  const [emails, setEmails] = useState({});
  const [msgs, setMsgs] = useState({});
  const [busy, setBusy] = useState("");

  const apply = (s) => {
    setSettings(s);
    setFee(String(s.bookingFee));
    setKeyId(s.razorpayKeyId || "");
    setSecret("");
    setMailAddress(s.emailAddress || "");
    setMailName(s.emailFromName || "");
    setMailPassword("");
    setNotifications(Object.fromEntries(s.notifications.map((n) => [n.key, n.enabled])));
    setEmails(Object.fromEntries(s.emails.map((n) => [n.key, n.enabled])));
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const result = await getSaSettings(token);
    if (result.success) apply(result.data.settings);
    else setError(result.message);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const setMsg = (key, msg) => setMsgs((m) => ({ ...m, [key]: msg }));

  const save = async (section, payload) => {
    setBusy(section);
    setMsg(section, null);
    const result = await saveSaSettings(token, payload);
    setBusy("");
    if (result.success) {
      apply(result.data.settings);
      setMsg(section, { ok: true, text: "Saved." });
    } else {
      setMsg(section, { ok: false, text: result.message });
    }
  };

  const testKeys = async () => {
    setBusy("test");
    setMsg("razorpay", null);
    const result = await testRazorpayKeys(token, { razorpayKeyId: keyId, ...(secret ? { razorpayKeySecret: secret } : {}) });
    setBusy("");
    setMsg("razorpay", { ok: result.success, text: result.success ? result.data.message : result.message });
  };

  const s = settings;
  const mailChanged = s && (mailAddress !== s.emailAddress || mailName !== s.emailFromName || !!mailPassword);
  const keysChanged = s && (keyId !== s.razorpayKeyId || !!secret);
  const notifOn = s ? Object.values(notifications).filter(Boolean).length : 0;
  const notifChanged = s && s.notifications.some((n) => n.enabled !== notifications[n.key]);
  const emailsChanged = s && s.emails.some((n) => n.enabled !== emails[n.key]);
  const modeTone = { live: "red", test: "yellow" }[s?.razorpayMode] || "gray";

  // one card per section: shows its current state and opens it (the cards are the tabs)
  const sections = s ? [
    {
      key: "payments", icon: "💳", label: "Payments",
      value: `₹${s.bookingFee} booking fee`,
      note: s.razorpayMode === "not set" ? "Razorpay not set" : `Razorpay · ${s.razorpayMode} mode`,
      ok: s.razorpayMode !== "not set",
    },
    {
      key: "email", icon: "📮", label: "Email",
      value: s.mailbox.configured ? "Account configured" : "Account not set",
      note: s.emailAddress || "Emails cannot be sent",
      ok: s.mailbox.configured,
    },
    {
      key: "notifications", icon: "🔔", label: "Notifications",
      value: `${notifOn} of ${s.notifications.length} on`,
      note: "In-app (bell menu)",
      ok: notifOn > 0,
    },
  ] : [];

  return (
    <div className={PAGE_FRAME}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
              <p className="text-sm text-gray-500">
                Platform settings for every hospital — changes apply right away
                {s?.updatedAt && <> · last saved {new Date(s.updatedAt).toLocaleString()} by {s.updatedBy}</>}
              </p>
            </div>
            <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm">
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">{error}</div>}
          {loading && !s && <p className="text-gray-500">Loading settings…</p>}

          {s && (
            <>
              {/* Sections (the cards are the tabs) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="tablist">
                {sections.map((c) => {
                  const active = tab === c.key;
                  return (
                    <button
                      key={c.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(c.key)}
                      className={`relative text-left rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition ${active
                        ? "bg-gradient-to-r from-blue-500 to-green-500 text-white border-transparent shadow-md"
                        : "bg-white border-gray-100 hover:shadow-md hover:border-blue-200"}`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${active ? "bg-white/25" : "bg-gradient-to-br from-blue-50 to-green-50"}`}>{c.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold ${active ? "text-white" : "text-gray-800"}`}>{c.label}</p>
                        <p className={`text-sm truncate ${active ? "text-white/95" : "text-gray-700"}`}>{c.value}</p>
                        <p className={`text-xs truncate ${active ? "text-white/80" : "text-gray-400"}`}>{c.note}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.ok ? "bg-green-400" : "bg-red-400"} ${active ? "ring-2 ring-white" : ""}`} title={c.ok ? "OK" : "Needs attention"} />
                    </button>
                  );
                })}
              </div>

              {/* ---------------- Payments ---------------- */}
              {tab === "payments" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                  <Section
                    icon="💰"
                    title="Appointment booking fee"
                    subtitle="Charged for patient online bookings and at reception (cash or online)"
                    msg={msgs.fee}
                    actions={
                      <button onClick={() => save("fee", { bookingFee: fee })} disabled={busy === "fee" || String(s.bookingFee) === fee} className={primaryBtn}>
                        <FiSave /> {busy === "fee" ? "Saving..." : "Save fee"}
                      </button>
                    }
                  >
                    <div>
                      <label className={labelClass} htmlFor="fee">Fee</label>
                      <div className="flex items-center">
                        <span className="px-3 py-2.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">₹</span>
                        <input id="fee" type="number" min="1" className={`${inputClass} rounded-l-none`} value={fee} onChange={(e) => setFee(e.target.value)} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Payments already made keep their amount. The new fee shows on the booking pages straight away.</p>
                  </Section>

                  <Section
                    className="xl:col-span-2"
                    icon="💳"
                    title="Online payments (Razorpay)"
                    subtitle="Razorpay Dashboard → Account & Settings → API Keys"
                    badge={<Badge tone={modeTone}>{s.razorpayMode === "not set" ? "Not set" : `${s.razorpayMode} mode`}</Badge>}
                    msg={msgs.razorpay}
                    actions={<>
                      <button onClick={testKeys} disabled={busy === "test"} className={secondaryBtn}>
                        <FiCheckCircle /> {busy === "test" ? "Checking..." : "Test keys"}
                      </button>
                      <button onClick={() => save("razorpay", { razorpayKeyId: keyId, ...(secret ? { razorpayKeySecret: secret } : {}) })}
                        disabled={busy === "razorpay" || !keysChanged} className={primaryBtn}>
                        <FiSave /> {busy === "razorpay" ? "Saving..." : "Save keys"}
                      </button>
                    </>}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} htmlFor="keyid">Key ID</label>
                        <input id="keyid" className={`${inputClass} font-mono`} value={keyId} placeholder="rzp_test_..." onChange={(e) => setKeyId(e.target.value.trim())} />
                      </div>
                      <SecretField key={`secret-${s.updatedAt}`} id="secret" label="Key Secret" isSet={s.razorpaySecretSet}
                        masked={s.razorpaySecretMasked} value={secret} onChange={(v) => setSecret(v.trim())} placeholder="Key Secret from Razorpay" />
                    </div>
                    <p className="text-xs text-gray-500">
                      For safety the saved secret is never shown in full — use Change to replace it. Test mode (rzp_test_) uses no real money; live mode (rzp_live_) charges real cards.
                    </p>
                  </Section>
                </div>
              )}

              {/* ---------------- Email ---------------- */}
              {tab === "email" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                  <Section
                    className="xl:col-span-2"
                    icon="📮"
                    title="Email account — sender for all emails"
                    subtitle="Sign-up codes, password reset, invitations and prescriptions are sent from this Gmail account"
                    badge={<Badge tone={s.mailbox.configured ? "green" : "red"}>{s.mailbox.configured ? "Configured" : "Not set"}</Badge>}
                    msg={msgs.mail}
                    actions={
                      <button
                        onClick={() => save("mail", { emailAddress: mailAddress, emailFromName: mailName, ...(mailPassword ? { emailAppPassword: mailPassword } : {}) })}
                        disabled={busy === "mail" || !mailChanged} className={primaryBtn}>
                        <FiSave /> {busy === "mail" ? "Saving..." : "Save email account"}
                      </button>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} htmlFor="mail-address">Gmail address</label>
                        <input id="mail-address" type="email" className={inputClass} value={mailAddress} onChange={(e) => setMailAddress(e.target.value.trim())} />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="mail-name">Sender name</label>
                        <input id="mail-name" className={inputClass} value={mailName} onChange={(e) => setMailName(e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <SecretField key={`mailpw-${s.updatedAt}`} id="mail-password" label="App Password" isSet={s.emailPasswordSet}
                          masked={s.emailPasswordMasked} value={mailPassword} onChange={setMailPassword} placeholder="16-letter App Password" />
                        <p className="text-xs text-gray-500 mt-1">
                          Google Account → Security → 2-Step Verification → App passwords. Not the normal Gmail password.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                      Emails arrive from <b>{mailName || "Sender"}</b> &lt;{mailAddress || "address"}&gt;
                    </div>
                  </Section>

                  <div>
                    <Section
                      icon="✉️"
                      title="Optional emails"
                      subtitle="Security emails are always sent"
                      msg={msgs.emails}
                      actions={
                        <button onClick={() => save("emails", { emails })} disabled={busy === "emails" || !emailsChanged} className={primaryBtn}>
                          <FiSave /> {busy === "emails" ? "Saving..." : "Save"}
                        </button>
                      }
                    >
                      {s.emails.map((n) => (
                        <Toggle key={n.key} label={n.label} checked={!!emails[n.key]} onChange={(on) => setEmails((x) => ({ ...x, [n.key]: on }))} />
                      ))}
                    </Section>
                  </div>
                </div>
              )}

              {/* ---------------- Notifications ---------------- */}
              {tab === "notifications" && (
                <Section
                  icon="🔔"
                  title="In-app notifications"
                  subtitle="What users see in the bell menu. Switched-off types are not created at all."
                  badge={<Badge tone={notifOn === s.notifications.length ? "green" : "yellow"}>{notifOn} of {s.notifications.length} on</Badge>}
                  msg={msgs.notifications}
                  actions={
                    <button onClick={() => save("notifications", { notifications })} disabled={busy === "notifications" || !notifChanged} className={primaryBtn}>
                      <FiSave /> {busy === "notifications" ? "Saving..." : "Save notifications"}
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {s.notifications.map((n) => (
                      <Toggle key={n.key} label={n.label} checked={!!notifications[n.key]} onChange={(on) => setNotifications((x) => ({ ...x, [n.key]: on }))} />
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
