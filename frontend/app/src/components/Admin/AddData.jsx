import { useState } from "react";
import Slidebar from "../../pages/Slidebar";

const initialAppointments = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  patientName: ["Jatin Shah", "Mihir Patel", "Aarav Mehta", "Rohan Desai", "Krishna Iyer", "Jatin Sharma", "Rahul Shah", "Pooja Patel", "Jatin Gupta"][i % 9],
  doctorName: ["Dr. Rao", "Dr. Mehta", "Dr. Joshi", "Dr. Shah", "Dr. Desai"][i % 5],
  email: `patient${i + 1}@mail.com`,
  age: 25 + (i % 10),
  address: `Street ${i + 1}, City`,
  status: i % 3 === 0 ? "Completed" : "Pending",
}));

const AddData = () => {
  const [activeTab, setActiveTab] = useState("Add Data");
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [showModal, setShowModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    age: "",
    address: "",
    doctor: "",
    status: "Pending",
  });

  const filteredAppointments = appointments.filter((appointment) =>
    appointment.patientName.toLowerCase().startsWith(searchQuery.toLowerCase())
  );

  const handleRegisterPatient = () => {
    if (newPatient.name && newPatient.email && newPatient.age && newPatient.address && newPatient.doctor) {
      setAppointments([...appointments, { 
        id: appointments.length + 1, 
        patientName: newPatient.name, 
        email: newPatient.email, 
        age: newPatient.age, 
        address: newPatient.address, 
        doctorName: newPatient.doctor, 
        status: "Pending" 
      }]);
      setShowModal(false);
      setSearchQuery(""); // Reset search
      setNewPatient({ name: "", email: "", age: "", address: "", doctor: "", status: "Pending" }); // Reset form
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />

      <div className="p-10 bg-blue-50 min-h-screen flex flex-col gap-6 w-full">
        {/* Search Bar */}
        <div className="mt-4 bg-white p-4 shadow-lg rounded-lg flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search by Patient Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-400"
          />
          <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Search
          </button>
        </div>

        {/* Appointment Table */}
        <div className="bg-white p-6 shadow-lg rounded-lg overflow-auto">
          <h2 className="text-xl font-semibold text-blue-600 mb-4">Appointments</h2>
          {filteredAppointments.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-3">Patient Name</th>
                  <th className="border p-3">Email</th>
                  <th className="border p-3">Age</th>
                  <th className="border p-3">Address</th>
                  <th className="border p-3">Doctor Name</th>
                  <th className="border p-3">Status</th>
                  <th className="border p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="text-center bg-white border-b">
                    <td className="border p-3">{appointment.patientName}</td>
                    <td className="border p-3">{appointment.email}</td>
                    <td className="border p-3">{appointment.age}</td>
                    <td className="border p-3">{appointment.address}</td>
                    <td className="border p-3">{appointment.doctorName}</td>
                    <td className={`border p-3 font-semibold ${appointment.status === "Completed" ? "text-green-600" : "text-red-500"}`}>
                      {appointment.status}
                    </td>
                    <td className="border p-3">
                      {appointment.status === "Completed" ? (
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700">
                          Generate Report
                        </button>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center">
              <p className="text-gray-600">No appointments found.</p>
              <button
                className="mt-4 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700"
                onClick={() => setShowModal(true)}
              >
                Register New Patient
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Registering New Patients */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-[400px]">
            <h2 className="text-2xl font-bold text-blue-600 mb-6 text-center">Register New Patient</h2>

            <form className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="Age"
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Doctor Name"
                value={newPatient.doctor}
                onChange={(e) => setNewPatient({ ...newPatient, doctor: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />

              <div className="flex justify-end space-x-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegisterPatient}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddData;
