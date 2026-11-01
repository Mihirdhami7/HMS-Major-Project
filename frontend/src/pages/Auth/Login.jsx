import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import { useHospitals } from "../../hooks/useHospitals";
import { LOGIN_ROLES, homeForRole, roleNeedsHospital } from "../../constants/roles";

const inputClass =
  "w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  // Real hospital list from the backend. While the backend requires a login for this
  // list, `available` is false and the user types the hospital name instead.
  const { hospitals, available: hospitalsAvailable, loading: hospitalsLoading } = useHospitals();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    category: "Patient",
    hospitalName: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const needsHospital = roleNeedsHospital(formData.category);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "category" && !roleNeedsHospital(value) ? { hospitalName: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const loginData = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      category: formData.category,
    };
    if (needsHospital) loginData.hospitalName = formData.hospitalName.trim();

    const result = await loginUser(loginData);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Login failed");
      return;
    }

    // Backend: { status, message, userData: { userType, email, hospitalName, name }, access }
    const { access, userData } = result.data || {};
    if (!access || !userData?.userType) {
      setError("Unexpected response from server. Please try again.");
      return;
    }
    login(access, userData);

    // Return to the page the user originally requested if it belongs to their role.
    const home = homeForRole(userData.userType);
    const from = location.state?.from;
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center py-8">
      <div className="bg-white shadow-2xl rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          Welcome to <span className="text-blue-600">EasyTreat</span> 🏥
        </h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
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
              className={inputClass}
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
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
            <select id="category" name="category" value={formData.category} onChange={handleChange} className={inputClass}>
              {LOGIN_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {needsHospital && (
            <div>
              <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              {hospitalsAvailable && hospitals.length > 0 ? (
                <select
                  id="hospitalName"
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="hospitalName"
                  name="hospitalName"
                  type="text"
                  placeholder={hospitalsLoading ? "Loading hospitals..." : "Enter your hospital name"}
                  value={formData.hospitalName}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-md hover:from-blue-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
