import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    category: "Patient",
    hospitalName: "Zydus"
  });
  const [hospitals] = useState([
    "Zydus",
    "Iris",
    "Agrawal Medical"
  ]); // Default hospitals - replace with API call

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);


    // Uncomment this to fetch hospitals from API
  /*
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/hospitals/");
        if (response.ok) {
          const data = await response.json();
          setHospitals(data.hospitals);
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error);
      }
    };
    
    fetchHospitals();
  }, []);
  */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Auto-hide hospital field when category is Supplier
    if (name === "category" && value === "Supplier") {
      setFormData(prev => ({ ...prev, hospitalName: "" }));
    } else if (name === "category" && value !== "Supplier" && formData.hospitalName === "") {
      // Reset to default hospital if changing from Supplier to other roles
      setFormData(prev => ({ ...prev, hospitalName: "Zydus" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare login data - convert category to userType
      const loginData = {
        email: formData.email.toLowerCase(),
        password: formData.password,
        category: formData.category,
      };

      // Add hospitalName if not Supplier
      if (formData.category !== "Supplier") {
        loginData.hospitalName = formData.hospitalName;
      }

      console.log("Attempting login with:", loginData);

      // Call login service
      const result = await loginUser(loginData);

      if (result.success) {
        console.log("Login successful:", result.user);

        // Store in auth context
        login(result.token, result.user);

        // Redirect based on user type
        const userType = result.user.userType.toLowerCase();
        console.log("Redirecting to:", userType);

        switch (userType) {
          case "patient":
            navigate("/patient", { replace: true });
            break;
          case "doctor":
            navigate("/doctor", { replace: true });
            break;
          case "admin":
            navigate("/admin", { replace: true });
            break;
          case "supplier":
            navigate("/supplier", { replace: true });
            break;
          default:
            navigate("/", { replace: true });
        }
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Patient">Patient</option>
              <option value="Doctor">Doctor</option>
              <option value="Admin">Admin</option>
              <option value="Supplier">Supplier</option>
            </select>
          </div>

        {/* Hospital Dropdown - conditionally rendered */}
        {formData.category !== "Supplier" && (
          <div>
            <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
            <select
              id="hospitalName"
              name="hospitalName"
              value={formData.hospitalName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={formData.category !== "Supplier"}
            >
              <option value="">Select Hospital</option>
              {hospitals.map((hospital, index) => (
                <option key={index} value={hospital}>
                  {hospital}
                </option>
              ))}
            </select>
          </div>
        )}

          
          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-md hover:from-blue-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>


        {/* Register Link */}
        <p className="mt-6 text-center text-gray-600">
          Dont have an account?{" "}
          <a href="/accounts/register" className="text-blue-600 hover:text-blue-800 font-medium">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}