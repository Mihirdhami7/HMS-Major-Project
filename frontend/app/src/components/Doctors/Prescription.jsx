import { useState } from "react";
import { useLocation } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import { FiClipboard, FiSearch } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

function Prescription() {
    const location = useLocation();
    const appointment = location.state?.appointment || {};

    const [vitals, setVitals] = useState({ temperature: "", bloodPressure: "", weight: "", heartRate: "" });
    // const [submittedVitals, setSubmittedVitals] = useState(null);

    const [medicineSearch, setMedicineSearch] = useState("");
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [dosage, setDosage] = useState(1);
    const [frequency, setFrequency] = useState(1);

    const [reportSearch, setReportSearch] = useState("");
    const [selectedReports, setSelectedReports] = useState([]);
    const [suggestions, setSuggestions] = useState("");
    const [submittedPrescription, setSubmittedPrescription] = useState([]);

    const medicines = ["Paracetamol", "Ibuprofen", "Amoxicillin", "Cetirizine", "Metformin"];
    const reports = ["Blood Test", "X-Ray", "MRI Scan", "ECG", "Thyroid Test"];

    const handleVitalsChange = (e) => {
        setVitals({ ...vitals, [e.target.name]: e.target.value });
    };

    // const submitVitals = () => {
    //     setSubmittedVitals(vitals);
    // };

    const handleMedicineSelect = (medicine) => {
        setSelectedMedicines([...selectedMedicines, { name: medicine, dosage, frequency }]);
        setMedicineSearch("");
    };

    const handleReportSelect = (report) => {
        setSelectedReports([...selectedReports, report]);
        setReportSearch("");
    };

    const submitPrescription = () => {
        setSubmittedPrescription([...submittedPrescription, { medicines: selectedMedicines, reports: selectedReports, suggestions }]);
        setSelectedMedicines([]);
        setSelectedReports([]);
        setSuggestions("");
    };

    const removeMedicine = (index) => {
        setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
    };

    // const removeReport = (index) => {
    //     setSelectedReports(selectedReports.filter((_, i) => i !== index));
    // };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Slidebar userType="doctor" />
            <div className="flex flex-col flex-1 p-8 overflow-auto">
                <h2 className="text-3xl font-bold mb-4 flex items-center">
                    <FiClipboard className="mr-2 text-blue-600" /> Prescription for {appointment.patientName}
                </h2>

                {/* Patient Vitals */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                    <h3 className="text-xl font-semibold mb-4">Patient Vitals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(vitals).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <span className="w-40 text-gray-700 capitalize">{`Enter ${key.replace(/([A-Z])/g, " $1")}:`}</span>
                                <input type="text" name={key} value={value} 
                                    onChange={handleVitalsChange}
                                    className="border p-2 rounded w-full shadow-sm"/>
                            </div>
                        ))}
                    </div>
                    {/* <button onClick={submitVitals} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Submit Vitals
                    </button> */}
                </div>

                {/* Prescription Form */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                    <h3 className="text-xl font-semibold mb-4">Prescription</h3>

                    {/* Medicine Search with Dropdown */}
                    <div className="relative mb-4">
                        <span className="text-gray-700">Search Medicine:</span>
                        <div className="relative">
                            <input type="text" placeholder="Type medicine..." value={medicineSearch}
                                onChange={(e) => setMedicineSearch(e.target.value)}
                                className="border p-2 pl-3 rounded w-full shadow-sm"/>
                            <FiSearch className="absolute right-3 top-3 text-gray-400" />
                        </div>
                        {medicineSearch && (
                            <ul className="absolute bg-white border rounded shadow-lg w-full mt-1 max-h-40 overflow-auto">
                                {medicines.filter(m => m.toLowerCase().includes(medicineSearch.toLowerCase())).map((med, i) => (
                                    <li key={i} className="p-2 hover:bg-gray-200 cursor-pointer"
                                        onClick={() => handleMedicineSelect(med)}>
                                        {med}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Dosage & Frequency */}
                    <div className="flex space-x-4">
                        <div>
                            <span className="text-gray-700">Dosage:</span>
                            <select onChange={(e) => setDosage(e.target.value)}
                                className="border p-2 rounded shadow-sm w-full">
                                {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num}</option>)}
                            </select>
                        </div>

                        <div>
                            <span className="text-gray-700">Frequency:</span>
                            <select onChange={(e) => setFrequency(e.target.value)}
                                className="border p-2 rounded shadow-sm w-full">
                                {[1, 2, 3].map(num => <option key={num} value={num}>{num} times/day</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Report Search with Dropdown */}
                    <div className="relative mt-4">
                        <span className="text-gray-700">Search Report:</span>
                        <div className="relative">
                            <input type="text" placeholder="Type report..." value={reportSearch}
                                onChange={(e) => setReportSearch(e.target.value)}
                                className="border p-2 pl-3 rounded w-full shadow-sm"/>
                            <FiSearch className="absolute right-3 top-3 text-gray-400" />
                        </div>
                        {reportSearch && (
                            <ul className="absolute bg-white border rounded shadow-lg w-full mt-1 max-h-40 overflow-auto">
                                {reports.filter(r => r.toLowerCase().includes(reportSearch.toLowerCase())).map((report, i) => (
                                    <li key={i} className="p-2 hover:bg-gray-200 cursor-pointer"
                                        onClick={() => handleReportSelect(report)}>
                                        {report}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button onClick={submitPrescription} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Submit Prescription
                    </button>
                </div>

                {/* Summary Table */}
                <div className="bg-white p-6 rounded-lg shadow-lg max-h-96 overflow-auto">
                    <h3 className="text-xl font-semibold mb-4">Summary</h3>
                    <table className="w-full border rounded-lg">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-2">Medicine</th>
                                <th className="p-2">Dosage</th>
                                <th className="p-2">Frequency</th>
                                <th className="p-2">Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedMedicines.map((med, i) => (
                                <tr key={i} className="border-t">
                                    <td className="p-2">{med.name}</td>
                                    <td className="p-2">{med.dosage}</td>
                                    <td className="p-2">{med.frequency} times/day</td>
                                    <td className="p-2 text-red-500 cursor-pointer" onClick={() => removeMedicine(i)}>
                                        <MdDelete />
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

export default Prescription;
