import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import { homeForRole, isRole, ROLES } from "../../constants/roles";

const inputClass =
  "w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const errorInputClass =
  "w-full p-3 border-2 border-red-400 bg-red-50 rounded-md focus:ring-2 focus:ring-red-400 focus:border-red-400";

/**
 * Super admin login (/superadmin/login) — not linked from anywhere.
 * The site's single super admin manages all hospitals, so there is no role or hospital to choose:
 * email + password only. The server accepts only the SuperAdmin account here.
 */
export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setError(null);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await loginUser({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      category: ROLES.SUPERADMIN,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message || "Login failed");
      return;
    }
    const { access, userData } = result.data || {};
    if (!access || !isRole(userData?.userType, ROLES.SUPERADMIN)) {
      setError("Invalid credentials. Please check your email and password.");
      return;
    }
    login(access, userData);
    navigate(homeForRole(userData.userType), { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center py-8">
      <div className="bg-white shadow-2xl rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
          <span className="text-blue-600">EasyTreat</span> Super Admin
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">Manage all hospitals</p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className={error ? errorInputClass : inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className={error ? errorInputClass : inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-md hover:from-blue-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
