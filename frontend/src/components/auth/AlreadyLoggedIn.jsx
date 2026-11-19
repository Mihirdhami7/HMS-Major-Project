import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { homeForRole, normalizeRole } from "../../constants/roles";

/**
 * Shown on the login / sign-up pages when someone is already logged in on this tab:
 * go back to their dashboard, or log out and continue with this page.
 */
export default function AlreadyLoggedIn({ action = "log in with another account" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const role = normalizeRole(user?.userType);
  const label = { SuperAdmin: "Super Admin", Admin: "Hospital Admin" }[role] || role;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800 p-5">
      <p className="text-sm text-gray-700 dark:text-gray-200">
        You are logged in as <b>{user?.name || user?.email}</b>
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/70 dark:bg-gray-800 text-blue-700 dark:text-blue-300">{label}</span>
        {user?.hospitalName ? <> at <b>{user.hospitalName}</b></> : null}.
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">To {action}, log out first.</p>
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          onClick={() => navigate(homeForRole(user?.userType))}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
        >
          Go to my dashboard
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await logout();
            setBusy(false);
          }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-green-500 hover:opacity-95 disabled:opacity-70"
        >
          {busy ? "Logging out..." : "Log out and continue"}
        </button>
      </div>
    </div>
  );
}

AlreadyLoggedIn.propTypes = { action: PropTypes.string };
