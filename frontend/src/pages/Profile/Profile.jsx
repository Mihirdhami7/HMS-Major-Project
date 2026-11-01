import { useState, useEffect } from "react";
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiEdit, FiSave, FiX , FiFileText, FiPackage, FiCheck} from "react-icons/fi";
import { MdOutlineSchool, MdOutlineMedicalServices } from "react-icons/md";
import Slidebar from "../../components/Sidebar";
import { getUserProfile, updateUserProfile } from "../../services/authService";
import { getMyPrescriptions } from "../../services/appointmentsService";
import { mediaUrl, pickList } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_AVATAR = "/images/avatar-icon.png";

// Fields UserProfileSerializer accepts for update, per role.
const EDITABLE_FIELDS = {
    common: ["name", "contactNo"],
    personal: ["gender", "dateOfBirth"],
    doctor: ["doctorQualification", "doctorSpecialization"],
    supplier: ["companyName", "companyStartingDate"],
};

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

    // Patients: real medical history = their prescriptions.
    useEffect(() => {
        if (!token || !isPatient) return undefined;
        let cancelled = false;
        (async () => {
            const result = await getMyPrescriptions(token);
            if (cancelled) return;
            setPrescriptions(pickList(result, "prescriptions"));
            setHistoryError(result.success ? null : result.message);
        })();
        return () => {
            cancelled = true;
        };
    }, [token, isPatient]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditableData({
            ...editableData,
            [name]: value
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
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
            updateUser({ name: updated.name });
        } else if (result.status === 403) {
            setSaveError("You don't have permission to update this profile");
        } else {
            setSaveError(result.message || "Failed to update profile");
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-blue-50">
                <div className="text-lg text-blue-800">Loading profile...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50">
                <div className="text-lg text-red-800">{error}</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex h-screen items-center justify-center bg-yellow-50">
                <div className="text-lg text-yellow-800">No profile data found</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-blue-50 overflow-hidden">
            <Slidebar activeTab="profile" />
            <div className="flex flex-col flex-1 p-8 overflow-auto mt-14">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-blue-800">My Profile</h2>
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
                        >
                            <FiEdit className="mr-2" /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <button
                                onClick={handleSaveChanges}
                                disabled={saving}
                                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
                            >
                                <FiSave className="mr-2" /> {saving ? "Saving..." : "Save"}
                            </button>
                            <button 
                                onClick={cancelEdit}
                                className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
                            >
                                <FiX className="mr-2" /> Cancel
                            </button>
                        </div>
                    )}
                </div>

                {saveError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {saveError}
                    </div>
                )}
                {saveMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        {saveMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Photo Card */}
                    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-200 mb-4">
                            <img
                                src={
                                    photoPreview || 
                                    mediaUrl(userData.photo) ||
                                    DEFAULT_AVATAR
                                }
                                alt={userData.name || "User"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = DEFAULT_AVATAR;
                                }}
                            />
                        </div>
                        {isEditing && (
                            <input
                                type="file"
                                onChange={handlePhotoChange}
                                accept="image/*"
                                className="mt-2"
                            />
                        )}
                        <h3 className="text-xl font-semibold">{userData.name || 'No Name'}</h3>
                        <p className="text-gray-600 capitalize">{userType}</p>
                    </div>

                    {/* Personal Information */}
                    <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-semibold text-blue-800 mb-4 pb-2 border-b border-blue-100">
                            Personal Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start space-x-3">
                                <FiUser className="text-blue-600 mt-1" />
                                <div>
                                    <p className="text-gray-500 text-sm">Full Name</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="name"
                                            value={editableData.name || ''}
                                            onChange={handleInputChange}
                                            className="border p-2 rounded w-full shadow-sm"
                                        />
                                    ) : (
                                        <p className="font-medium">{userData.name || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <FiMail className="text-blue-600 mt-1" />
                                <div>
                                    <p className="text-gray-500 text-sm">Email</p>
                                    <p className="font-medium">{userData.email}</p>
                                    {isEditing && (
                                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <FiPhone className="text-blue-600 mt-1" />
                                <div>
                                    <p className="text-gray-500 text-sm">Phone Number</p>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="contactNo"
                                            value={editableData.contactNo || ''}
                                            onChange={handleInputChange}
                                            className="border p-2 rounded w-full shadow-sm"
                                        />
                                    ) : (
                                        <p className="font-medium">{userData.contactNo || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <FiCalendar className="text-blue-600 mt-1" />
                                <div>
                                    <p className="text-gray-500 text-sm">Date of Birth</p>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            name="dateOfBirth"
                                            value={editableData.dateOfBirth || ''}
                                            onChange={handleInputChange}
                                            className="border p-2 rounded w-full shadow-sm"
                                        />
                                    ) : (
                                        <p className="font-medium">{userData.dateOfBirth || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <FiUser className="text-blue-600 mt-1" />
                                <div>
                                    <p className="text-gray-500 text-sm">Gender</p>
                                    {isEditing ? (
                                        <select
                                            name="gender"
                                            value={editableData.gender || ''}
                                            onChange={handleInputChange}
                                            className="border p-2 rounded w-full shadow-sm"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    ) : (
                                        <p className="font-medium">{userData.gender || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3 md:col-span-2">
                                <FiMapPin className="text-blue-600 mt-1" />
                                <div className="w-full">
                                    <p className="text-gray-500 text-sm">Hospital Name</p>
                                    <p className="font-medium">{userData.hospitalName || 'Not applicable'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Professional Information (Doctor Only) */}
                    {isDoctor && (
                        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-semibold text-blue-800 mb-4 pb-2 border-b border-blue-100">
                                Professional Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Qualification */}
                                <div className="flex items-start space-x-3">
                                    <MdOutlineSchool className="text-blue-600 mt-1 text-xl" />
                                    <div className="w-full">
                                        <p className="text-gray-500 text-sm">Qualification</p>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                name="doctorQualification"
                                                value={editableData.doctorQualification || ''}
                                                onChange={handleInputChange}
                                                className="border p-2 rounded w-full shadow-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{userData.doctorQualification || 'Not provided'}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Specialization */}
                                <div className="flex items-start space-x-3">
                                    <MdOutlineMedicalServices className="text-blue-600 mt-1 text-xl" />
                                    <div className="w-full">
                                        <p className="text-gray-500 text-sm">Specialization</p>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                name="doctorSpecialization"
                                                value={editableData.doctorSpecialization || ''}
                                                onChange={handleInputChange}
                                                className="border p-2 rounded w-full shadow-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{userData.doctorSpecialization || 'Not provided'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Medical History (Patient Only) */}
                    {userType === "patient" && (
                        <div className="md:col-span-3 bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-semibold text-blue-800 mb-4 pb-2 border-b border-blue-100">
                                Medical History
                            </h3>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white">
                                    <thead>
                                        <tr>
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">Date</th>
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">Doctor</th>
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">Department</th>
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">Medicines</th>
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">Advice</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prescriptions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-4 px-4 text-sm text-gray-500 text-center">
                                                    {historyError || "No prescriptions on record yet."}
                                                </td>
                                            </tr>
                                        ) : (
                                            prescriptions.map((p) => (
                                                <tr key={p._id} className="border-b">
                                                    <td className="py-3 px-4 text-sm">
                                                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">Dr. {p.doctor?.name}</td>
                                                    <td className="py-3 px-4 text-sm">{p.department}</td>
                                                    <td className="py-3 px-4 text-sm">
                                                        {(p.medicines || []).map((m) => m.name).join(", ") || "-"}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm whitespace-pre-wrap">{p.suggestions || "-"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* Supplier Information (Supplier Only) */}
                    {userType === "supplier" && (
                        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-semibold text-blue-800 mb-4 pb-2 border-b border-blue-100">
                                Supplier Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Company Name */}
                                <div className="flex items-start space-x-3">
                                    <FiPackage className="text-blue-600 mt-1 text-xl" />
                                    <div className="w-full">
                                        <p className="text-gray-500 text-sm">Company Name</p>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={editableData.companyName || ''}
                                                onChange={handleInputChange}
                                                className="border p-2 rounded w-full shadow-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{userData.companyName || 'Not provided'}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Company License */}
                                <div className="flex items-start space-x-3">
                                    <FiFileText className="text-blue-600 mt-1 text-xl" />
                                    <div className="w-full">
                                        <p className="text-gray-500 text-sm">Company License</p>
                                        {userData.companyLicense ? (
                                            <a
                                                href={mediaUrl(userData.companyLicense)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-blue-600 hover:underline"
                                            >
                                                View document
                                            </a>
                                        ) : (
                                            <p className="font-medium">Not provided</p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* License Number */}
                                <div className="flex items-start space-x-3">
                                    <FiCheck className="text-blue-600 mt-1 text-xl" />
                                    <div className="w-full">
                                        <p className="text-gray-500 text-sm">Account Status</p>
                                        <p className="font-medium">
                                            {userData.isApproved === false ? "Pending approval" : userData.is_active === false ? "Inactive" : "Active"}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Supplier Since */}
                                <div className="flex items-start space-x-3">
                                    <FiCalendar className="text-blue-600 mt-1 text-xl" />
                                    <div className="w-full">
                                        <p className="text-gray-500 text-sm">Company Since</p>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                name="companyStartingDate"
                                                value={editableData.companyStartingDate || ''}
                                                onChange={handleInputChange}
                                                className="border p-2 rounded w-full shadow-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{userData.companyStartingDate || 'Not provided'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default Profile;