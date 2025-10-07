import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiCheck, FiX, FiRefreshCw} from "react-icons/fi";
import { MdMedicalServices } from "react-icons/md";
import Slidebar from "../../pages/Slidebar";
import axios from "axios";

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [pendingDoctors, setPendingDoctors] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");



  // Form data states
  const [editData, setEditData] = useState({
    name: "",
    Description: "",
    roles: []
  });

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    Description: "",
    roles: []
  });


  // Available roles for doctors
  const availableRoles = [
    "Department Head",
    "Senior Consultant",
    "Consultant",
    "Resident Doctor",
    "Specialist"
  ];
  const handleRefresh = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Refresh all data
      await fetchDepartments();
      await fetchPendingDoctors();
      
      // If a department is selected, refresh its doctors too
      if (selectedDepartment) {
        await fetchDoctorsByDepartment(selectedDepartment._id);
      }
      
      setSuccess("Data refreshed successfully");
    } catch (error) {
      setError("Failed to refresh data");
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };


  // Fetch hospital and departments on component mount
  useEffect(() => {
    fetchDepartments();
    fetchPendingDoctors();
  }, []);

  // Fetch doctors and patients when department is selected
  useEffect(() => {
    if (selectedDepartment) {
      fetchDoctorsByDepartment(selectedDepartment._id);
  
    }
  }, [selectedDepartment]);

  // const getCertificateUrl = (email, certificateFile) => {
  //   if (!email || !certificateFile) return null;
  //   return `http://localhost:8000/media/doctor_certificates/${email}/${certificateFile}`;
  // };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      
      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";
      if (!hospitalName) return; 


      const sessionTd = sessionStorage.getItem("session_Id");
      if (!sessionTd) return; // Ensure session ID is available


      const response = await axios.get(`http://localhost:8000/api/hospitals/get_hospital_departments/${hospitalName}`, {
        headers: { 
          "Authorization": sessionStorage.getItem("session_Id") 
        }
      });

      console.log("API Response:", response.data);

      if (response.data.status === "success" && Array.isArray(response.data.departments)) 
      {
        console.log("Departments:", response.data.departments);
        setDepartments(response.data.departments);
      }
      else {
        console.error("Invalid departments response:", response.data);
        setDepartments([]); // Set to empty array if no departments found
      }


    } catch (error) {
      setError("Failed to fetch departments");
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };




  const fetchDoctorsByDepartment = async (departmentId) => {
    try {
      setLoading(true);
      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";
      if (!hospitalName) return;
      const response = await axios.get(`http://localhost:8000/api/hospitals/get_hospital_doctors/${departmentId}/${hospitalName}`, {
        headers: {
          "Authorization": sessionStorage.getItem("session_Id")
        }
      });
      setDoctors(response.data.doctors);
    } catch (error) {
      setError("Failed to fetch doctors");
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setEditData({
      name: department.name,
      Description: department.Description,
      roles: department.roles || []
    });
  };

  const handleAddDepartment = async () => {
    try {
      setLoading(true);
      // Get hospital ID from localStorage or context
      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";
      if (!hospitalName) return; // Ensure hospital ID is available
      
      const response = await axios.post(
        "http://localhost:8000/api/add_department/",
        {
          ...newDepartment,
          hospitalName
        },
        {
          headers: {
            "Authorization": sessionStorage.getItem("session_Id")
          }
        }
      );

      setDepartments([...departments, response.data.department]);
      setSuccess("Department added successfully");
      setShowAddDepartment(false);
      setNewDepartment({
        name: "",
        Description: "",
        roles: []
      });
    } catch (error) {
      setError("Failed to add department");
      console.error("Error adding department:", error);
    } finally {
      setLoading(false);
    }
  };






  const handleEditSubmit = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `http://localhost:8000/api/update_department/${selectedDepartment._id}/`,
        {
          name: editData.name,
          Description: editData.Description,
          roles: editData.roles
        },
        {
          headers: {
            "Authorization": sessionStorage.getItem("session_Id")
          }
        }
      );
 
      setDepartments(departments.map(dept =>
        dept._id === selectedDepartment._id ? { ...dept, ...editData } : dept
      ));
      setSelectedDepartment({...selectedDepartment, ...editData});
      setSuccess("Department updated successfully",response);
      setIsEditing(false);
    } catch (error) {
      setError("Failed to update department");
      console.error("Error updating department:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm("Are you sure you want to delete this department? This will also remove all associated doctors")) return;

    try {
      setLoading(true);
      await axios.delete(`http://localhost:8000/api/delete_department/${departmentId}/`, {
        headers: {
          Authorization: sessionStorage.getItem("session_Id")
        }
      });

      setDepartments(departments.filter(dept => dept._id !== departmentId));
      if (selectedDepartment && selectedDepartment._id === departmentId) {
        setSelectedDepartment(null);
      }
      setSuccess("Department deleted successfully");
    } catch (error) {
      setError("Failed to delete department");
      console.error("Error deleting department:", error);
    } finally {
      setLoading(false);
    }
  };

  
  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;

    try {
      setLoading(true);
      await axios.delete(`http://localhost:8000/api/users/delete_doctor/${doctorId}/`, {
        headers: {
          "Authorization": sessionStorage.getItem("session_Id")
        }
      });

      setDoctors(doctors.filter(doc => doc._id !== doctorId));
      setSuccess("Doctor deleted successfully");
    } catch (error) {
      setError("Failed to delete doctor");
      console.error("Error deleting doctor:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleAssignRole = async (doctor) => {
    try {
      setLoading(true);
      
       // Use a simple confirm dialog instead of useState hooks inside a function
      const isAddingHeadRole = !doctor.roles?.includes("Department Head") && 
      window.confirm(`Make ${doctor.name} the Department Head?`);

      // Create a copy of roles
      let updatedRoles = [...(doctor.roles || [])];
      if (isAddingHeadRole) {
        // Add Department Head role
        if (!updatedRoles.includes("Department Head")) {
          updatedRoles.push("Department Head");
        }
      } else if (doctor.roles?.includes("Department Head") && 
                window.confirm(`Remove ${doctor.name} from Department Head role?`)) {
        // Remove Department Head role
        updatedRoles = updatedRoles.filter(role => role !== "Department Head");
      } else {
        // Show role selection dialog
        const availableRolesMsg = (selectedDepartment?.roles || availableRoles)
          .map((r, i) => `${i+1}. ${r}`).join('\n');
        
        const roleInput = prompt(
          `Enter role numbers separated by commas:\n${availableRolesMsg}`,
          (doctor.roles || []).join(', ')
        );
        
        if (roleInput !== null) {
          const selectedRoles = roleInput.split(',')
            .map(r => r.trim())
            .filter(r => (selectedDepartment?.roles || availableRoles).includes(r));
          
          updatedRoles = selectedRoles;
        } else {
          setLoading(false);
          return; // User canceled
        }
      }

      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";
      const response = await axios.put(
        `http://localhost:8000/api/doctors/update_roles_by_email`,
        {
          email: doctor.email,
          roles: updatedRoles,
          hospitalName: hospitalName
        },
        {
          headers: {
            Authorization: sessionStorage.getItem("session_Id")
          }
        }
      );

      // Update the doctor in the local state
      setDoctors(doctors.map(doc => 
        doc.email === doctor.email ? { ...doc, roles: updatedRoles } : doc
      ));
      
      setSuccess("Doctor roles updated successfully", response);
    } catch (error) {
      setError("Failed to update doctor roles");
      console.error("Error updating doctor roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDoctors = async () => {
    try {
      setLoading(true);
      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";
      if (!hospitalName) return;

      const response = await axios.get(`http://localhost:8000/api/users/get_pending_doctors/${hospitalName}`, {
        headers: {
          "Authorization": sessionStorage.getItem("session_Id")
        }
      });

      if (response.data.status === "success" && Array.isArray(response.data.pendingDoctors)) {
        setPendingDoctors(response.data.pendingDoctors);
      } else {
        console.error("Invalid pending doctors response:", response.data);
        setPendingDoctors([]); // Set to empty array if no pending doctors found
      }
    } catch (error) {
      setError("Failed to fetch pending doctors");
      console.error("Error fetching pending doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  // ...existing code...
  const handleApproveDoctor = async (doctor) => {
    try {
      setLoading(true);
      if(!doctor.departmentSelected){
        setError("Please select a department for the doctor before approving.");

        return;
      }
      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";

      // Find the department name from the selected department ID
      const selectedDept = departments.find(dept => dept._id === doctor.departmentSelected);
      if (!selectedDept) {
        setError("Selected department not found");
        return;
      }
      console.log("Approving doctor with data:", { 
        email: doctor.email,
        status: "approved",
        departmentName: selectedDept.name,
        departmentId: doctor.departmentSelected,
        hospitalName: hospitalName
      });

      if (!hospitalName) return; // Ensure hospital ID is available
      if (!doctor.email) return; // Ensure doctor email is available
      

      const response = await axios.post(`http://localhost:8000/api/users/approve_doctor/`,
        { 
          email: doctor.email,
          status: "approved",
          departmentName: selectedDept.name,
          departmentId: doctor.departmentSelected,  // I
          hospitalName: hospitalName,
        },
        {
          headers: {
            "Authorization": sessionStorage.getItem("session_Id")
          }
        }
      );
      console.log("Approval API response:", response.data);
      
       setPendingDoctors(pendingDoctors.filter(d => d.email !== doctor.email));
      setSuccess("Doctor approved successfully");
      
      // Refresh the doctors list if a department is selected
      if (selectedDepartment && selectedDepartment._id === doctor.departmentSelected) {
        fetchDoctorsByDepartment(selectedDepartment._id);
      }
    } catch (error) {
      setError("Failed to approve doctor");
      console.error("Error approving doctor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDoctor = async (doctorEmail) => {
    try {
      if(!window.confirm("Are you sure you want to reject this doctor application?")) {
        return;
      }
      setLoading(true);

      const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";
    
      console.log("Rejecting doctor:", doctorEmail, "from hospital:", hospitalName);
      const response = await axios.post(
        `http://localhost:8000/api/users/reject_doctor/`,
        { 
          email: doctorEmail,
          hospitalName: hospitalName
        },
        {
          headers: {
            "Authorization": sessionStorage.getItem("session_Id")
          }
        }
      );

      
      setPendingDoctors(pendingDoctors.filter(doctor => doctor.email !== doctorEmail));
      fetchPendingDoctors(); // Refresh the pending doctors list
      setSuccess("Doctor rejected successfully", response);
    } catch (error) {
      setError("Failed to reject doctor");
      console.error("Error rejecting doctor:", error);
    } finally {
      setLoading(false);
    }
  };


  

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Slidebar activeTab="department" userType="admin" />

      <div className="flex-1 p-6 overflow-auto mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-blue-700">Department Management</h2>
              <p className="text-green-600 mt-1">{sessionStorage.getItem("hospitalName") || 'Zydus'}</p>
            </div>
            <div className="flex gap-2">
              {/* Add the refresh button here */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                title="Refresh data"
              >
                <FiRefreshCw className={`${loading ? 'animate-spin' : ''} mr-2`} /> Refresh
              </button>
              <button
                onClick={() => setShowAddDepartment(true)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:from-blue-700 hover:to-green-600 transition-all"
              >
                <FiPlus className="mr-2" /> Add Department
              </button>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-700">
                <FiX />
              </button>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess("")} className="text-green-700">
                <FiX />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Departments List */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
              <h3 className="text-xl font-semibold text-blue-600 mb-4">Departments</h3>
              {departments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No departments available. Add a new department to get started.</p>
              ) : (
                <div className="space-y-3">
                  {departments.map(department => (
                    <div
                      key={department._id}
                      onClick={() => handleDepartmentSelect(department)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedDepartment?._id === department._id
                          ? "bg-gradient-to-r from-blue-100 to-green-100 border-l-4 border-blue-500 shadow"
                          : "hover:bg-gray-100 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex justify-between">
                        <h4 className="font-medium text-blue-700">{department.name}</h4>
                        {selectedDepartment?._id === department._id && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDepartment(department._id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
              
                    </div>
                  ))}
                </div>
              )}
            </div>
            

            {/* Department Details and Edit */}
            {selectedDepartment ? (
              <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2 border-t-4 border-green-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-green-600">
                    {selectedDepartment.name} Details
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  >
                    {isEditing ? <FiX size={20} /> : <FiEdit2 size={20} />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department Name
                      </label>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editData.Description}
                        onChange={(e) => setEditData({ ...editData, Description: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Roles
                      </label>
                      <div className="space-y-2 p-3 bg-white rounded-lg border">
                        {availableRoles.map(role => (
                          <label key={role} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editData.roles.includes(role)}
                              onChange={(e) => {
                                const updatedRoles = e.target.checked
                                  ? [...editData.roles, role]
                                  : editData.roles.filter(r => r !== role);
                                setEditData({ ...editData, roles: updatedRoles });
                              }}
                              className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 rounded"
                            />
                            {role}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleEditSubmit}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 rounded-lg hover:from-blue-700 hover:to-green-600 transition-colors flex items-center justify-center"
                    >
                      {loading ? "Saving..." : (
                        <>
                          <FiCheck className="mr-2" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                  
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 mb-2">Description:</h4>
                    <p className="text-gray-600 bg-blue-50 p-4 rounded-lg">{selectedDepartment.Description}</p>
                    <h4 className="font-medium text-gray-700 mb-2">Department Head:</h4>
                    <p className="text-gray-600 bg-blue-50 p-4 rounded-lg">{selectedDepartment.head}</p>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Available Roles:</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedDepartment.roles || []).length > 0 ? (
                          selectedDepartment.roles.map(role => (
                            <span
                              key={role}
                              className="px-3 py-1 bg-gradient-to-r from-blue-100 to-green-100 text-blue-700 rounded-full text-sm"
                            >
                              {role}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No roles defined for this department</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                 {/* Doctor Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-green-600">Department Doctors</h4>
                  </div>

                  <div className="space-y-4">
                  {loading ? (
                    <p className="text-center py-4">Loading doctors...</p>
                  ) : doctors.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No doctors assigned to this department</p>
                  ) : (
                    doctors.map(doctor => (
                      <div
                        key={doctor._id}
                        className="p-4 border rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-blue-600">{doctor.name}</h5>
                            <p className="text-sm text-gray-600">{doctor.email}</p>
                            <p className="text-sm text-gray-600">
                              {doctor.doctorQualification} • {doctor.doctorSpecialization}
                            </p>
                            <p className="text-sm text-green-600 font-semibold">⭐ {doctor.rating || "Not Rated"}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAssignRole(doctor)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                              title="Assign Role"
                            >
                              <MdMedicalServices size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doctor._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                              title="Delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2 border-t-4 border-green-500">
                <h3 className="text-xl font-semibold text-green-600">Select a department to view details</h3>
                <p className="text-gray-500 mt-2">Click on a department from the list to view its details and manage doctors.</p>
              </div>
            )}
          </div>

          
          {/* Add Doctor Approval Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-orange-500 mt-8">
              <h3 className="text-xl font-semibold text-orange-600 mb-4">Doctor Approvals</h3>
              {pendingDoctors.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending doctor approvals</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {pendingDoctors.map(doctor => (
                    <div
                      key={doctor._id}
                      className="p-4 rounded-lg border border-orange-100 bg-orange-50"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <h4 className="font-medium text-blue-700">{doctor.name}</h4>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {doctor.email}</p>
                
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Birth Date:</span> {
                              doctor.birthDate || doctor.dateOfBirth ? 
                              new Date(doctor.birthDate || doctor.dateOfBirth).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric'
                              }) : 
                              'Not provided'
                            }
                          </p>
                          <p className="text-sm text-gray-600"><span className="font-medium">Qualification:</span> {doctor.doctorQualification}</p>
                          <p className="text-sm text-gray-600"><span className="font-medium">Specialization:</span> {doctor.doctorSpecialization}</p>
                          <div className="text-sm text-gray-600 col-span-2">
                            <span className="font-medium">Department:</span>
                            <select
                              className="ml-2 p-1 border rounded text-sm"
                              value={doctor.departmentSelected || ""}
                              onChange={(e) => {
                                // Update the department in the local state
                                setPendingDoctors(
                                  pendingDoctors.map(d => 
                                    d._id === doctor._id 
                                      ? {...d, departmentSelected: e.target.value} 
                                      : d
                                  )
                                );
                              }}
                            >
                              <option value="">Select Department</option>
                              {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {/* {doctor.doctorCertificate && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Certificate:</p>
                            <div className="border rounded p-2 bg-white">
                              <a 
                                href={getCertificateUrl(doctor.email, doctor.doctorCertificate)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                                </svg>
                                View Certificate
                              </a>
                            </div>
                          </div>
                        )} */}
                        
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleRejectDoctor(doctor.email)}
                            className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-sm"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveDoctor(doctor)}
                            disabled={!doctor.departmentSelected}
                            className={`px-3 py-1 ${!doctor.departmentSelected ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600 hover:bg-green-200'} rounded transition-colors text-sm`}
                          >
                            Approve & Assign
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
        
        {/* Add Department Modal */}
        {showAddDepartment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-blue-600 mb-4">Add New Department</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDepartment.Description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, Description: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Roles
                  </label>
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                    {availableRoles.map(role => (
                      <label key={role} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newDepartment.roles.includes(role)}
                          onChange={(e) => {
                            const updatedRoles = e.target.checked
                              ? [...newDepartment.roles, role]
                              : newDepartment.roles.filter(r => r !== role);
                            setNewDepartment({ ...newDepartment, roles: updatedRoles });
                          }}
                          className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 rounded"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowAddDepartment(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDepartment}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:from-blue-700 hover:to-green-600 flex items-center"
                >
                  {loading ? "Adding..." : (
                    <>
                      <FiPlus className="mr-2" /> Add Department
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentManagement;