import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiEdit, FiSave, FiX } from "react-icons/fi";
import { MdOutlineSchool, MdOutlineMedicalServices } from "react-icons/md";
import Slidebar from "../pages/Slidebar";
import axios from "axios";

function UserProfile() {
    const navigate = useNavigate();
    const { email } = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableData, setEditableData] = useState({});
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Get and normalize user type from localStorage
    const storedUserType = localStorage.getItem("userType");
    const userType = storedUserType ? storedUserType.toLowerCase() : null;
    const isDoctor = userType === "doctor";

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem("authToken");
                
                if (!token || !email || !userType) {
                    console.log("Missing required data:", { token, email, userType });
                    navigate("/login");
                    return;
                }

                console.log(`Fetching ${userType} profile for: ${email}`);

                const response = await axios.get(
                    `http://127.0.0.1:8000/api/profile/${userType}/${email}/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 200) {
                    console.log("Profile data received:", response.data);
                    setUserData(response.data);
                    setEditableData(response.data);
                }
            } catch (err) {
                console.error("Full error details:", err);
                setError(`Error fetching profile: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [navigate, email, userType]);

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

    const handleSaveChanges = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");

            if (!token) {
                navigate("/login");
                return;
            }

            const formData = new FormData();
            
            // Add all editable fields to formData except protected ones
            Object.entries(editableData).forEach(([key, value]) => {
                if (value && !['email', '_id', 'userType', 'hpassword'].includes(key)) {
                    // Handle doctor-specific fields
                    if (isDoctor && ['doctorQualification', 'doctorSpecialization'].includes(key)) {
                        formData.append(key, value);
                    }
                    // Handle common fields
                    else if (!key.startsWith('doctor')) {
                        formData.append(key, value);
                    }
                }
            });
            
            if (profilePhoto) {
                formData.append("profilePhoto", profilePhoto);
            }

            formData.append("email", email);
            
            const response = await axios.put(`http://127.0.0.1:8000/api/profile/update/`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            
            if (response.status === 200) {
                setUserData(response.data);
                setEditableData(response.data);
                setIsEditing(false);
                setPhotoPreview(null);
                alert("Profile updated successfully");
            }
        } catch (err) {
            console.error("Update error:", err);
            setError("Error updating profile: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditableData(userData);
        setPhotoPreview(null);
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
            <Slidebar userType={userType} activeTab="profile" setActiveTab={() => {}} />
            <div className="flex flex-col flex-1 p-8 overflow-auto">
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
                                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
                            >
                                <FiSave className="mr-2" /> Save
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Photo Card */}
                    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-200 mb-4">
                            <img
                                src={photoPreview || userData.photo || "/default-avatar.png"}
                                alt={userData.name}
                                className="w-full h-full object-cover"
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
                        <p className="text-gray-600">{userType}</p>
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
                                        <p className="font-medium">{userData.contactNo}</p>
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
                                        <p className="font-medium">{userData.dateOfBirth}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3 md:col-span-2">
                                <FiMapPin className="text-blue-600 mt-1" />
                                <div className="w-full">
                                    <p className="text-gray-500 text-sm">Address</p>
                                    {isEditing ? (
                                        <textarea
                                            name="address"
                                            value={editableData.address || ""}
                                            onChange={handleInputChange}
                                            className="border p-2 rounded w-full shadow-sm"
                                            rows="2"
                                        />
                                    ) : (
                                        <p className="font-medium">{userData.address}</p>
                                    )}
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
                    {userType === "Patient" && (
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
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">Diagnosis</th>
                                            <th className="py-3 px-4 bg-blue-50 text-left text-sm font-semibold text-blue-800">View Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Sample data - would be fetched from the backend */}
                                        <tr className="border-b">
                                            <td className="py-3 px-4 text-sm">Feb 20, 2025</td>
                                            <td className="py-3 px-4 text-sm">Dr. Sarah Johnson</td>
                                            <td className="py-3 px-4 text-sm">Cardiology</td>
                                            <td className="py-3 px-4 text-sm">Hypertension</td>
                                            <td className="py-3 px-4 text-sm">
                                                <button className="text-blue-600 hover:underline">View</button>
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="py-3 px-4 text-sm">Jan 15, 2025</td>
                                            <td className="py-3 px-4 text-sm">Dr. Michael Chen</td>
                                            <td className="py-3 px-4 text-sm">Orthopedic</td>
                                            <td className="py-3 px-4 text-sm">Ankle Sprain</td>
                                            <td className="py-3 px-4 text-sm">
                                                <button className="text-blue-600 hover:underline">View</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserProfile;