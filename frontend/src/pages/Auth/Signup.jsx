import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerUser, verifyEmail } from "../../services/authService";
import { useHospitals } from "../../hooks/useHospitals";

const inputClass =
  " bg-blue-50 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500";

// Roles offered on public signup. (Backend RegisterSerializer also accepts "Admin", but
// hospital admins should not be self-registered from a public page.)
const SIGNUP_ROLES = ["Patient", "Doctor", "Supplier"];
// Roles that belong to a hospital → backend requires hospitalName, gender and dateOfBirth.
const HOSPITAL_ROLES = ["Patient", "Doctor"];

// Backend stores dates as plain strings → send YYYY-MM-DD.
const toIsoDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  contactNo: "",
  dateOfBirth: null,
  userType: "Patient",
  gender: "Male",
  photo: null,
  doctorQualification: "",
  doctorSpecialization: "",
  doctorCertificate: null,
  hospitalName: "",
  companyName: "",
  companyStartingDate: null,
  companyLicense: null,
};

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("registration"); // registration, verification
  // Real hospitals from the backend (public endpoint). The user selects, never types.
  const { hospitals, loading: hospitalsLoading } = useHospitals();
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const isSupplier = formData.userType === "Supplier";
  const isDoctor = formData.userType === "Doctor";
  const needsHospital = HOSPITAL_ROLES.includes(formData.userType);

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] || null });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailPattern.test(formData.email.trim())) {
      newErrors.email = "Invalid email format";
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordPattern.test(formData.password)) {
      newErrors.password =
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    const phonePattern = /^[0-9]{10}$/;
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = "Contact number is required";
    } else if (!phonePattern.test(formData.contactNo.trim())) {
      newErrors.contactNo = "Contact number must be exactly 10 digits";
    }

    // Date of birth + gender are required by the backend for Patient / Doctor.
    if (!isSupplier || formData.dateOfBirth) {
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Date of Birth is required";
      } else {
        const today = new Date();
        const birthDate = new Date(formData.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;

        if (isDoctor && age < 25) {
          newErrors.dateOfBirth = "Doctors must be at least 25 years old";
        } else if (age < 18) {
          newErrors.dateOfBirth = "You must be at least 18 years old to register";
        }
      }
    }
    if (needsHospital && !formData.gender) {
      newErrors.gender = "Gender is required";
    }

    if (needsHospital && !formData.hospitalName.trim()) {
      newErrors.hospitalName = "Hospital is required";
    }

    if (isDoctor) {
      if (!formData.doctorQualification.trim()) {
        newErrors.doctorQualification = "Qualification is required";
      }
      if (!formData.doctorSpecialization.trim()) {
        newErrors.doctorSpecialization = "Specialization is required";
      }
      if (!formData.doctorCertificate) {
        newErrors.doctorCertificate = "Certificate upload is required";
      }
    }

    if (isSupplier) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = "Company name is required";
      }
      if (!formData.companyStartingDate) {
        newErrors.companyStartingDate = "Company starting date is required";
      }
      if (!formData.companyLicense) {
        newErrors.companyLicense = "Company license upload is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Build multipart payload with only the fields RegisterSerializer expects for this userType. */
  const buildPayload = () => {
    const fd = new FormData();
    const put = (key, value) => {
      if (value !== null && value !== undefined && value !== "") fd.append(key, value);
    };
    put("name", formData.name.trim());
    put("email", formData.email.trim().toLowerCase());
    put("password", formData.password);
    put("contactNo", formData.contactNo.trim());
    put("userType", formData.userType);
    put("gender", formData.gender);
    put("dateOfBirth", toIsoDate(formData.dateOfBirth));
    put("photo", formData.photo);

    if (needsHospital) put("hospitalName", formData.hospitalName.trim());
    if (isDoctor) {
      put("doctorQualification", formData.doctorQualification.trim());
      put("doctorSpecialization", formData.doctorSpecialization.trim());
      put("doctorCertificate", formData.doctorCertificate);
    }
    if (isSupplier) {
      put("companyName", formData.companyName.trim());
      put("companyStartingDate", toIsoDate(formData.companyStartingDate));
      put("companyLicense", formData.companyLicense);
    }
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showMessage("");
    if (!validateForm()) return;

    setSubmitting(true);
    const result = await registerUser(buildPayload());
    setSubmitting(false);

    if (result.success) {
      showMessage(result.message || "Registration successful. Please verify your email with the OTP sent.");
      setOtp("");
      setStep("verification");
    } else {
      showMessage(result.message || "An error occurred during signup", true);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      showMessage("Please enter the verification code", true);
      return;
    }
    setSubmitting(true);
    const result = await verifyEmail(formData.email.trim().toLowerCase(), otp.trim());
    setSubmitting(false);

    if (result.success) {
      showMessage("Signup successful! Please login.");
      setTimeout(() => navigate("/login"), 1500);
    } else {
      showMessage(result.message || "Verification failed", true);
    }
  };

  if (step === "verification") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <h2 className="text-2xl font-bold mb-4">Email Verification</h2>
          <p className="mb-4">
            Please enter the verification code sent to <strong>{formData.email}</strong>. The code expires in 2 minutes.
          </p>

          {message && (
            <div
              className={`mb-4 p-2 text-center rounded ${
                isError ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleVerification}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter verification code"
              className="w-full p-2 border rounded mb-4"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-70"
            >
              {submitting ? "Verifying..." : "Verify Email"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setStep("registration");
              showMessage("");
            }}
            className="mt-4 w-full text-sm text-blue-600 hover:underline"
          >
            Back to registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="flex bg-green-50 shadow-lg rounded-lg overflow-hidden w-3/4 max-h-[80vh] mt-16">
        <div className="w-1/2 bg-blue-500 flex items-center justify-center p-10">
          <img src="/images/account.png" alt="Sign Up Illustration" className="w-full h-auto" />
        </div>
        <div className="w-1/2 p-8 overflow-y-auto">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create an <span className="text-indigo-600">Account</span>
          </h2>

          {message && (
            <div
              className={`mt-4 p-2 text-center rounded ${
                isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-gray-700">User Type</label>
              <select name="userType" className={inputClass} value={formData.userType} onChange={handleChange}>
                {SIGNUP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <input name="name" type="text" placeholder="Name" className={inputClass} value={formData.name} onChange={handleChange} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

            <input name="email" type="email" placeholder="Email address" className={inputClass} value={formData.email} onChange={handleChange} />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

            <input name="password" type="password" autoComplete="new-password" placeholder="Password" className={inputClass} value={formData.password} onChange={handleChange} />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

            <input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm Password" className={inputClass} value={formData.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}

            <input name="contactNo" type="tel" placeholder="Contact Number" className={inputClass} value={formData.contactNo} onChange={handleChange} />
            {errors.contactNo && <p className="text-red-500 text-sm">{errors.contactNo}</p>}

            <label className="block text-gray-700">Date of Birth{isSupplier ? " (optional)" : ""}</label>
            <DatePicker
              selected={formData.dateOfBirth}
              onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
              className={inputClass}
              dateFormat="dd/MM/yyyy"
              maxDate={new Date()}
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={100}
            />
            {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}

            <div>
              <label className="block text-gray-700">Gender</label>
              <select name="gender" className={inputClass} value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
            </div>

            <div>
              <label className="block text-gray-700">Profile Photo (optional)</label>
              <input type="file" name="photo" accept="image/*" className={inputClass} onChange={handleFileChange} />
            </div>

            {needsHospital && (
              <div>
                <label className="block text-gray-700">Hospital</label>
                <select
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={hospitalsLoading || hospitals.length === 0}
                >
                  <option value="">{hospitalsLoading ? "Loading hospitals..." : "Select a hospital"}</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {formData.userType === "Patient" && formData.hospitalName && (
                  <p className="text-xs text-gray-500 mt-1">
                    This account will belong to {formData.hospitalName}. You can register the same email again for another hospital.
                  </p>
                )}
                {errors.hospitalName && <p className="text-red-500 text-sm">{errors.hospitalName}</p>}
              </div>
            )}

            {isDoctor && (
              <>
                <input
                  name="doctorQualification"
                  type="text"
                  placeholder="Qualification"
                  className={inputClass}
                  value={formData.doctorQualification}
                  onChange={handleChange}
                />
                {errors.doctorQualification && <p className="text-red-500 text-sm">{errors.doctorQualification}</p>}

                <input
                  name="doctorSpecialization"
                  type="text"
                  placeholder="Specialization / Department (e.g. Cardiology)"
                  className={inputClass}
                  value={formData.doctorSpecialization}
                  onChange={handleChange}
                />
                {errors.doctorSpecialization && <p className="text-red-500 text-sm">{errors.doctorSpecialization}</p>}

                <div>
                  <label className="block text-gray-700">Upload Qualification Certificate (PDF)</label>
                  <input type="file" name="doctorCertificate" accept="application/pdf" className={inputClass} onChange={handleFileChange} />
                  {errors.doctorCertificate && <p className="text-red-500 text-sm">{errors.doctorCertificate}</p>}
                </div>
              </>
            )}

            {isSupplier && (
              <>
                <input
                  name="companyName"
                  type="text"
                  placeholder="Company Name"
                  className={inputClass}
                  value={formData.companyName}
                  onChange={handleChange}
                />
                {errors.companyName && <p className="text-red-500 text-sm">{errors.companyName}</p>}

                <label className="block text-gray-700">Company Starting Date</label>
                <DatePicker
                  selected={formData.companyStartingDate}
                  onChange={(date) => setFormData({ ...formData, companyStartingDate: date })}
                  className={inputClass}
                  dateFormat="dd/MM/yyyy"
                  maxDate={new Date()}
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                />
                {errors.companyStartingDate && <p className="text-red-500 text-sm">{errors.companyStartingDate}</p>}

                <div>
                  <label className="block text-gray-700">Upload Company License (PDF)</label>
                  <input type="file" name="companyLicense" accept="application/pdf" className={inputClass} onChange={handleFileChange} />
                  {errors.companyLicense && <p className="text-red-500 text-sm">{errors.companyLicense}</p>}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-70"
            >
              {submitting ? "Signing up..." : "Sign Up"}
            </button>
            <p>
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
