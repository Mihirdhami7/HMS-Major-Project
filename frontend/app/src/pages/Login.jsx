import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    category: "Patient",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Attempting login with:", { 
        email: formData.email, 
        category: formData.category 
      });
      
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        credentials: "include", // This ensures cookies are sent & received
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok && data.status === "success") {
        let userType = data.userData.userType;
        const email = data.userData.email.toLowerCase();
        
        if (userType) {
          userType = userType.toLowerCase();
        } else {
          console.error("userType is undefined");
          setError("Invalid user type received");
          return;
        }


        sessionStorage.setItem("session_Id", data.session_Id);
        sessionStorage.setItem("userType", userType);
        sessionStorage.setItem("email", email);
        sessionStorage.setItem("name", data.userData.name);


        console.log("Login successful user data are ", data.userData);

         // Debug: Check user type before redirection
        console.log("About to redirect based on userType:", userType);

        // Superadmin check
        if (email === "21it402@bvmengineering.ac.in" && formData.password === "MihirDhami7@2520") {
          navigate("/superadmin", { replace: true });
          return;
        }

        // Redirect based on user type
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
          <a href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}