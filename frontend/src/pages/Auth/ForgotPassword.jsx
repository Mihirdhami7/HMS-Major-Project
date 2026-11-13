import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset, confirmPasswordReset } from "../../services/authService";

const inputClass =
  "w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const buttonClass =
  "w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-md hover:from-blue-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-70";

/**
 * Forgot password:
 *  Step 1 — enter account email → backend emails a 6-digit code (valid 10 minutes)
 *  Step 2 — enter code + new password → password changed on every account of that email
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const sendCode = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setInfo(result.message || "A reset code has been sent to your email.");
    setStep("reset");
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await confirmPasswordReset(email.trim().toLowerCase(), otp.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate("/login", { replace: true, state: { notice: result.message || "Password updated. Please log in." } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center py-8">
      <div className="bg-white shadow-2xl rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Reset your password</h2>
        <p className="text-center text-gray-500 mb-6">
          {step === "email"
            ? "Enter your account email and we will send you a 6-digit code."
            : `Enter the code sent to ${email} and choose a new password.`}
        </p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {info && step === "reset" && !error && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <p className="text-green-700">{info}</p>
          </div>
        )}

        {step === "email" ? (
          <form className="space-y-6" onSubmit={sendCode}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? "Sending code..." : "Send reset code"}
            </button>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={resetPassword}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">6-digit code</label>
              <input
                id="otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className={`${inputClass} tracking-widest text-center text-lg`}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={loading || otp.length !== 6} className={buttonClass}>
              {loading ? "Updating..." : "Update password"}
            </button>
            <p className="text-center text-sm text-gray-600">
              Didn&apos;t get the code?{" "}
              <button type="button" onClick={sendCode} disabled={loading} className="text-blue-600 hover:text-blue-800 font-medium">
                Send again
              </button>
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-gray-600">
          Remembered it?{" "}
          <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
