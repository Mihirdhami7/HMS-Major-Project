import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiCheck, FiX, FiUserPlus } from "react-icons/fi";
import Slidebar from "../../pages/Slidebar";
import axios from "axios";

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([
    { id: 1, name: "Cardiology", description: "Heart and cardiovascular system" },
    { id: 2, name: "Neurology", description: "Brain and nervous system" },
    { id: 3, name: "Orthopedics", description: "Bones and joints" },
    { id: 4, name: "Pediatrics", description: "Child healthcare" },
    { id: 5, name: "Generic", description: "General medicine" }
  ]);

  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editData, setEditData] = useState({
    name: "",
    description: "",
    roles: []
  });

  const [newDoctor, setNewDoctor] = useState({
    name: "",
    email: "",
    qualification: "",
    specialization: "",
    experience: "",
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

  useEffect(() => {
    if (selectedDepartment) {
      fetchDoctorsByDepartment(selectedDepartment.name);
    }
  }, [selectedDepartment]);

  const fetchDoctorsByDepartment = async (departmentName) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/api/doctors/${departmentName}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
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
      description: department.description,
      roles: department.roles || []
    });
  };

  const handleEditSubmit = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `http://localhost:8000/api/departments/${selectedDepartment.id}/`,
        editData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`
          }
        }
      );

      setDepartments(departments.map(dept =>
        dept.id === selectedDepartment.id ? { ...dept, ...editData } : dept
      ));
      setSuccess("Department updated successfully");
      setIsEditing(false);
    } catch (error) {
      setError("Failed to update department");
      console.error("Error updating department:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:8000/api/doctors/",
        {
          ...newDoctor,
          department: selectedDepartment.name
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`
          }
        }
      );

      setDoctors([...doctors, response.data.doctor]);
      setSuccess("Doctor added successfully");
      setShowAddDoctor(false);
      setNewDoctor({
        name: "",
        email: "",
        qualification: "",
        specialization: "",
        experience: "",
        roles: []
      });
    } catch (error) {
      setError("Failed to add doctor");
      console.error("Error adding doctor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDoctor = async (doctorId, updatedData) => {
    try {
      setLoading(true);
      const response = await axios.put(
        `http://localhost:8000/api/doctors/${doctorId}/`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`
          }
        }
      );

      setDoctors(doctors.map(doc =>
        doc._id === doctorId ? { ...doc, ...updatedData } : doc
      ));
      setSuccess("Doctor updated successfully");
    } catch (error) {
      setError("Failed to update doctor");
      console.error("Error updating doctor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;

    try {
      setLoading(true);
      await axios.delete(`http://localhost:8000/api/doctors/${doctorId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
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

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab="department" userType="admin" />

      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-blue-700 mb-8">Department Management</h2>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Departments List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-blue-600 mb-4">Departments</h3>
              <div className="space-y-2">
                {departments.map(department => (
                  <div
                    key={department.id}
                    onClick={() => handleDepartmentSelect(department)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedDepartment?.id === department.id
                        ? "bg-blue-100 text-blue-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <h4 className="font-medium">{department.name}</h4>
                    <p className="text-sm text-gray-600">{department.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Details and Edit */}
            {selectedDepartment && (
              <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-blue-600">
                    {selectedDepartment.name} Details
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    {isEditing ? <FiX /> : <FiEdit2 />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department Name
                      </label>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Roles
                      </label>
                      <div className="space-y-2">
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
                              className="mr-2"
                            />
                            {role}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleEditSubmit}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600">{selectedDepartment.description}</p>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Available Roles:</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedDepartment.roles || []).map(role => (
                          <span
                            key={role}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Doctors List */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-700">Department Doctors</h4>
                    <button
                      onClick={() => setShowAddDoctor(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                    >
                      <FiUserPlus />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {doctors.map(doctor => (
                      <div
                        key={doctor._id}
                        className="p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{doctor.name}</h5>
                            <p className="text-sm text-gray-600">{doctor.email}</p>
                            <p className="text-sm text-gray-600">
                              {doctor.qualification} • {doctor.experience} years
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {doctor.roles.map(role => (
                                <span
                                  key={role}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                // Implement edit doctor functionality
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doctor._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Doctor Modal */}
        {showAddDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-blue-600 mb-4">Add New Doctor</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={newDoctor.qualification}
                    onChange={(e) => setNewDoctor({ ...newDoctor, qualification: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (years)
                  </label>
                  <input
                    type="number"
                    value={newDoctor.experience}
                    onChange={(e) => setNewDoctor({ ...newDoctor, experience: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roles
                  </label>
                  <div className="space-y-2">
                    {availableRoles.map(role => (
                      <label key={role} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newDoctor.roles.includes(role)}
                          onChange={(e) => {
                            const updatedRoles = e.target.checked
                              ? [...newDoctor.roles, role]
                              : newDoctor.roles.filter(r => r !== role);
                            setNewDoctor({ ...newDoctor, roles: updatedRoles });
                          }}
                          className="mr-2"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowAddDoctor(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDoctor}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {loading ? "Adding..." : "Add Doctor"}
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