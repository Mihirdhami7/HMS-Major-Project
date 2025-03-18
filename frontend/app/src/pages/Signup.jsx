import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("registration"); // registration, verification
  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Generic"
  ];
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
    doctorQualification: "",
    doctorSpecialization: "",
    doctorCertificate: null,
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const handleDateChange = (date) => {
    setFormData({ ...formData, dateOfBirth: date });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] });
  };

  // const handlePhotoChange = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     setFormData({ ...formData, photo: file });
      
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       setPhotoPreview(reader.result);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (formData.name.length < 3) newErrors.name = "Name must be at least 3 characters";

    // Email validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!emailPattern.test(formData.email)) newErrors.email = "Invalid email format";

    // Password validation
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) newErrors.password = "Password is required";
    else if (!passwordPattern.test(formData.password))
      newErrors.password = "Password must be at least 8 characters, include uppercase, lowercase, number, and special character";

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    // Contact number validation
    const phonePattern = /^[0-9]{10}$/;
    if (!formData.contactNo.trim()) newErrors.contactNo = "Contact number is required";
    else if (!phonePattern.test(formData.contactNo)) newErrors.contactNo = "Contact number must be exactly 10 digits";

    // Date of Birth validation
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of Birth is required";

    // Doctor-specific fields validation
    if (formData.userType === "Doctor") {
      if (!formData.doctorQualification.trim()) {
        newErrors.doctorQualification = "Qualification is required";
      }
      if (!formData.doctorSpecialization) {
        newErrors.doctorSpecialization = "Please select a specialization";
      }
      if (!formData.doctorCertificate) {
        newErrors.doctorCertificate = "Certificate upload is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!validateForm()) return;

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'doctorSpecialization') {
          formDataToSend.append(key, value);
        } else if (value) {
          formDataToSend.append(key, value);
        }
      });

      const response = await axios.post("http://127.0.0.1:8000/api/register/", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        setMessage(response.data.message);
        setStep("verification");
        
        // For development: Auto-fill OTP if in debug mode
        if (response.data.debug_otp) {
          setOtp(response.data.debug_otp);
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "An error occurred during signup");
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/verify-email/", {
        email: formData.email,
        otp: otp
      });

      if (response.status === 200) {
        setMessage("Signup successful! Please login.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Verification failed");
    }
  };

  if (step === "verification") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <h2 className="text-2xl font-bold mb-4">Email Verification</h2>
          <p className="mb-4">Please enter the verification code sent to your email.</p>
          
          {message && (
            <div className="mb-4 p-2 text-center rounded bg-blue-100 text-blue-700">
              {message}
            </div>
          )}

          <form onSubmit={handleVerification}>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter verification code"
              className="w-full p-2 border rounded mb-4"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Verify Email
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex bg-white shadow-lg rounded-lg overflow-hidden w-3/4 max-h-[80vh] mt-16">
        <div className="w-1/2 bg-blue-500 flex items-center justify-center p-10">
          <img src="src/assets/images/account.png" alt="Sign Up Illustration" className="w-full h-auto" />
        </div>
        <div className="w-1/2 p-8 overflow-y-auto">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create an <span className="text-indigo-600">Account</span>
          </h2>

          {message && (
            <div className={`mt-4 p-2 text-center rounded ${message.includes("successful") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>

            <input name="name" type="text" placeholder="Name" className="w-full p-2 border rounded" value={formData.name} onChange={handleChange} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

            <input name="email" type="email" placeholder="Email address" className="w-full p-2 border rounded" value={formData.email} onChange={handleChange} />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

            <input name="password" type="password" placeholder="Password" className="w-full p-2 border rounded" value={formData.password} onChange={handleChange} />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

            <input name="confirmPassword" type="password" placeholder="Confirm Password" className="w-full p-2 border rounded" value={formData.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}

            <input name="contactNo" type="tel" placeholder="Contact Number" className="w-full p-2 border rounded" value={formData.contactNo} onChange={handleChange} />
            {errors.contactNo && <p className="text-red-500 text-sm">{errors.contactNo}</p>}

            <label className="block text-gray-700">Date of Birth</label>
            <DatePicker
              selected={formData.dateOfBirth}
              onChange={handleDateChange}
              className="w-full p-2 border rounded"
              dateFormat="yyyy/mm/dd"  // Custom date format
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={100} // Allow scrolling through years
            />
            {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}

            <select name="userType" className="w-full p-2 border rounded" value={formData.userType} onChange={handleChange}>
              <option value="Patient">Patient</option>
              <option value="Doctor">Doctor</option>
              <option value="Admin">Supplier</option>
            </select>

            {formData.userType === "Doctor" && (
              <>
                <input 
                  name="doctorQualification" 
                  type="text" 
                  placeholder="Qualification" 
                  className="w-full p-2 border rounded" 
                  value={formData.doctorQualification} 
                  onChange={handleChange} 
                />
                {errors.doctorQualification && (
                  <p className="text-red-500 text-sm">{errors.doctorQualification}</p>
                )}

                <select
                  name="doctorSpecialization"
                  className="w-full p-2 border rounded"
                  value={formData.doctorSpecialization}
                  onChange={handleChange}
                >
                  <option value="">Select Specialization</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.doctorSpecialization && (
                  <p className="text-red-500 text-sm">{errors.doctorSpecialization}</p>
                )}

                <div>
                  <label className="block text-gray-700">Upload Qualification Certificate (PDF)</label>
                  <input 
                    type="file" 
                    name="doctorCertificate" 
                    accept="application/pdf" 
                    className="w-full p-2 border rounded" 
                    onChange={handleFileChange} 
                  />
                  {errors.doctorCertificate && (
                    <p className="text-red-500 text-sm">{errors.doctorCertificate}</p>
                  )}
                </div>
              </>
            )}

            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Sign Up</button>
            already have an account?{" "} <a href="/login" className="text-blue-600">Login</a>
          </form>
        </div>
      </div>
    </div>
  );
}
