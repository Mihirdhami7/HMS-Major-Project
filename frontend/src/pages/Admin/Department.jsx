import { useState, useEffect, useCallback } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiCheck, FiX, FiRefreshCw} from "react-icons/fi";
import { MdMedicalServices } from "react-icons/md";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useDepartments } from "../../hooks/useHospitals";
import { pickList } from "../../services/apiClient";
import {
  listPendingDoctors,
  listDoctorsByDepartment,
  approveDoctor,
  rejectDoctor,
  deleteDoctor,
  assignDoctorRoles,
} from "../../services/userService";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../services/hospitalService";

// Doctor roles: one Department Head per department, plus at most one position per doctor.
const HEAD_ROLE = "Department Head";
const POSITIONS = ["Senior Consultant", "Consultant", "Resident Doctor", "Specialist"];
const AVAILABLE_ROLES = [HEAD_ROLE, ...POSITIONS];

const roleBadge = (role) =>
  role === HEAD_ROLE ? "bg-yellow-100 text-yellow-800 border border-yellow-300" : "bg-blue-50 text-blue-700 border border-blue-100";

const DepartmentManagement = () => {
  const { token, user } = useAuth();
  const hospitalName = user?.hospitalName || "";
  const {
    departments,
    hospital,
    loading: departmentsLoading,
    error: departmentsError,
    reload: reloadDepartments,
  } = useDepartments(token, { hospitalName });

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // assign-role dialog
  const [roleDoctor, setRoleDoctor] = useState(null);
  const [roleForm, setRoleForm] = useState({ head: false, position: "" });
  const [roleError, setRoleError] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);

  // Form data states
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    roles: []
  });

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
    roles: []
  });

  const availableRoles = AVAILABLE_ROLES;

  useEffect(() => {
    if (!hospitalName) setError("No hospital is linked to this admin account.");
  }, [hospitalName]);

  useEffect(() => {
    if (departmentsError) setError(departmentsError);
  }, [departmentsError]);

  // Keep the selected department in sync after a reload; default to the first department.
  useEffect(() => {
    setSelectedDepartment((current) => {
      const still = current && departments.find((d) => d.id === current.id);
      return still || departments[0] || null;
    });
  }, [departments]);

  const fetchPendingDoctors = useCallback(async () => {
    if (!token || !hospitalName) return;
    const result = await listPendingDoctors(token, hospitalName);
    if (result.success) {
      setPendingDoctors(pickList(result, "pending_doctors"));
    } else {
      setPendingDoctors([]);
      setError(result.message);
    }
  }, [token, hospitalName]);

  const fetchDoctorsByDepartment = useCallback(async (departmentName) => {
    if (!token || !hospitalName || !departmentName) return;
    setDoctorsLoading(true);
    const result = await listDoctorsByDepartment(token, hospitalName, departmentName);
    if (result.success) {
      setDoctors(pickList(result, "doctors"));
    } else {
      setDoctors([]);
      setError(result.message);
    }
    setDoctorsLoading(false);
  }, [token, hospitalName]);

  useEffect(() => {
    fetchPendingDoctors();
  }, [fetchPendingDoctors]);

  // Fetch doctors when a department is selected
  const selectedName = selectedDepartment?.name;
  useEffect(() => {
    if (selectedName) fetchDoctorsByDepartment(selectedName);
    else setDoctors([]);
  }, [selectedName, fetchDoctorsByDepartment]);

  const handleRefresh = async () => {
    setError("");
    setSuccess("");
    reloadDepartments();
    await fetchPendingDoctors();
    if (selectedDepartment) await fetchDoctorsByDepartment(selectedDepartment.name);
  };

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setIsEditing(false);
    setEditData({
      name: department.name,
      description: department.description || "",
      roles: department.roles || []
    });
  };

  const handleAddDepartment = async () => {
    if (!hospital?.id) {
      setError("Hospital not loaded yet. Please refresh.");
      return;
    }
    if (!newDepartment.name.trim()) {
      setError("Department name is required");
      return;
    }
    setLoading(true);
    setError("");
    const result = await createDepartment(token, hospital.id, {
      name: newDepartment.name.trim(),
      description: newDepartment.description,
      roles: newDepartment.roles,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSuccess("Department added successfully");
    setShowAddDepartment(false);
    setNewDepartment({ name: "", description: "", roles: [] });
    reloadDepartments();
  };

  const handleEditSubmit = async () => {
    if (!hospital?.id || !selectedDepartment) return;
    setLoading(true);
    setError("");
    const result = await updateDepartment(token, hospital.id, selectedDepartment.id, {
      name: editData.name,
      description: editData.description,
      roles: editData.roles,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSelectedDepartment({ ...selectedDepartment, ...editData });
    setSuccess("Department updated successfully");
    setIsEditing(false);
    reloadDepartments();
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm("Are you sure you want to delete this department? It must have no doctors assigned.")) return;
    if (!hospital?.id) return;
    setLoading(true);
    setError("");
    const result = await deleteDepartment(token, hospital.id, departmentId);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    if (selectedDepartment?.id === departmentId) setSelectedDepartment(null);
    setSuccess("Department deleted successfully");
    reloadDepartments();
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;
    setLoading(true);
    setError("");
    const result = await deleteDoctor(token, doctorId);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setDoctors(doctors.filter(doc => doc._id !== doctorId));
    setSuccess("Doctor deleted successfully");
  };

  // positions offered in this department (department's own list, or all positions)
  const departmentPositions = (() => {
    const own = (selectedDepartment?.roles || []).filter((r) => POSITIONS.includes(r));
    return own.length ? own : POSITIONS;
  })();
  const currentHead = doctors.find((d) => (d.roles || []).includes(HEAD_ROLE));

  const openRoleDialog = (doctor) => {
    const roles = doctor.roles || [];
    setRoleDoctor(doctor);
    setRoleForm({ head: roles.includes(HEAD_ROLE), position: roles.find((r) => POSITIONS.includes(r)) || "" });
    setRoleError("");
  };

  const saveRoles = async () => {
    const roles = [roleForm.head ? HEAD_ROLE : null, roleForm.position || null].filter(Boolean);
    setRoleSaving(true);
    setRoleError("");
    const result = await assignDoctorRoles(token, roleDoctor._id, roles);
    setRoleSaving(false);
    if (!result.success) {
      setRoleError(result.message);
      return;
    }
    const saved = result.data?.roles || roles;
    // one head per department: the previous head loses the role
    setDoctors((prev) => prev.map((doc) => {
      if (doc._id === roleDoctor._id) return { ...doc, roles: saved };
      if (roleForm.head) return { ...doc, roles: (doc.roles || []).filter((r) => r !== HEAD_ROLE) };
      return doc;
    }));
    const wasHead = (roleDoctor.roles || []).includes(HEAD_ROLE);
    if (roleForm.head || wasHead) {
      setSelectedDepartment((dep) => dep && ({ ...dep, headOfDepartment: roleForm.head ? roleDoctor.name : "" }));
      reloadDepartments();
    }
    setSuccess(result.data?.message || result.message || "Doctor roles updated successfully");
    setRoleDoctor(null);
  };

  const handleApproveDoctor = async (doctor) => {
    if (!doctor.departmentSelected) {
      setError("Please select a department for the doctor before approving.");
      return;
    }
    const selectedDept = departments.find(dept => dept.id === doctor.departmentSelected);
    if (!selectedDept) {
      setError("Selected department not found");
      return;
    }
    setLoading(true);
    setError("");
    const result = await approveDoctor(token, {
      email: doctor.email,
      hospitalName,
      department: selectedDept.name,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setPendingDoctors(pendingDoctors.filter(d => d.email !== doctor.email));
    setSuccess(result.message || "Doctor approved successfully");
    if (selectedDepartment?.id === selectedDept.id) {
      fetchDoctorsByDepartment(selectedDept.name);
    }
  };

  const handleRejectDoctor = async (doctorEmail) => {
    if (!window.confirm("Are you sure you want to reject this doctor application?")) return;
    setLoading(true);
    setError("");
    const result = await rejectDoctor(token, { email: doctorEmail, hospitalName });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setPendingDoctors(pendingDoctors.filter(doctor => doctor.email !== doctorEmail));
    setSuccess("Doctor rejected successfully");
  };

  const busy = loading || departmentsLoading;

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Slidebar activeTab="department" userType="admin" />

      <div className="flex-1 p-6 overflow-auto mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-blue-700">Department Management</h2>
              <p className="text-green-600 mt-1">{hospitalName || 'No hospital linked'}</p>
            </div>
            <div className="flex gap-2">
              {/* Add the refresh button here */}
              <button
                onClick={handleRefresh}
                disabled={busy}
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                title="Refresh data"
              >
                <FiRefreshCw className={`${busy ? 'animate-spin' : ''} mr-2`} /> Refresh
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
              {departmentsLoading ? (
                <p className="text-center text-gray-500 py-8">Loading departments...</p>
              ) : departments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No departments available. Add a new department to get started.</p>
              ) : (
                <div className="space-y-3">
                  {departments.map(department => (
                    <div
                      key={department.id}
                      onClick={() => handleDepartmentSelect(department)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedDepartment?.id === department.id
                          ? "bg-gradient-to-r from-blue-100 to-green-100 border-l-4 border-blue-500 shadow"
                          : "hover:bg-gray-100 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex justify-between">
                        <h4 className="font-medium text-blue-700">{department.name}</h4>
                        {selectedDepartment?.id === department.id && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDepartment(department.id);
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
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
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
                    <p className="text-gray-600 bg-blue-50 p-4 rounded-lg">{selectedDepartment.description || "No description"}</p>
                    <h4 className="font-medium text-gray-700 mb-2">Department Head:</h4>
                    <p className="text-gray-600 bg-blue-50 p-4 rounded-lg">
                      {currentHead ? `⭐ ${currentHead.name}` : selectedDepartment.headOfDepartment || "Not assigned — use “Assign role” on a doctor below"}
                    </p>
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
                    <span className="text-xs text-gray-500">{doctors.length} doctor{doctors.length === 1 ? "" : "s"} · head shown first</span>
                  </div>

                  <div className="space-y-4">
                  {doctorsLoading ? (
                    <p className="text-center py-4">Loading doctors...</p>
                  ) : doctors.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No doctors assigned to this department</p>
                  ) : (
                    [...doctors]
                      .sort((a, b) => Number((b.roles || []).includes(HEAD_ROLE)) - Number((a.roles || []).includes(HEAD_ROLE)))
                      .map(doctor => (
                      <div
                        key={doctor._id}
                        className={`p-4 border rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 transition-colors ${(doctor.roles || []).includes(HEAD_ROLE) ? "border-yellow-300 bg-yellow-50/40" : ""}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-blue-600">{doctor.name}</h5>
                            <p className="text-sm text-gray-600">{doctor.email}</p>
                            <p className="text-sm text-gray-600">
                              {doctor.qualification || "—"} • {doctor.specialization || "—"}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(doctor.roles || []).length ? (
                                doctor.roles.map((role) => (
                                  <span key={role} className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(role)}`}>
                                    {role === HEAD_ROLE ? "⭐ " : ""}{role}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">No role assigned</span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openRoleDialog(doctor)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
                              title="Assign role"
                            >
                              <MdMedicalServices size={16} /> Assign role
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
                                <option key={dept.id} value={dept.id}>
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
        
        {/* Assign Role Modal */}
        {roleDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">Assign role</h3>
                  <p className="text-sm text-white/90">{roleDoctor.name} · {selectedDepartment?.name}</p>
                </div>
                <button onClick={() => setRoleDoctor(null)} className="hover:bg-white/20 rounded-full p-1"><FiX size={20} /></button>
              </div>
              <div className="p-6 space-y-5">
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${roleForm.head ? "border-yellow-400 bg-yellow-50" : "border-gray-200"}`}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={roleForm.head}
                    onChange={(e) => setRoleForm({ ...roleForm, head: e.target.checked })}
                  />
                  <span>
                    <span className="block font-medium text-gray-800">⭐ Department Head</span>
                    <span className="block text-xs text-gray-500">
                      {currentHead && currentHead._id !== roleDoctor._id
                        ? roleForm.head
                          ? `${currentHead.name} will no longer be the head.`
                          : `Current head: ${currentHead.name}`
                        : "One head per department."}
                    </span>
                  </span>
                </label>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["", ...departmentPositions].map((position) => (
                      <label
                        key={position || "none"}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer ${roleForm.position === position ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-200 text-gray-700"}`}
                      >
                        <input
                          type="radio"
                          name="position"
                          checked={roleForm.position === position}
                          onChange={() => setRoleForm({ ...roleForm, position })}
                        />
                        {position || "No position"}
                      </label>
                    ))}
                  </div>
                </div>
                {roleError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{roleError}</div>}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setRoleDoctor(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={saveRoles}
                  disabled={roleSaving}
                  className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 disabled:opacity-60 flex items-center"
                >
                  <FiCheck className="mr-2" /> {roleSaving ? "Saving..." : "Save role"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
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