import { useState} from "react";
import { useNavigate } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";

const initialAppointments = [
  { id: 1, patientName: "John Doe", email: "john@example.com", age: 30, address: "123 Street, NY", doctorName: "Dr. Smith", status: "Completed", date: "2025-02-23" },
  { id: 2, patientName: "Jane Doe", email: "jane@example.com", age: 28, address: "456 Avenue, LA", doctorName: "Dr. Johnson", status: "Pending", date: "2025-02-21" },
  { id: 3, patientName: "Jatin Sharma", email: "jatin@example.com", age: 35, address: "789 Road, TX", doctorName: "Dr. Brown", status: "Completed", date: "2025-02-19" },
  { id: 4, patientName: "Alice Green", email: "alice@example.com", age: 40, address: "101 Blvd, FL", doctorName: "Dr. White", status: "Completed", date: "2025-02-19" },
];

const initialMedicines = [
  { id: 1, patientName: "John Doe", medicine: "Paracetamol", date: "2025-02-10" },
  { id: 2, patientName: "Jatin Sharma", medicine: "Ibuprofen", date: "2025-02-12" },
  { id: 3, patientName: "Alice Green", medicine: "Amoxicillin", date: "2025-02-13" },
];

const AppointmentData = () => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [medicines, setMedicines] = useState(initialMedicines);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredAppointments = appointments
    .filter((appointment) => appointment.patientName.toLowerCase().startsWith(searchTerm.toLowerCase()))
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(today.getDate() - 5);
      return appointmentDate >= fiveDaysAgo;
    });

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab="Appointments" userType="admin" />
      <div className="p-10 bg-blue-50 min-h-screen flex flex-col gap-6 w-full">
        {/* Search Bar */}
        <div className="mt-4 bg-white p-4 shadow-lg rounded-lg flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-400"
          />
          <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Search
          </button>
        </div>

        {/* Appointments Table */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-blue-600">Appointments (Last 5 Days)</h2>
          <table className="w-full mt-4 border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Patient Name</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Age</th>
                <th className="border p-2">Address</th>
                <th className="border p-2">Doctor Name</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border">
                  <td className="border p-2">{appointment.patientName}</td>
                  <td className="border p-2">{appointment.email}</td>
                  <td className="border p-2">{appointment.age}</td>
                  <td className="border p-2">{appointment.address}</td>
                  <td className="border p-2">{appointment.doctorName}</td>
                  <td className="border p-2">{appointment.status}</td>
                  <td className="border p-2">{appointment.date}</td>
                  <td className="border p-2 flex gap-2">
                    {appointment.status === "Completed" && (
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
                        onClick={() => navigate(`/admin/product/medicine`)}
                      >
                        Give Medicine
                      </button>
                    )}
                    {appointment.status === "Completed" && (
                      <button className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-700">
                        Generate Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AppointmentData;
