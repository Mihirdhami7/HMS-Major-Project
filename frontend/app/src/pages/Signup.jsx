import { useState } from "react";
import axios from "axios";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactNo: "",
    dateOfBirth: "",
    userType: "Patient",
    gender: "Male",
    photo: null,
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  // Handle text input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    setFormData({ ...formData, photo: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!formData.contactNo.trim()) newErrors.contactNo = "Contact number is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("email", formData.email);
    formDataToSend.append("password", formData.password);
    formDataToSend.append("contactNo", formData.contactNo);
    formDataToSend.append("dateOfBirth", formData.dateOfBirth);
    formDataToSend.append("userType", formData.userType);
    formDataToSend.append("gender", formData.gender);
    if (formData.photo) {
      formDataToSend.append("photo", formData.photo);
    }

    console.log("Form Data Sent:", [...formDataToSend]); // Debugging output

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/register/", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Response:", response); // Debugging output

      if (response.status === 201) {
        setMessage("Signup successful! Please login.");
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          contactNo: "",
          dateOfBirth: "",
          userType: "Patient",
          gender: "Male",
          photo: null,
        });
      } else {
        setMessage("Signup failed. Please try again.");
      }
    } catch (error) {
      if (error.response) {
        console.error("Error Response:", error.response.data);
        setMessage(error.response.data.message || "Signup failed. Please try again.");
        setErrors(error.response.data);
      } else {
        setMessage("An error occurred during signup.");
      }
    }
  };
  
  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex bg-white shadow-lg rounded-lg overflow-hidden w-3/4">
        <div className="w-1/2 bg-blue-500 flex items-center justify-center p-10">
          <img
            src="/mnt/data/image.png"
            alt="Sign Up Illustration"
            className="w-full h-auto"
          />
        </div>
        <div className="w-1/2 p-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create an <span className="text-indigo-600">Account</span>
          </h2>

          {/* Display message */}
          {message && (
            <div className={`mt-4 p-2 text-center rounded ${message.includes("successful") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" value="true" />
            <input
              name="name"
              type="text"
              placeholder="Name"
              required
              className="w-full p-2 border rounded"
              value={formData.name}
              onChange={handleChange}
            />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              className="w-full p-2 border rounded"
              value={formData.email}
              onChange={handleChange}
            />
            {/* Password Field with Show Button */}
            <div className="relative">
              <input
                name="password"
                type={formData.showPassword ? "text" : "password"}
                placeholder="Password"
                required
                className="w-full p-2 border rounded"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute right-3 top-2 text-sm text-blue-600"
                onClick={() => setFormData((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
              >
                {formData.showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              required
              className="w-full p-2 border rounded"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <input
              name="contactNo"
              type="tel"
              placeholder="Contact Number"
              required
              className="w-full p-2 border rounded"
              value={formData.contactNo}
              onChange={handleChange}
            />
            <div className="flex space-x-2">
              <select
                name="userType"
                required
                className="w-1/2 p-2 border rounded"
                value={formData.userType}
                onChange={handleChange}
              >
                <option value="Patient">Patient</option>
                <option value="Doctor">Doctor</option>
                <option value="Admin">Admin</option>
              </select>
              <select
                name="gender"
                required
                className="w-1/2 p-2 border rounded"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <label className="block text-gray-700">Upload Photo</label>
            <input
              type="file"
              name="photo"
              className="w-full p-2 border rounded"
              onChange={handleFileChange}
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
            > Sign Up
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account? <a href="/login" className="text-indigo-600">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}