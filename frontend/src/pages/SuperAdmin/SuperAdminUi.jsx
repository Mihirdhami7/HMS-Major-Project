// Small building blocks shared by the super admin pages.
import { useState } from "react";
import PropTypes from "prop-types";
import { PERIODS } from "./superAdminConfig";

/** Card with an optional ▲/▼ change versus the previous period. */
export function KpiCard({ icon, label, value, sub, change, vs, onClick }) {
  const up = typeof change === "number" && change >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 enabled:hover:shadow-md enabled:hover:border-blue-200 transition"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-2xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {typeof change === "number" && (
            <span className={`font-semibold mr-1 ${up ? "text-green-600" : "text-red-600"}`}>
              {up ? "▲" : "▼"} {Math.abs(change)}%{vs ? ` ${vs} · ` : " "}
            </span>
          )}
          {sub}
        </p>
      </div>
    </button>
  );
}

KpiCard.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.string,
  change: PropTypes.number,
  vs: PropTypes.string,
  onClick: PropTypes.func,
};

/** Week / Month / Quarter / Year / All time switch (light = on a white card, otherwise on the gradient banner). */
export function PeriodTabs({ value, onChange, light = false }) {
  return (
    <div className={`flex rounded-xl p-1 ${light ? "bg-gray-100" : "bg-white/20"}`}>
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 text-sm rounded-lg ${value === p.key
            ? `bg-white font-semibold shadow-sm ${light ? "text-blue-700" : "text-blue-700"}`
            : light ? "text-gray-500 hover:text-gray-700" : "text-white hover:bg-white/10"}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

PeriodTabs.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, light: PropTypes.bool };

/** Shows the "set your password" link after an invitation, with a copy button. */
export function InviteLinkBox({ link, emailSent, email }) {
  const [copied, setCopied] = useState(false);
  if (!link) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className={`rounded-xl p-4 text-sm ${emailSent ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
      <p className={`font-medium ${emailSent ? "text-green-800" : "text-yellow-800"}`}>
        {emailSent ? `📧 Set-password link emailed to ${email}.` : "⚠️ The email could not be sent — share this link with the person."}
      </p>
      <p className="text-xs text-gray-600 mt-1">Valid for 3 days. They set a password, then log in with their email.</p>
      <div className="flex gap-2 mt-2">
        <input readOnly value={link} className="flex-1 min-w-0 p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700" onFocus={(e) => e.target.select()} />
        <button onClick={copy} className="px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">{copied ? "Copied ✓" : "Copy"}</button>
      </div>
    </div>
  );
}

InviteLinkBox.propTypes = { link: PropTypes.string, emailSent: PropTypes.bool, email: PropTypes.string };

/** Small coloured status pill for accounts. */
export function AccountStatus({ account }) {
  if (!account) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No login account</span>;
  if (account.invitePending) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${account.inviteExpired ? "bg-red-50 text-red-600" : "bg-yellow-100 text-yellow-800"}`}>
        {account.inviteExpired ? "Invite expired" : "Invite sent"}
      </span>
    );
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${account.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
      {account.active ? "Active" : "Deactivated"}
    </span>
  );
}

AccountStatus.propTypes = { account: PropTypes.object };
