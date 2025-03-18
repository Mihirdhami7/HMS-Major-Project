import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import navigation hook

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    category: "Patient",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // ✅ Use react-router for redirection

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok && data.status === "success") {
        // Store user data
        localStorage.setItem("userEmail", data.userData.email);
        localStorage.setItem("userType", data.userData.userType.toLowerCase());

        // Debug log to verify storage
        console.log("Stored in localStorage:", {
          email: localStorage.getItem("userEmail"),
          userType: localStorage.getItem("userType")
        });

        
        const userType = data.userData.userType.toLowerCase();
        // Superadmin check
        if (
          data.userData.email.toLowerCase() === "21it402@bvmengineering.ac.in" &&
          formData.password === "MihirDhami7@2520"
        ) {
          navigate("/superadmin", { replace: true });
          return;
        }
        
        switch(userType) {
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
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
};
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          Hello! <span className="text-blue-600">Welcome Back</span> 🎉
        </h2>

        {error && <div className="text-red-600 text-center">{error}</div>}
        
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
          />

          {/* Category Dropdown */}
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md"
          >
            <option value="Patient">Patient</option>
            <option value="Doctor">Doctor</option>
            <option value="Admin">Admin</option>
            <option value="Supplier">Supplier</option>

          </select>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Register Link */}
        <p className="mt-4 text-center text-gray-600">
            Do not have an account?{" "}
          <a href="/register" className="text-blue-600">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}