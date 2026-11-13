import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiEdit, FiSave, FiX, FiFileText, FiPackage, FiCheck, FiCamera } from "react-icons/fi";
import { MdOutlineSchool, MdOutlineMedicalServices } from "react-icons/md";
import Slidebar from "../../components/Sidebar";
import { getUserProfile, updateUserProfile } from "../../services/authService";
import { getMyPrescriptions, getMyAppointments } from "../../services/appointmentsService";
import { mediaUrl, pickList } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { doctorName } from "../../utils/format";
import PrescriptionActions from "../../components/patient/PrescriptionActions";

const DEFAULT_AVATAR = "/images/avatar-icon.png";

// Fields UserProfileSerializer accepts for update, per role.
const EDITABLE_FIELDS = {
    common: ["name", "contactNo"],
    personal: ["gender", "dateOfBirth"],
    doctor: ["doctorQualification", "doctorSpecialization"],
    supplier: ["companyName", "companyStartingDate"],
};

const card = "bg-white rounded-2xl border border-gray-100 shadow-sm p-6";
const sectionTitle = "text-lg font-semibold text-gray-800 mb-4";
const inputClass = "mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const formatDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

/** One labelled value; shows an input instead while editing (when `input` is given). */
function Field({ icon: Icon, label, value, editing, input, hint, wide }) {
    return (
        <div className={`flex items-start gap-3 ${wide ? "md:col-span-2" : ""}`}>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Icon className="text-blue-600" />
            </div>
            <div className="min-w-0 w-full">
                <p className="text-xs text-gray-500">{label}</p>
                {editing && input ? input : <p className="font-medium text-gray-800 break-words">{value || "Not provided"}</p>}
                {editing && hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            </div>
        </div>
    );
}

Field.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.node,
    editing: PropTypes.bool,
    input: PropTypes.node,
    hint: PropTypes.string,
    wide: PropTypes.bool,
};

/** Same frame as the other portal pages, so loading / error states keep the sidebar. */
function PageFrame({ children }) {
    return (
        <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
            <Slidebar activeTab="profile" />
            <div className="flex-1 p-6 overflow-y-auto">{children}</div>
        </div>
    );
}

PageFrame.propTypes = { children: PropTypes.node };

function Profile() {
    const { user, token, updateUser } = useAuth();

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [saveMessage, setSaveMessage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableData, setEditableData] = useState({});
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [historyError, setHistoryError] = useState(null);

    const userType = user?.userType?.toLowerCase() || null;
    const isDoctor = userType === "doctor";
    const isPatient = userType === "patient";
    const isSupplier = userType === "supplier";

    useEffect(() => {
        if (!token) return undefined;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const result = await getUserProfile(token);
            if (cancelled) return;
            if (result.success && result.data?.user) {
                setUserData(result.data.user);
                setEditableData(result.data.user);
                setError(null);
            } else if (result.status === 404) {
                setError("Profile not found. Please complete your registration.");
            } else {
                setError(result.message || "Failed to load profile");
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    // Patients: medical history (prescriptions) + payment history (from their appointments).
    useEffect(() => {
        if (!token || !isPatient) return undefined;
        let cancelled = false;
        (async () => {
            const [prescRes, apptRes] = await Promise.all([getMyPrescriptions(token), getMyAppointments(token)]);
            if (cancelled) return;
            setPrescriptions(pickList(prescRes, "prescriptions"));
            setAppointments(pickList(apptRes, "appointments"));
            const failed = [prescRes, apptRes].find((r) => !r.success);
            setHistoryError(failed ? failed.message : null);
        })();
        return () => {
            cancelled = true;
        };
    }, [token, isPatient]);

    const payments = useMemo(
        () =>
            appointments
                .flatMap((a) =>
                    (a.payments || []).map((p) => ({
                        key: `${a._id}-${p.paymentId || p.paymentDate}`,
                        id: p.paymentId,
                        amount: Number(p.amount) || 0,
                        status: p.status || "completed",
                        date: p.paymentDate || a.appointmentDate,
                        doctor: a.doctor?.name,
                        department: a.department,
                        appointmentDate: a.acceptedDate || a.appointmentDate,
                    }))
                )
                .sort((x, y) => String(y.date || "").localeCompare(String(x.date || ""))),
        [appointments]
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditableData({ ...editableData, [name]: value });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditableData(userData);
        setPhotoPreview(null);
        setProfilePhoto(null);
        setSaveError(null);
    };

    const handleSaveChanges = async () => {
        setSaveError(null);
        setSaveMessage(null);
        const fields = [
            ...EDITABLE_FIELDS.common,
            ...(isSupplier ? EDITABLE_FIELDS.supplier : EDITABLE_FIELDS.personal),
            ...(isDoctor ? EDITABLE_FIELDS.doctor : []),
        ];
        const formData = new FormData();
        let changed = 0;
        fields.forEach((key) => {
            const value = editableData[key];
            if (value === undefined || value === null || value === "") return;
            if (value === userData[key]) return;
            formData.append(key, value);
            changed += 1;
        });
        if (profilePhoto) {
            formData.append("photo", profilePhoto);
            changed += 1;
        }
        if (changed === 0) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        const result = await updateUserProfile(token, formData);
        setSaving(false);

        if (result.success && result.data?.user) {
            const updated = result.data.user;
            setUserData(updated);
            setEditableData(updated);
            setIsEditing(false);
            setPhotoPreview(null);
            setProfilePhoto(null);
            setSaveMessage(result.message || "Profile updated successfully");
            updateUser({ name: updated.name, contactNo: updated.contactNo });
        } else if (result.status === 403) {
            setSaveError("You don't have permission to update this profile");
        } else {
            setSaveError(result.message || "Failed to update profile");
        }
    };

    if (loading) {
        return (
            <PageFrame>
                <p className="text-gray-500 py-16 text-center">Loading profile...</p>
            </PageFrame>
        );
    }

    if (error || !userData) {
        return (
            <PageFrame>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-red-700">{error || "No profile data found"}</p>
                </div>
            </PageFrame>
        );
    }

    const photoSrc = photoPreview || mediaUrl(userData.photo) || DEFAULT_AVATAR;
    const memberSince = formatDate(userData.created_at || userData.activated_at);
    const accountStatus =
        userData.isApproved === false ? "Pending approval" : userData.is_active === false ? "Inactive" : "Active";

    return (
        <PageFrame>
            <div className="space-y-6">
                {/* Header card */}
                <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center gap-6">
                    <div className="relative shrink-0 self-start md:self-center">
                        <img
                            src={photoSrc}
                            alt={userData.name || "User"}
                            className="w-28 h-28 rounded-full object-cover border-4 border-white/70 bg-white"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_AVATAR;
                            }}
                        />
                        {isEditing && (
                            <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center shadow cursor-pointer" title="Change photo">
                                <FiCamera />
                                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                            </label>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold">{userData.name || "No Name"}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                            <span className="px-3 py-0.5 rounded-full bg-white/25 capitalize">{userType}</span>
                            {userData.hospitalName && (
                                <span className="px-3 py-0.5 rounded-full bg-white/25">🏥 {userData.hospitalName}</span>
                            )}
                            {isSupplier && userData.companyName && (
                                <span className="px-3 py-0.5 rounded-full bg-white/25">🏢 {userData.companyName}</span>
                            )}
                        </div>
                        <p className="text-sm text-white/85 mt-2 break-all">{userData.email}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center bg-white text-blue-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-blue-50 transition"
                            >
                                <FiEdit className="mr-2" /> Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={saving}
                                    className="flex items-center bg-white text-green-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-green-50 transition disabled:opacity-60"
                                >
                                    <FiSave className="mr-2" /> {saving ? "Saving..." : "Save"}
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="flex items-center bg-white/20 text-white px-4 py-2 rounded-xl font-medium hover:bg-white/30 transition"
                                >
                                    <FiX className="mr-2" /> Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {saveError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <p className="text-red-700">{saveError}</p>
                    </div>
                )}
                {saveMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                        <p className="text-green-700">{saveMessage}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal information */}
                    <div className={`${card} lg:col-span-2`}>
                        <h2 className={sectionTitle}>Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field
                                icon={FiUser}
                                label="Full Name"
                                value={userData.name}
                                editing={isEditing}
                                input={<input type="text" name="name" value={editableData.name || ""} onChange={handleInputChange} className={inputClass} />}
                            />
                            <Field icon={FiMail} label="Email" value={userData.email} editing={isEditing} hint="Email cannot be changed" />
                            <Field
                                icon={FiPhone}
                                label="Phone Number"
                                value={userData.contactNo}
                                editing={isEditing}
                                input={<input type="tel" name="contactNo" value={editableData.contactNo || ""} onChange={handleInputChange} className={inputClass} />}
                            />
                            {!isSupplier && (
                                <Field
                                    icon={FiCalendar}
                                    label="Date of Birth"
                                    value={userData.dateOfBirth}
                                    editing={isEditing}
                                    input={<input type="date" name="dateOfBirth" value={editableData.dateOfBirth || ""} onChange={handleInputChange} className={inputClass} />}
                                />
                            )}
                            {!isSupplier && (
                                <Field
                                    icon={FiUser}
                                    label="Gender"
                                    value={userData.gender}
                                    editing={isEditing}
                                    input={
                                        <select name="gender" value={editableData.gender || ""} onChange={handleInputChange} className={inputClass}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    }
                                />
                            )}
                            {userData.address && <Field icon={FiMapPin} label="Address" value={userData.address} wide />}
                        </div>
                    </div>

                    {/* Account */}
                    <div className={card}>
                        <h2 className={sectionTitle}>Account</h2>
                        <div className="space-y-5">
                            {!isSupplier && (
                                <Field icon={FiMapPin} label="Hospital" value={userData.hospitalName} editing={isEditing} hint="Chosen at login — cannot be changed" />
                            )}
                            <Field icon={FiCheck} label="Status" value={accountStatus} />
                            <Field icon={FiCalendar} label="Member since" value={memberSince} />
                            {isPatient && (
                                <Field icon={FiFileText} label="Visits / Prescriptions" value={`${appointments.length} / ${prescriptions.length}`} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Doctor: professional information */}
                {isDoctor && (
                    <div className={card}>
                        <h2 className={sectionTitle}>Professional Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field
                                icon={MdOutlineSchool}
                                label="Qualification"
                                value={userData.doctorQualification}
                                editing={isEditing}
                                input={<input type="text" name="doctorQualification" value={editableData.doctorQualification || ""} onChange={handleInputChange} className={inputClass} />}
                            />
                            <Field
                                icon={MdOutlineMedicalServices}
                                label="Specialization"
                                value={userData.doctorSpecialization}
                                editing={isEditing}
                                input={<input type="text" name="doctorSpecialization" value={editableData.doctorSpecialization || ""} onChange={handleInputChange} className={inputClass} />}
                            />
                        </div>
                    </div>
                )}

                {/* Supplier: company information */}
                {isSupplier && (
                    <div className={card}>
                        <h2 className={sectionTitle}>Company Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field
                                icon={FiPackage}
                                label="Company Name"
                                value={userData.companyName}
                                editing={isEditing}
                                input={<input type="text" name="companyName" value={editableData.companyName || ""} onChange={handleInputChange} className={inputClass} />}
                            />
                            <Field
                                icon={FiCalendar}
                                label="Company Since"
                                value={userData.companyStartingDate}
                                editing={isEditing}
                                input={<input type="date" name="companyStartingDate" value={editableData.companyStartingDate || ""} onChange={handleInputChange} className={inputClass} />}
                            />
                            <Field
                                icon={FiFileText}
                                label="Company License"
                                value={
                                    userData.companyLicense ? (
                                        <a href={mediaUrl(userData.companyLicense)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            View document
                                        </a>
                                    ) : null
                                }
                            />
                        </div>
                    </div>
                )}

                {/* Patient: medical history + payment history */}
                {isPatient && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className={card}>
                            <h2 className={sectionTitle}>Medical History</h2>
                            {historyError && <p className="text-sm text-red-700 mb-3">{historyError}</p>}
                            {prescriptions.length === 0 ? (
                                <p className="text-sm text-gray-500">No prescriptions on record yet.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {prescriptions.map((p) => (
                                        <li key={p._id} className="py-3">
                                            <div className="flex justify-between gap-4">
                                                <p className="font-medium text-gray-800">
                                                    {doctorName(p.doctor?.name)} · <span className="text-gray-500">{p.department}</span>
                                                </p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(p.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                💊 {(p.medicines || []).map((m) => [m.name, m.dosage, m.duration].filter(Boolean).join(" ")).join(", ") || "No medicines"}
                                            </p>
                                            {p.suggestions && <p className="text-sm text-gray-500 mt-1">📝 {p.suggestions}</p>}
                                            <PrescriptionActions prescriptionId={p._id} showEmail={false} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className={card}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
                                <span className="text-sm text-gray-500">
                                    Total paid: <span className="font-semibold text-green-700">₹{totalPaid.toLocaleString("en-IN")}</span>
                                </span>
                            </div>
                            {payments.length === 0 ? (
                                <p className="text-sm text-gray-500">No payments yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                                <th className="py-2 pr-3 font-medium">Date</th>
                                                <th className="py-2 pr-3 font-medium">For</th>
                                                <th className="py-2 pr-3 font-medium">Amount</th>
                                                <th className="py-2 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p) => (
                                                <tr key={p.key} className="border-b border-gray-100 last:border-0">
                                                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{formatDate(p.date)}</td>
                                                    <td className="py-2 pr-3 text-gray-800">
                                                        {doctorName(p.doctor)} · {p.department}
                                                        <span className="block text-xs text-gray-400">Appointment {p.appointmentDate}</span>
                                                    </td>
                                                    <td className="py-2 pr-3 font-semibold text-gray-800">₹{p.amount.toLocaleString("en-IN")}</td>
                                                    <td className="py-2">
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 capitalize">
                                                            {p.status === "completed" ? "Paid" : p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PageFrame>
    );
}

export default Profile;
