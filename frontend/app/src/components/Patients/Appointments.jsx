import { useState } from "react";
import Slidebar from "../../pages/Slidebar"; // Ensure correct path
import { FiCalendar, FiPhoneCall } from "react-icons/fi";

const doctorsData = {
  orthopedic: [
    { id: 1, name: "Dr. John Doe", specialty: "Orthopedic", experience: "10 years", image: "/src/assets/images/doctor-img01.jpg" },
    { id: 2, name: "Dr. Jane Smith", specialty: "Orthopedic", experience: "8 years", image: "/images/doctor-img02.jpg" },
    { id: 3, name: "Dr. darshan", specialty: "Orthopedic", experience: "8 years", image: "/images/doctor-img02.jpg" },
  ],
  pediatricion: [
    { id: 4, name: "Dr. Emily Brown ", specialty: "Dental", experience: "5 years", image: "/images/doctor3.jpg" },
    { id: 5, name: "Dr. Michael Green", specialty: "Dental", experience: "7 years", image: "/images/doctor4.jpg" },
    { id: 6, name: "Dr. Michael Green", specialty: "Dental", experience: "7 years", image: "/images/doctor4.jpg" },
  ],
  cardiology_neurology: [
    { id: 7, name: "Dr. Emilacs ", specialty: "Dental", experience: "5 years", image: "/images/doctor3.jpg" },
    { id: 8, name: "Dr. Michael Green", specialty: "Dental", experience: "7 years", image: "/images/doctor4.jpg" },
    { id: 9, name: "Dr. Michhgfdn", specialty: "Dental", experience: "7 years", image: "/images/doctor4.jpg" },
  ],
  generic: [
    { id: 10, name: "Dr. Emily Brown ", specialty: "Dental", experience: "5 years", image: "/images/doctor3.jpg" },
    { id: 11, name: "Dr. Michael Green", specialty: "Dental", experience: "7 years", image: "/images/doctor4.jpg" },
  ],
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
  //const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [activeTab, setActiveTab] = useState("appointments");

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />

      {/* Main Content */}
      <div className=" mt-40 flex flex-col flex-1 justify-center items-center p-8">
        <h2 className="mt-40 text-3xl font-bold flex items-center mb-6">
          <FiCalendar className="mr-2" /> Doctor Appointments
        </h2>

         {/* Horizontal Divider & Call Button */}
         <div className="w-full max-w-4xl flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
          <span className="text-lg font-semibold text-gray-700">Select Specialization</span>
          <button
            className="px-4 py-2 flex items-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            onClick={() => window.location.href = "tel:+1234567890"} // Replace with actual admin number
          >
            <FiPhoneCall className="mr-2" /> Call Admin
          </button>
        </div>

        {/* Specialization Buttons */}
        <div className="flex space-x-6 mb-6 mt-6">
          <button
            className={`px-5 py-2 rounded-lg text-lg font-medium ${
              selectedSpecialty === "orthopedic" ? "bg-blue-500 text-white" : "bg-gray-300"
            }`}
            onClick={() => setSelectedSpecialty("orthopedic")}
          >
            Orthopedic
          </button>
          <button
            className={`px-5 py-2 rounded-lg text-lg font-medium ${
              selectedSpecialty === "pediatricion" ? "bg-blue-500 text-white" : "bg-gray-300"
            }`}
            onClick={() => setSelectedSpecialty("pediatricion")}
          >
            Pediatricion
          </button>
          <button
            className={`px-5 py-2 rounded-lg text-lg font-medium ${
              selectedSpecialty === "cardiology_neurology" ? "bg-blue-500 text-white" : "bg-gray-300"
            }`}
            onClick={() => setSelectedSpecialty("cardiology_neurology")}
          >
            cardiology & neurology
          </button>
          <button
            className={`px-5 py-2 rounded-lg text-lg font-medium ${
              selectedSpecialty === "generic" ? "bg-blue-500 text-white" : "bg-gray-300"
            }`}
            onClick={() => setSelectedSpecialty("generic")}
          >
            Generic
          </button>
        </div>

        {/* Doctor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
          {doctorsData[selectedSpecialty].map((doctor) => (
            <div key={doctor.id} className="p-6 border rounded-lg shadow-lg cursor-pointer bg-white hover:bg-gray-50 transition flex flex-col items-center">
              <img src={doctor.image} alt={doctor.name} className="w-24 h-24 rounded-full mb-3" />
              <h3 className="text-xl font-semibold">{doctor.name}</h3>
              <p className="text-gray-600">{doctor.specialty}</p>
              <p className="text-gray-500">Experience: {doctor.experience}</p>
              <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                View More
              </button>
            </div>
          ))}
        </div>

        {/* Previous Appointments Section */}
        <div className="mt-12 w-full max-w-6xl bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Previous Appointments</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-3 text-left">Doctor Name</th>
                <th className="border p-3 text-left">Doctor Suggestion</th>
                <th className="border p-3 text-left">Report</th>
              </tr>
            </thead>
            <tbody>
              {previousAppointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-100">
                  <td className="border p-3">{appointment.doctorName}</td>
                  <td className="border p-3">{appointment.suggestion}</td>
                  <td className="border p-3">
                    <a
                      href={appointment.reportLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline hover:text-blue-700"
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
  );
}

export default Appointment;
