import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";

const availableMedicines = [
  "Paracetamol", "Ibuprofen", "Amoxicillin", "Aspirin", "Cetirizine"
];

const MedicinePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [selectedMedicines, setSelectedMedicines] = useState([]);

  useEffect(() => {
    // Fetch patient details based on ID (Mock Data for now)
    const mockAppointments = [
      { id: 1, patientName: "John Doe", email: "john@example.com", age: 30, address: "123 Street, NY", doctorName: "Dr. Smith", status: "Completed" },
      { id: 3, patientName: "Jatin Sharma", email: "jatin@example.com", age: 35, address: "789 Road, TX", doctorName: "Dr. Brown", status: "Completed" },
    ];
    const foundPatient = mockAppointments.find((appt) => appt.id === parseInt(id));
    setPatient(foundPatient);
  }, [id]);

  const addMedicine = (medicine) => {
    if (!selectedMedicines.includes(medicine)) {
      setSelectedMedicines([...selectedMedicines, medicine]);
    }
  };

  const generateInvoice = () => {
    alert(`Invoice Generated for ${patient.patientName} with medicines: ${selectedMedicines.join(", ")}`);
    navigate("/admin/product/medicine");
  };

  if (!patient) return <p>Loading patient data...</p>;

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab="Medicine" userType="admin" />
      <div className="p-10 bg-blue-50 min-h-screen flex flex-col gap-6 w-full">
        <h2 className="text-2xl font-semibold text-blue-600">Prescribe Medicines</h2>
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h3 className="text-lg font-semibold">Patient Details</h3>
          <p><strong>Name:</strong> {patient.patientName}</p>
          <p><strong>Email:</strong> {patient.email}</p>
          <p><strong>Age:</strong> {patient.age}</p>
          <p><strong>Address:</strong> {patient.address}</p>
          <p><strong>Doctor:</strong> {patient.doctorName}</p>
        </div>

        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h3 className="text-lg font-semibold">Select Medicines</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {availableMedicines.map((medicine, index) => (
              <button
                key={index}
                onClick={() => addMedicine(medicine)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
              >
                {medicine}
              </button>
            ))}
          </div>
          <h4 className="mt-4 text-md font-semibold">Selected Medicines:</h4>
          <ul>
            {selectedMedicines.map((med, index) => (
              <li key={index} className="text-gray-700">{med}</li>
            ))}
          </ul>
          <button
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
            onClick={generateInvoice}
          >
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicinePage;
