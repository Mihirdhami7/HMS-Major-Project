import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiUser, FiMail, FiLock, FiPhone, FiCalendar, FiHome, FiAward, FiActivity, FiBriefcase } from "react-icons/fi";
import { registerUser, verifyEmail } from "../../services/authService";
import { useHospitals } from "../../hooks/useHospitals";
import AuthLayout from "../../components/auth/AuthLayout";
import { IconInput, PasswordInput, IconSelect, FieldShell, AuthMessage } from "../../components/auth/AuthFields";

// Roles offered on public signup. Hospital admins are added only by the super admin (email link);
// suppliers can sign up here or be added by the super admin.
const SIGNUP_ROLES = [
  { key: "Patient", icon: "🧑" },
  { key: "Doctor", icon: "🩺" },
  { key: "Supplier", icon: "🚚" },
];

const dateInputClass =
  "w-full py-2.5 pl-10 pr-3 rounded-xl border text-sm bg-white dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500";
const fileInputClass =
  "block w-full text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl p-1.5 " +
  "file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100";

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

function Section({ title, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}

Section.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node };

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

  const isDoctor = formData.userType === "Doctor";
  const isSupplier = formData.userType === "Supplier";
  const needsHospital = !isSupplier; // suppliers are not tied to a hospital

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const handleChange = (e) => setField(e.target.name, e.target.value);
  const handleFileChange = (e) => setField(e.target.name, e.target.files[0] || null);

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

    // Date of birth + gender are required by the backend for Patient / Doctor (optional for suppliers).
    if (!formData.dateOfBirth) {
      if (!isSupplier) newErrors.dateOfBirth = "Date of Birth is required";
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
    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }

    if (needsHospital && !formData.hospitalName.trim()) {
      newErrors.hospitalName = "Hospital is required";
    }

    if (isSupplier) {
      if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
      if (!formData.companyStartingDate) newErrors.companyStartingDate = "Company starting date is required";
      if (!formData.companyLicense) newErrors.companyLicense = "Company license upload is required";
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
    if (isSupplier) {
      put("companyName", formData.companyName.trim());
      put("companyStartingDate", toIsoDate(formData.companyStartingDate));
      put("companyLicense", formData.companyLicense);
    }
    if (isDoctor) {
      put("doctorQualification", formData.doctorQualification.trim());
      put("doctorSpecialization", formData.doctorSpecialization.trim());
      put("doctorCertificate", formData.doctorCertificate);
    }
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showMessage("");
    if (!validateForm()) {
      showMessage("Please fix the highlighted fields.", true);
      return;
    }

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

  // ---------------------------------------------------------------- step 2: email code
  if (step === "verification") {
    return (
      <AuthLayout
        title="Check your email ✉️"
        subtitle={<>We sent a 6-digit code to <b className="text-gray-700 dark:text-gray-200">{formData.email}</b>. It expires in 2 minutes.</>}
        footer={
          <button type="button" onClick={() => { setStep("registration"); showMessage(""); }} className="text-blue-600 hover:text-blue-800 font-semibold">
            ← Back to registration
          </button>
        }
      >
        {message && <AuthMessage tone={isError ? "error" : "info"}>{message}</AuthMessage>}
        <form onSubmit={handleVerification} className="space-y-5">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            aria-label="Verification code"
            className="w-full text-center text-2xl tracking-[0.6em] font-mono py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-xl font-semibold shadow-sm hover:opacity-95 disabled:opacity-70"
          >
            {submitting ? "Verifying..." : "Verify email"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  // ---------------------------------------------------------------- step 1: details
  return (
    <AuthLayout
      wide
      title="Create your account"
      subtitle="Join EasyTreat as a patient, a doctor or a supplier."
      footer={<>Already have an account?{" "}<Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold">Log in</Link></>}
    >
      {message && <AuthMessage tone={isError ? "error" : "success"}>{message}</AuthMessage>}

      <form className="space-y-7" onSubmit={handleSubmit} noValidate>
        {/* Role */}
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am a</p>
          <div role="radiogroup" aria-label="I am a" className="grid grid-cols-3 gap-2">
            {SIGNUP_ROLES.map((r) => {
              const active = formData.userType === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-role={r.key}
                  onClick={() => setField("userType", r.key)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-sm font-medium transition ${active
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-200"
                    : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                >
                  <span className="text-lg" aria-hidden>{r.icon}</span>
                  {r.key}
                </button>
              );
            })}
          </div>
        </div>

        <Section title="Account">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <IconInput id="name" name="name" label="Full name" icon={FiUser} placeholder="Your name"
              value={formData.name} onChange={handleChange} error={errors.name} />
            <IconInput id="email" name="email" type="email" label="Email address" icon={FiMail} placeholder="you@example.com"
              autoComplete="email" value={formData.email} onChange={handleChange} error={errors.email} />
            <PasswordInput id="password" name="password" label="Password" icon={FiLock} autoComplete="new-password"
              value={formData.password} onChange={handleChange} error={errors.password}
              hint="8+ characters with upper & lower case, a number and a symbol" />
            <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirm password" icon={FiLock} autoComplete="new-password"
              value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
          </div>
        </Section>

        <Section title="Personal details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <IconInput id="contactNo" name="contactNo" type="tel" label="Contact number" icon={FiPhone} placeholder="10 digits"
              value={formData.contactNo} onChange={handleChange} error={errors.contactNo} />
            <FieldShell label={isSupplier ? "Date of birth (optional)" : "Date of birth"} htmlFor="dateOfBirth" icon={FiCalendar} error={errors.dateOfBirth}>
              <DatePicker
                id="dateOfBirth"
                selected={formData.dateOfBirth}
                onChange={(date) => setField("dateOfBirth", date)}
                className={`${dateInputClass} ${errors.dateOfBirth ? "!border-red-400 !bg-red-50" : ""}`}
                wrapperClassName="w-full"
                placeholderText="dd/mm/yyyy"
                dateFormat="dd/MM/yyyy"
                maxDate={new Date()}
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={100}
              />
            </FieldShell>
            <IconSelect id="gender" name="gender" label="Gender" icon={FiUser} value={formData.gender} onChange={handleChange} error={errors.gender}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </IconSelect>
            <FieldShell label="Profile photo (optional)" htmlFor="photo">
              <input id="photo" type="file" name="photo" accept="image/*" className={fileInputClass} onChange={handleFileChange} />
            </FieldShell>
          </div>
        </Section>

        {needsHospital && (
        <Section title="Hospital">
          <IconSelect
            id="hospitalName" name="hospitalName" label="Hospital" icon={FiHome}
            value={formData.hospitalName} onChange={handleChange} error={errors.hospitalName}
            disabled={hospitalsLoading || hospitals.length === 0}
            hint={formData.userType === "Patient" && formData.hospitalName
              ? `This account will belong to ${formData.hospitalName}. You can register the same email again for another hospital.`
              : null}
          >
            <option value="">{hospitalsLoading ? "Loading hospitals..." : "Select a hospital"}</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.name}>{h.name}</option>
            ))}
          </IconSelect>
        </Section>
        )}

        {isSupplier && (
          <Section title="Company">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <IconInput id="companyName" name="companyName" label="Company name" icon={FiBriefcase}
                placeholder="e.g. MedPlus Supply" value={formData.companyName} onChange={handleChange} error={errors.companyName}
                hint="Use the exact name hospitals know you by — your products and orders are linked to it." />
              <FieldShell label="Company starting date" htmlFor="companyStartingDate" icon={FiCalendar} error={errors.companyStartingDate}>
                <DatePicker
                  id="companyStartingDate"
                  selected={formData.companyStartingDate}
                  onChange={(date) => setField("companyStartingDate", date)}
                  className={`${dateInputClass} ${errors.companyStartingDate ? "!border-red-400 !bg-red-50" : ""}`}
                  wrapperClassName="w-full"
                  placeholderText="dd/mm/yyyy"
                  dateFormat="dd/MM/yyyy"
                  maxDate={new Date()}
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                />
              </FieldShell>
            </div>
            <FieldShell label="Company license (PDF)" htmlFor="companyLicense" error={errors.companyLicense}>
              <input id="companyLicense" type="file" name="companyLicense" accept="application/pdf" className={fileInputClass} onChange={handleFileChange} />
            </FieldShell>
          </Section>
        )}

        {isDoctor && (
          <Section title="Doctor details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <IconInput id="doctorQualification" name="doctorQualification" label="Qualification" icon={FiAward}
                placeholder="e.g. MBBS, MD" value={formData.doctorQualification} onChange={handleChange} error={errors.doctorQualification} />
              <IconInput id="doctorSpecialization" name="doctorSpecialization" label="Specialization / department" icon={FiActivity}
                placeholder="e.g. Cardiology" value={formData.doctorSpecialization} onChange={handleChange} error={errors.doctorSpecialization} />
            </div>
            <FieldShell label="Qualification certificate (PDF)" htmlFor="doctorCertificate" error={errors.doctorCertificate}>
              <input id="doctorCertificate" type="file" name="doctorCertificate" accept="application/pdf" className={fileInputClass} onChange={handleFileChange} />
            </FieldShell>
          </Section>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-xl font-semibold shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
