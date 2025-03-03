import { useState, useEffect } from 'react';
import Slidebar from "../../pages/Slidebar";
import { FiPhone, FiMail, FiAward } from "react-icons/fi";

const Department = () => {
  const [activeTab, setActiveTab] = useState("departments");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const departments = [
    {
      name: "Orthopedic",
      description: "Specializes in conditions affecting bones, joints, muscles, ligaments, and tendons",
      icon: "🦴"
    },
    {
      name: "Cardiology",
      description: "Focuses on disorders of the heart and blood vessels",
      icon: "❤️"
    },
    {
      name: "Neurology",
      description: "Deals with disorders of the nervous system",
      icon: "🧠"
    },
    {
      name: "Pediatric",
      description: "Provides medical care for infants, children, and adolescents",
      icon: "👶"
    }
  ];

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch("http://127.0.0.1:8000/api/doctors/", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch doctors');
        }
        
        const data = await response.json();
        setDoctors(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const getFilteredDoctors = () => {
    if (selectedDepartment === "all") {
      return doctors;
    }
    return doctors.filter(doctor => 
      doctor.doctorSpecialization.toLowerCase() === selectedDepartment.toLowerCase()
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar userType="admin" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 p-8 overflow-auto">
        <h2 className="text-3xl font-bold mb-6">Departments</h2>

        {/* Departments Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {departments.map((dept, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">{dept.icon}</div>
              <h3 className="text-xl font-bold mb-2">{dept.name}</h3>
              <p className="text-gray-600">{dept.description}</p>
            </div>
          ))}
        </div>

        {/* Department Filter */}
        <div className="mb-6">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="p-2 border rounded-lg shadow-sm"
          >
            <option value="all">All Departments</option>
            {departments.map((dept, index) => (
              <option key={index} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* Doctors List */}
        {loading ? (
          <div className="text-center">Loading doctors...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredDoctors().map((doctor, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <img
                      src={doctor.photo || "https://via.placeholder.com/100?text=Doctor"}
                      alt={doctor.name}
                      className="w-16 h-16 rounded-full object-cover mr-4"
                    />
                    <div>
                      <h3 className="text-xl font-bold">{doctor.name}</h3>
                      <p className="text-gray-600">{doctor.doctorSpecialization}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <FiAward className="mr-2" />
                      <span>{doctor.doctorQualification}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <FiMail className="mr-2" />
                      <span>{doctor.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <FiPhone className="mr-2" />
                      <span>{doctor.contactNo}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Department;

