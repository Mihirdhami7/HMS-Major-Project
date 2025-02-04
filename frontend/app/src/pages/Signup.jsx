import { useState } from "react";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dateOfBirth: "",
    userType: "Patient",
    gender: "Male",
    photo: null,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, photo: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("User Data:", formData);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="bg-white shadow-lg rounded-lg flex w-full max-w-4xl">
        {/* Left Side - Illustration */}
        <div className="hidden md:flex w-1/2 bg-blue-500 p-4 justify-center items-center">
          <img
            src="https://cdn.dribbble.com/users/1162077/screenshots/5403918/media/53e78c8d9280fbb58ce80268c7636f77.png"
            alt="Signup Illustration"
            className="w-full h-auto"
          />
        </div>

        {/* Right Side - Signup Form */}
        <div className="w-full md:w-1/2 p-6">
          <h2 className="text-xl font-bold text-gray-800">
            Create an <span className="text-blue-600">Account</span>
          </h2>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />
            <input
              type="date"
              name="dateOfBirth"
              placeholder="Date of Birth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-300"
            />

            {/* User Type & Gender Dropdowns */}
            <div className="flex space-x-2">
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-1/2 p-2 border border-gray-300 rounded-md"
              >
                <option value="Patient">Patient</option>
                <option value="Doctor">Doctor</option>
                <option value="Admin">Admin</option>
              </select>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-1/2 p-2 border border-gray-300 rounded-md"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Upload Photo */}
            <label className="block text-gray-600">Upload Photo</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />

            {/* Sign Up Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              Sign Up
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-3 text-center text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
