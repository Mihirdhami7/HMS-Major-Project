import { useState } from "react";
import Slidebar from "../../pages/Slidebar"; // Ensure correct path
import { FiCalendar, FiPhoneCall } from "react-icons/fi";

const doctorsData = {
  orthopedic: [
    { 
      id: 1, 
      name: "Dr. John Doe", 
      specialty: "Orthopedic", 
      experience: "10 years", 
      image: "/src/assets/images/doctor-img01.jpg" 
    },
    { 
      id: 2, 
      name: "Dr. Jane Smith", 
      specialty: "Orthopedic", 
      experience: "8 years", 
      image: "/images/doctor-img02.jpg" 
    },
    { 
      id: 3, 
      name: "Dr. darshan", 
      specialty: "Orthopedic", 
      experience: "8 years", 
      image: "/images/doctor-img02.jpg" 
    }
  ],
  pediatrician: [
    { 
      id: 4, 
      name: "Dr. Sarah Wilson", 
      specialty: "Pediatrician", 
      experience: "12 years", 
      image: "/images/doctor3.jpg" 
    },
    { 
      id: 5, 
      name: "Dr. Michael Chen", 
      specialty: "Pediatrician", 
      experience: "7 years", 
      image: "/images/doctor4.jpg" 
    }
  ],
  cardiology_neurology: [
    { 
      id: 6, 
      name: "Dr. Robert Johnson", 
      specialty: "Cardiology", 
      experience: "15 years", 
      image: "/images/doctor5.jpg" 
    },
    { 
      id: 7, 
      name: "Dr. Emma Davis", 
      specialty: "Neurology", 
      experience: "10 years", 
      image: "/images/doctor6.jpg" 
    }
  ],
  generic: [
    { 
      id: 8, 
      name: "Dr. William Brown", 
      specialty: "General Medicine", 
      experience: "8 years", 
      image: "/images/doctor7.jpg" 
    },
    { 
      id: 9, 
      name: "Dr. Lisa Anderson", 
      specialty: "General Medicine", 
      experience: "6 years", 
      image: "/images/doctor8.jpg" 
    }
  ]
};

// Sample Previous Appointments Data
const previousAppointments = [
  { id: 1, doctorName: "Dr. John Doe", suggestion: "Continue medication", reportLink: "/reports/report1.pdf" },
  { id: 2, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
  { id: 3, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
  { id: 4, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
];

function Appointment() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("orthopedic");
  const [activeTab, setActiveTab] = useState("appointments");

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />

      <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-3xl font-bold flex items-center mb-6 text-blue-700">
          <FiCalendar className="mr-2 text-green-600" /> Doctor Appointments
        </h2>

        {/* Contact Admin Section */}
        <div className="w-full flex justify-between items-center border-b border-blue-200 pb-4 mb-6">
          <span className="text-lg font-semibold text-gray-700">contact Admin to book Appointments</span>
          <button
            className="px-4 py-2 flex items-center bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 transition-all"
            onClick={() => window.location.href = "tel:+1234567890"}
          >
            <FiPhoneCall className="mr-2" /> Call Admin
          </button>
        </div>

        {/* Department Selection */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            className={`px-6 py-2 rounded-lg transition-all ${
              selectedSpecialty === "orthopedic" 
                ? "bg-gradient-to-r from-blue-500 to-green-500 text-white" 
                : "bg-white hover:bg-gray-50 border border-blue-200"
            }`}
            onClick={() => setSelectedSpecialty("orthopedic")}
          >
            Orthopedic
          </button>
          <button
            className={`px-6 py-2 rounded-lg transition-all ${
              selectedSpecialty === "pediatrician" 
                ? "bg-gradient-to-r from-blue-500 to-green-500 text-white" 
                : "bg-white hover:bg-gray-50 border border-blue-200"
            }`}
            onClick={() => setSelectedSpecialty("pediatrician")}
          >
            Pediatrician
          </button>
          <button
            className={`px-6 py-2 rounded-lg transition-all ${
              selectedSpecialty === "cardiology_neurology" 
                ? "bg-gradient-to-r from-blue-500 to-green-500 text-white" 
                : "bg-white hover:bg-gray-50 border border-blue-200"
            }`}
            onClick={() => setSelectedSpecialty("cardiology_neurology")}
          >
            Cardiology & Neurology
          </button>
          <button
            className={`px-6 py-2 rounded-lg transition-all ${
              selectedSpecialty === "generic" 
                ? "bg-gradient-to-r from-blue-500 to-green-500 text-white" 
                : "bg-white hover:bg-gray-50 border border-blue-200"
            }`}
            onClick={() => setSelectedSpecialty("generic")}
          >
            Generic
          </button>
        </div>

        {/* Doctor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctorsData[selectedSpecialty].map((doctor) => (
            <div key={doctor.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-blue-100 hover:border-green-200">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-r from-blue-100 to-green-100">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/100?text=Doctor";
                    }}
                  />
                </div>
                <h3 className="text-xl font-semibold mb-1 text-blue-700">{doctor.name}</h3>
                <p className="text-green-600 mb-2">{doctor.specialty}</p>
                <p className="text-gray-500 mb-4">Experience: {doctor.experience}</p>
                <button className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-2 rounded-lg hover:from-blue-600 hover:to-green-600 transition-all">
                  View More
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Previous Appointments Section */}
        <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">Previous Appointments</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-green-50">
                  <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Name</th>
                  <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Suggestion</th>
                  <th className="border border-blue-200 p-3 text-left text-gray-700">Report</th>
                </tr>
              </thead>
              <tbody>
                {previousAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50">
                    <td className="border border-blue-200 p-3">{appointment.doctorName}</td>
                    <td className="border border-blue-200 p-3">{appointment.suggestion}</td>
                    <td className="border border-blue-200 p-3">
                      <a
                        href={appointment.reportLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-green-500 transition-colors"
                      >
                        Generate Report
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Appointment;
