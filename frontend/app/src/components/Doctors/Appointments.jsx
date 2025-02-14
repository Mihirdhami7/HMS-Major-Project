import React, { useState } from "react";
import Slidebar from "../../pages/Slidebar"; // Ensure correct path
import { FiCheckCircle, FiEdit3 } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

const initialAppointments = [
  { id: 1, patientId: uuidv4(), patientName: "John Doe", disease: "Flu and Fever", accepted: false, confirmed: false, prescription: "", appointmentDate: "", slot: "", patientStatus: "Not Accepted" },
  { id: 2, patientId: uuidv4(), patientName: "Jane Smith", disease: "Back Pain", accepted: false, confirmed: false, prescription: "", appointmentDate: "", slot: "", patientStatus: "Not Accepted" },
];

function DoctorAppointments() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  // const [prescription, setPrescription] = useState("");
  const [appointmentDetails, setAppointmentDetails] = useState({ date: "", slot: "" });
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Handle Accept Request
  const acceptAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };
  // const navigate=useNavigate();
  // const openPrescriptionPage = (appointment) => {
  //   navigate("/components/Doctors/Prescription", { state: { appointment } });
  // };

  const confirmAppointment = () => {
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === selectedAppointment.id
          ? { ...appointment, accepted: true, appointmentDate: appointmentDetails.date, slot: appointmentDetails.slot, patientStatus: "Not Accepted" }
          : appointment
      )
    );
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
    setAppointmentDetails({ date: "", slot: "" });
  };

  // Handle Prescription Modal
  const openPrescriptionModal = (appointment) => {
    setSelectedAppointment(appointment);
    setPrescription(appointment.prescription || "");
  };

  const savePrescription = () => {
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === selectedAppointment.id ? { ...appointment, prescription } : appointment
      )
    );
    setSelectedAppointment(null);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Slidebar userType="doctor" />

      {/* Main Content */}
      <div className="flex flex-col flex-1 p-8">
        <h2 className="text-3xl font-bold mb-6">Appointments</h2>

        {/* Tables Container */}
        <div className="flex flex-col w-full space-y-8">
          {/* Pending Appointments Table */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Pending Appointments</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-3 text-left">Patient ID</th>
                  <th className="border p-3 text-left">Patient Name</th>
                  <th className="border p-3 text-left">Disease Description</th>
                  <th className="border p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.filter(appt => !appt.accepted).map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-100">
                    <td className="border p-3">{appt.patientId}</td>
                    <td className="border p-3">{appt.patientName}</td>
                    <td className="border p-3">{appt.disease}</td>
                    <td className="border p-3">
                      <button
                        onClick={() => acceptAppointment(appt)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Accept Request
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Accepted Appointments Table */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Accepted Appointments</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-3 text-left">Patient ID</th>
                  <th className="border p-3 text-left">Patient Name</th>
                  <th className="border p-3 text-left">Disease Description</th>
                  <th className="border p-3 text-left">Appointment Date</th>
                  <th className="border p-3 text-left">Slot</th>
                  <th className="border p-3 text-left">Doctor Status</th>
                  <th className="border p-3 text-left">Patient Status</th>
                  <th className="border p-3 text-left">Prescription</th>
                </tr>
              </thead>
              <tbody>
                {appointments.filter(appt => appt.accepted).map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-100">
                    <td className="border p-3">{appt.patientId}</td>
                    <td className="border p-3">{appt.patientName}</td>
                    <td className="border p-3">{appt.disease}</td>
                    <td className="border p-3">{appt.appointmentDate}</td>
                    <td className="border p-3">{appt.slot}</td>
                    <td className="border p-3 text-green-600 flex items-center">
                      <FiCheckCircle className="mr-2" /> Accepted
                    </td>
                    <td className="border p-3 text-yellow-600">{appt.patientStatus}</td>
                    <td className="border p-3">
                    <button 
              // Step 4: Use in button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
            <FiEdit3 className="mr-2" /> Write Prescription
        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Appointment Booking Modal */}
        {showAppointmentModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
              <h3 className="text-xl font-semibold mb-4">Schedule Appointment</h3>
              <input type="date" className="w-full p-2 border rounded-lg mb-2" onChange={(e) => setAppointmentDetails({ ...appointmentDetails, date: e.target.value })} />
              <input type="text" className="w-full p-2 border rounded-lg mb-4" placeholder="Enter slot" onChange={(e) => setAppointmentDetails({ ...appointmentDetails, slot: e.target.value })} />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" onClick={confirmAppointment}>Confirm Appointment</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorAppointments;