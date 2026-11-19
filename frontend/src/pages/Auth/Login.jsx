import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiHome } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import { useHospitals } from "../../hooks/useHospitals";
import { LOGIN_ROLES, homeForRole, roleNeedsHospital } from "../../constants/roles";
import AuthLayout from "../../components/auth/AuthLayout";
import { IconInput, PasswordInput, IconSelect, AuthMessage } from "../../components/auth/AuthFields";
import AlreadyLoggedIn from "../../components/auth/AlreadyLoggedIn";

// Which inputs to highlight for each kind of login error (field comes from the backend).
const FIELDS_FOR_ERROR = {
  credentials: ["email", "password"],
  role: ["category"],
  hospital: ["hospitalName"],
};

const ROLE_ICONS = { Patient: "🧑", Doctor: "🩺", Admin: "🏥", Supplier: "🚚" };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  // Real hospital list from the backend (public endpoint). The user only selects, never types.
  const { hospitals, loading: hospitalsLoading, error: hospitalsError } = useHospitals();
  const notice = location.state?.notice;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    category: "Patient",
    hospitalName: "",
  });
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [loading, setLoading] = useState(false);

  const isInvalid = (name) => (FIELDS_FOR_ERROR[errorField] || []).includes(name);

  const needsHospital = roleNeedsHospital(formData.category);
  const selectedHospital = hospitals.find((h) => h.name === formData.hospitalName);

  const setField = (name, value) => {
    // editing the highlighted input clears its error
    if ((FIELDS_FOR_ERROR[errorField] || []).includes(name)) {
      setErrorField(null);
      setError(null);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "category" && !roleNeedsHospital(value) ? { hospitalName: "" } : {}),
    }));
  };
  const handleChange = (e) => setField(e.target.name, e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    if (needsHospital && !formData.hospitalName) {
      setError("Please select the proper hospital.");
      setErrorField("hospital");
      return;
    }
    setLoading(true);

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
      setErrorField(result.error?.field || null);
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
    <AuthLayout
      title={<>Welcome back <span aria-hidden>👋</span></>}
      subtitle="Log in to EasyTreat to continue."
      footer={<>Don&apos;t have an account?{" "}
        <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold">Create one</Link></>}
    >
      {notice && !error && <AuthMessage tone="success">{notice}</AuthMessage>}
      {error && <AuthMessage tone="error">{error}</AuthMessage>}

      {isAuthenticated ? <AlreadyLoggedIn /> : (
      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Role */}
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am a</p>
          <div
            role="radiogroup"
            aria-label="User type"
            className={`grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl ${isInvalid("category") ? "ring-2 ring-red-400 p-1" : ""}`}
          >
            {LOGIN_ROLES.map((role) => {
              const active = formData.category === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-role={role}
                  onClick={() => setField("category", role)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-sm font-medium transition ${active
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-200"
                    : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                >
                  <span className="text-lg" aria-hidden>{ROLE_ICONS[role] || "👤"}</span>
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        <IconInput
          id="email" name="email" type="email" label="Email address" icon={FiMail}
          autoComplete="email" placeholder="you@example.com" required
          value={formData.email} onChange={handleChange} invalid={isInvalid("email")}
        />

        <div>
          <PasswordInput
            id="password" name="password" label="Password" icon={FiLock}
            autoComplete="current-password" placeholder="Your password" required
            value={formData.password} onChange={handleChange} invalid={isInvalid("password")}
          />
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Forgot password?</Link>
          </div>
        </div>

        {needsHospital && (
          <div>
            <IconSelect
              id="hospitalName" name="hospitalName" label="Hospital" icon={FiHome}
              value={formData.hospitalName} onChange={handleChange} invalid={isInvalid("hospitalName")}
              disabled={hospitalsLoading || hospitals.length === 0}
              error={hospitalsError && !hospitalsLoading ? `Could not load hospitals: ${hospitalsError}` : null}
            >
              <option value="">
                {hospitalsLoading ? "Loading hospitals..." : hospitals.length ? "Select your hospital" : "No hospitals available"}
              </option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.name}>{h.name}</option>
              ))}
            </IconSelect>
            {selectedHospital && (
              <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-3 text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                {selectedHospital.address && <p>📍 {selectedHospital.address}</p>}
                {selectedHospital.contactNo && <p>📞 {selectedHospital.contactNo}</p>}
                {formData.category === "Patient" && (
                  <p className="text-gray-500 dark:text-gray-400 pt-1">
                    Your patient account belongs to this hospital. For another hospital, log in with (or create) an account there.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-xl font-semibold shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      )}
    </AuthLayout>
  );
}
