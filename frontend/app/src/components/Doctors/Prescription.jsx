import { useState } from "react";
import { useLocation } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import { FiClipboard, FiPlus } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // For better table formatting

function Prescription() {
    const location = useLocation();
    const appointment = location.state?.appointment || {
        patientName: "John Doe",
        patientAge: 35,
        patientGender: "Male",
        patientEmail: "john.doe@example.com",
        patientAddress: "123 Main St, City",
        patientPhone: "+1234567890"
    };

    const [vitals, setVitals] = useState({
        temperature: "",
        bloodPressure: "",
        weight: "",
        heartRate: "",
        oxygenLevel: "",
        respiratoryRate: ""
    });

    const [medicineSearch, setMedicineSearch] = useState("");
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [department, setDepartment] = useState("Orthopedic");
    const [reportType, setReportType] = useState("none");
    const [reportFile, setReportFile] = useState(null);
    const [existingReports, setExistingReports] = useState([]);
    const [reportValues, setReportValues] = useState({
        hemoglobin: "",
        whiteBloodCells: "",
        platelets: "",
        bloodSugar: "",
        creatinine: "",
        cholesterol: ""
    });
    const [suggestions, setSuggestions] = useState("");
    const [dosage, setDosage] = useState(1);
    const [frequency, setFrequency] = useState("1 time/day");
    const [duration, setDuration] = useState("7 days");
    const [commonSuggestions, setCommonSuggestions] = useState([]);

    const frequencyOptions = [
        "1 time/day",
        "2 times/day",
        "3 times/day",
        "4 times/day",
        "Once a week",
        "Twice a week",
        "As needed",
        "Before meals",
        "After meals",
        "Before bed"
    ];

    const durationOptions = [
        "1 day",
        "3 days",
        "5 days",
        "7 days",
        "10 days",
        "15 days",
        "1 month",
        "2 months",
        "3 months",
        "Continue"
    ];

    const departments = {
        "Orthopedic": ["Ibuprofen", "Diclofenac", "Naproxen", "Meloxicam", "Tramadol", "Celecoxib", "Aspirin", "Prednisone", "Methotrexate", "Etodolac"],
        "Pediatrician": ["Paracetamol", "Amoxicillin", "Cefixime", "Azithromycin", "Loratadine", "Salbutamol", "Montelukast", "Ondansetron", "Domperidone", "Ranitidine"],
        "Cardiology": ["Amlodipine", "Atenolol", "Clopidogrel", "Warfarin", "Enalapril", "Lisinopril", "Metoprolol", "Losartan", "Rosuvastatin", "Simvastatin"],
        "Neurology": ["Gabapentin", "Pregabalin", "Carbamazepine", "Levetiracetam", "Topiramate", "Valproate", "Lamotrigine", "Ropinirole", "Donepezil", "Memantine"],
        "Generic": ["Vitamin C", "Multivitamins", "Iron Supplements", "Calcium Tablets", "Probiotics", "Zinc Supplements", "Omega-3", "Melatonin", "Folic Acid", "Coenzyme Q10"]
    };

    const commonSuggestionsList = {
        "Orthopedic": [
            "Rest the affected area for 7 days",
            "Apply ice pack for 15-20 minutes every 3-4 hours",
            "Avoid strenuous activities for 2 weeks",
            "Use proper ergonomic support",
            "Schedule follow-up appointment in 14 days"
        ],
        "Cardiology": [
            "Maintain low-sodium diet",
            "Exercise regularly, 30 minutes daily",
            "Monitor blood pressure daily",
            "Avoid caffeine and alcohol",
            "Schedule follow-up appointment in 30 days"
        ],
        "Generic": [
            "Stay hydrated, drink 8-10 glasses of water daily",
            "Get adequate rest, 7-8 hours of sleep",
            "Follow a balanced diet",
            "Take medications as prescribed",
            "Return if symptoms worsen"
        ]
    };

    const handleVitalsChange = (e) => {
        setVitals({ ...vitals, [e.target.name]: e.target.value });
    };

    const handleReportValuesChange = (e) => {
        setReportValues({ ...reportValues, [e.target.name]: e.target.value });
    };

    const handleMedicineSelect = () => {
        if (medicineSearch.trim() === "") return;
        
        const newMedicine = {
            name: medicineSearch,
            dosage: dosage,
            frequency: frequency,
            duration: duration
        };
        
        setSelectedMedicines([...selectedMedicines, newMedicine]);
        setMedicineSearch("");
    };

    const removeMedicine = (index) => {
        const updatedMedicines = selectedMedicines.filter((_, i) => i !== index);
        setSelectedMedicines(updatedMedicines);
    };

    const handleReportSelection = (type) => {
        setReportType(type);
        setReportFile(null);
        
        // Load existing reports if selecting that option
        if (type === "existing") {
            // Simulate fetching existing reports
            setExistingReports([
                { id: 1, name: "Complete Blood Count (02/15/2025)" },
                { id: 2, name: "Lipid Profile (01/28/2025)" },
                { id: 3, name: "Liver Function Test (01/10/2025)" }
            ]);
        }
    };

    const addCommonSuggestion = (suggestion) => {
        setSuggestions(prev => prev ? `${prev}\n${suggestion}` : suggestion);
    };

    const handleDepartmentChange = (e) => {
        const newDepartment = e.target.value;
        setDepartment(newDepartment);
        // Update common suggestions based on department
        setCommonSuggestions(commonSuggestionsList[newDepartment] || commonSuggestionsList["Generic"]);
    };

    const generateReport = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        let yPos = 20;

        // Helper function for adding text
        const addText = (text, y, fontSize = 12, isBold = false) => {
            doc.setFontSize(fontSize);
            doc.setFont(undefined, isBold ? 'bold' : 'normal');
            doc.text(text, 20, y);
            return doc.getTextDimensions(text).h + y + 5;
        };

        // Title
        yPos = addText(`Prescription Report - ${new Date().toLocaleDateString()}`, yPos, 16, true);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;

        // Patient Information
        yPos = addText('Patient Information', yPos, 14, true);
        yPos = addText(`Name: ${appointment.patientName}`, yPos);
        yPos = addText(`Age: ${appointment.patientAge} | Gender: ${appointment.patientGender}`, yPos);
        yPos = addText(`Contact: ${appointment.patientPhone}`, yPos);
        yPos = addText(`Email: ${appointment.patientEmail}`, yPos);
        yPos = addText(`Address: ${appointment.patientAddress}`, yPos);
        yPos += 10;

        // Vital Signs
        yPos = addText('Vital Signs', yPos, 14, true);
        Object.entries(vitals).forEach(([key, value]) => {
            if (value) {
                yPos = addText(`${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`, yPos);
            }
        });
        yPos += 10;

        // Reports
        if (reportType !== "none") {
            yPos = addText('Reports', yPos, 14, true);
            yPos = addText(`Department: ${department}`, yPos);
            yPos = addText(`Report Type: ${reportType}`, yPos);

            if (reportType === "manual") {
                Object.entries(reportValues).forEach(([key, value]) => {
                    if (value) {
                        yPos = addText(`${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`, yPos);
                    }
                });
            }
            yPos += 10;
        }

        // Prescribed Medicines
        if (selectedMedicines.length > 0) {
            yPos = addText('Prescribed Medicines', yPos, 14, true);
            
            // Add medicines table
            const medicineData = selectedMedicines.map(med => [
                med.name,
                med.frequency,
                med.duration
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Medicine', 'Frequency', 'Duration']],
                body: medicineData,
                margin: { left: 20 },
                headStyles: { fillColor: [59, 130, 246] }, // Blue color
            });

            yPos = doc.previousAutoTable.finalY + 10;
        }

        // Doctor Suggestions
        if (suggestions) {
            yPos = addText('Doctor Suggestions', yPos, 14, true);
            const suggestionLines = doc.splitTextToSize(suggestions, pageWidth - 40);
            doc.text(suggestionLines, 20, yPos);
            yPos += (suggestionLines.length * 7) + 10;
        }

        // Footer
        doc.setFontSize(10);
        doc.text('Generated on: ' + new Date().toLocaleString(), 20, doc.internal.pageSize.height - 10);

        // Save the PDF
        doc.save(`prescription_${appointment.patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.pdf`);
    };

    const updateMedicine = (index, field, value) => {
        const updatedMedicines = [...selectedMedicines];
        updatedMedicines[index][field] = value;
        setSelectedMedicines(updatedMedicines);
    };

    // Add this function to filter medicines based on search
    const filteredMedicines = departments[department]?.filter(medicine =>
        medicine.toLowerCase().includes(medicineSearch.toLowerCase())
    ) || [];

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
            <Slidebar userType="doctor" />
            <div className="flex flex-col flex-1 p-8 overflow-auto">
                <h2 className="text-3xl font-bold mb-4 flex items-center text-blue-700">
                    <FiClipboard className="mr-2 text-green-600" /> Prescription for {appointment.patientName}
                </h2>

                {/* Patient Information */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold mb-4 text-blue-700">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <p className="text-gray-700"><strong className="text-blue-600">Name:</strong> {appointment.patientName}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Age:</strong> {appointment.patientAge}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Gender:</strong> {appointment.patientGender}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Email:</strong> {appointment.patientEmail}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Phone:</strong> {appointment.patientPhone}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Address:</strong> {appointment.patientAddress}</p>
                    </div>
                </div>

                {/* Patient Vitals */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-green-500">
                    <h3 className="text-xl font-semibold mb-4 text-blue-700">Patient Vitals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(vitals).map(([key, value]) => (
                            <div key={key} className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg">
                                <label className="text-gray-600 block mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter ${key}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Department Selection */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-indigo-500">
                    <h3 className="text-xl font-semibold mb-4 text-blue-700">Department & Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-600 block mb-2">Department:</label>
                            <select
                                value={department}
                                onChange={handleDepartmentChange}
                                className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {Object.keys(departments).map(dep => (
                                    <option key={dep} value={dep}>{dep}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-gray-600 block mb-2">Report Type:</label>
                            <select
                                value={reportType}
                                onChange={(e) => handleReportSelection(e.target.value)}
                                className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="none">None</option>
                                <option value="inHouse">Request New In-House Report</option>
                                <option value="outside">Upload Outside Report</option>
                                <option value="existing">Use Existing Reports</option>
                                <option value="manual">Enter Report Values Manually</option>
                            </select>
                        </div>
                    </div>

                    {reportType === "inHouse" && (
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mt-4">
                            <h4 className="font-medium mb-2">Select Tests to Order:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {["Complete Blood Count", "Lipid Profile", "Liver Function Test", "Kidney Function Test", "Thyroid Profile", "Blood Glucose"].map((test, i) => (
                                    <div key={i} className="flex items-center">
                                        <input type="checkbox" id={`test-${i}`} className="mr-2" />
                                        <label htmlFor={`test-${i}`}>{test}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {reportType === "outside" && (
                        <div className="mb-4">
                            <label className="text-gray-700 block mb-2">Upload Report:</label>
                            <input 
                                type="file" 
                                onChange={(e) => setReportFile(e.target.files[0])} 
                                className="border p-2 rounded w-full shadow-sm" 
                            />
                        </div>
                    )}

                    {reportType === "existing" && (
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Select Existing Reports:</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {existingReports.map((report) => (
                                    <div key={report.id} className="flex items-center">
                                        <input type="checkbox" id={`report-${report.id}`} className="mr-2" />
                                        <label htmlFor={`report-${report.id}`}>{report.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {reportType === "manual" && (
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Enter Report Values:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(reportValues).map(([key, value]) => (
                                    <div key={key} className="flex flex-col space-y-1">
                                        <label className="text-gray-700 capitalize">
                                            {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}:
                                        </label>
                                        <input 
                                            type="text" 
                                            name={key} 
                                            value={value} 
                                            onChange={handleReportValuesChange}
                                            className="border p-2 rounded shadow-sm"
                                            placeholder={`Enter ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Medicine Selection */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-blue-700">Medicines</h3>
                        <div className="flex flex-col relative w-64">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={medicineSearch}
                                    onChange={(e) => setMedicineSearch(e.target.value)}
                                    className="p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Search medicines..."
                                />
                                <button
                                    onClick={handleMedicineSelect}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600"
                                >
                                    <FiPlus className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {/* Medicine Suggestions Dropdown */}
                            {medicineSearch && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {filteredMedicines.length > 0 ? (
                                        filteredMedicines.map((medicine, index) => (
                                            <div
                                                key={index}
                                                className="p-2 hover:bg-blue-50 cursor-pointer"
                                                onClick={() => {
                                                    const newMedicine = {
                                                        name: medicine,
                                                        dosage: dosage,
                                                        frequency: frequency,
                                                        duration: duration
                                                    };
                                                    setSelectedMedicines([...selectedMedicines, newMedicine]);
                                                    setMedicineSearch("");
                                                }}
                                            >
                                                {medicine}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2 text-gray-500">No medicines found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected Medicines */}
                    <div className="space-y-2">
                        {selectedMedicines.map((medicine, index) => (
                            <div key={index} className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium text-blue-700">{medicine.name}</span>
                                    <button 
                                        onClick={() => removeMedicine(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <MdDelete size={20} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    
                                    <div>
                                        <label className="text-gray-600 text-sm block mb-1">Frequency</label>
                                        <select
                                            value={medicine.frequency}
                                            onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                                            className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        >
                                            <option value="">Select frequency</option>
                                            {frequencyOptions.map((freq, i) => (
                                                <option key={i} value={freq}>{freq}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-600 text-sm block mb-1">Duration</label>
                                        <select
                                            value={medicine.duration}
                                            onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                                            className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        >
                                            <option value="">Select duration</option>
                                            {durationOptions.map((dur, i) => (
                                                <option key={i} value={dur}>{dur}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Doctor Suggestions */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                    <h3 className="text-xl font-semibold mb-4">Doctor Suggestions</h3>
                    
                    {commonSuggestions.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-medium mb-2">Common Suggestions:</h4>
                            <div className="flex flex-wrap gap-2">
                                {commonSuggestions.map((suggestion, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => addCommonSuggestion(suggestion)}
                                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-full text-sm"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <textarea 
                        value={suggestions} 
                        onChange={(e) => setSuggestions(e.target.value)} 
                        className="border p-2 rounded w-full shadow-sm h-32" 
                        placeholder="Enter suggestions..."
                    ></textarea>
                </div>

                {/* Summary Section */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                    <h3 className="text-xl font-semibold mb-6 text-blue-700">Summary</h3>
                    
                    {/* Patient Information Summary */}
                    <div className="mb-6">
                        <h4 className="font-medium text-blue-600 mb-3 border-b pb-2">Patient Information</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <p><span className="font-medium">Name:</span> {appointment.patientName}</p>
                            <p><span className="font-medium">Age:</span> {appointment.patientAge}</p>
                            <p><span className="font-medium">Gender:</span> {appointment.patientGender}</p>
                            <p><span className="font-medium">Email:</span> {appointment.patientEmail}</p>
                            <p><span className="font-medium">Phone:</span> {appointment.patientPhone}</p>
                            <p><span className="font-medium">Address:</span> {appointment.patientAddress}</p>
                        </div>
                    </div>

                    {/* Vitals Summary */}
                    <div className="mb-6">
                        <h4 className="font-medium text-blue-600 mb-3 border-b pb-2">Vital Signs</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(vitals).map(([key, value]) => (
                                <p key={key}>
                                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    {" "}{value || "Not recorded"}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Reports Summary */}
                    <div className="mb-6">
                        <h4 className="font-medium text-blue-600 mb-3 border-b pb-2">Reports</h4>
                        <div className="space-y-2">
                            <p><span className="font-medium">Department:</span> {department}</p>
                            <p><span className="font-medium">Report Type:</span> {reportType}</p>
                            
                            {reportType === "manual" && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                    {Object.entries(reportValues).map(([key, value]) => (
                                        <p key={key}>
                                            <span className="font-medium capitalize">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                                            </span>
                                            {" "}{value || "Not recorded"}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Medicines Summary */}
                    <div className="mb-6">
                        <h4 className="font-medium text-blue-600 mb-3 border-b pb-2">Prescribed Medicines</h4>
                        {selectedMedicines.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full border rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-left">Medicine</th>
                                            <th className="p-2 text-center">Frequency</th>
                                            <th className="p-2 text-center">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedMedicines.map((med, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2">{med.name}</td>
                                                <td className="p-2 text-center">{med.frequency}</td>
                                                <td className="p-2 text-center">{med.duration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No medicines prescribed yet.</p>
                        )}
                    </div>

                    {/* Doctor Suggestions Summary */}
                    <div className="mb-6">
                        <h4 className="font-medium text-blue-600 mb-3 border-b pb-2">Doctor Suggestions</h4>
                        {suggestions ? (
                            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                                {suggestions}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No suggestions added yet.</p>
                        )}
                    </div>

                    {/* Generate Report Button */}
                    <div className="flex justify-end mt-6">
                        <button 
                            onClick={generateReport}
                            className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg shadow-lg hover:from-blue-600 hover:to-green-600 flex items-center"
                        >
                            <FiClipboard className="mr-2" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Prescription;