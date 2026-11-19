import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getInviteInfo, setPasswordWithInvite } from "../../services/superAdminService";

const inputClass =
  "w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

/**
 * /set-password?token=...  — opened from the invitation email a new hospital admin or supplier gets.
 * They choose a password, then log in normally.
 */
export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLinkError("This link is incomplete. Open the link from your email again.");
        setChecking(false);
        return;
      }
      const result = await getInviteInfo(token);
      if (cancelled) return;
      if (result.success) setInfo(result.data);
      else setLinkError(result.message);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6 || /^\d+$/.test(password)) {
      setError("Use at least 6 characters, not only numbers.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSaving(true);
    const result = await setPasswordWithInvite(token, password);
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const where = info?.hospitalName ? ` Choose “${info.hospitalName}” as your hospital.` : "";
    navigate("/login", { replace: true, state: { notice: `Password set. Log in with ${info?.email}.${where}` } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center py-8 px-4">
      <div className="bg-white shadow-2xl rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
          Welcome to <span className="text-blue-600">EasyTreat</span>
        </h2>

        {checking && <p className="text-center text-gray-500 mt-6">Checking your link…</p>}

        {!checking && linkError && (
          <div className="mt-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">{linkError}</p>
            </div>
            <Link to="/login" className="block text-center mt-6 text-blue-600 hover:text-blue-800 font-medium">Go to login</Link>
          </div>
        )}

        {!checking && info && (
          <>
            <p className="text-sm text-gray-600 text-center mb-6">
              Hello <b>{info.name}</b> — set a password for your {info.role} account
              {info.hospitalName ? ` at ${info.hospitalName}` : info.companyName ? ` for ${info.companyName}` : ""}.
            </p>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            <form className="space-y-5" onSubmit={submit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
                <input id="email" className={`${inputClass} bg-gray-50`} value={info.email} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">New password</label>
                <input id="password" type="password" autoComplete="new-password" className={inputClass} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" autoComplete="new-password" className={inputClass} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-md hover:from-blue-600 hover:to-green-600 disabled:opacity-70">
                {saving ? "Saving..." : "Set password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
