import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import Slidebar from "../../components/Sidebar";
import { FiClipboard, FiPlus } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import { pickList } from "../../services/apiClient";
import { searchPatient } from "../../services/userService";
import { getMyHospitalMedicines, savePrescription as savePrescriptionAPI, emailPrescription } from "../../services/appointmentsService";
import { createMedicineRequest } from "../../services/orderService";
import AddMedicineDialog from "../../components/doctor/AddMedicineDialog";

// Report types accepted by the backend (PrescriptionSerializer.validate_reports)
const REPORT_TYPES = [
    { value: "none", label: "None" },
    { value: "blood_test", label: "Blood Test" },
    { value: "xray", label: "X-Ray" },
    { value: "ct_scan", label: "CT Scan" },
    { value: "mri", label: "MRI" },
    { value: "ultrasound", label: "Ultrasound" },
    { value: "ecg", label: "ECG" },
    { value: "other", label: "Other" },
];

// Vitals accepted by the backend (PrescriptionSerializer.validate_vitals)
const EMPTY_VITALS = {
    temperature: "",
    bloodPressure: "",
    weight: "",
    height: "",
    heartRate: "",
    oxygenLevel: "",
};

const EMPTY_BLOOD_VALUES = {
    hemoglobin: "",
    whiteBloodCells: "",
    platelets: "",
    bloodSugar: "",
    creatinine: "",
    cholesterol: "",
};

// UI-only text suggestions the doctor can click to append to the notes.
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

const ageFromDob = (dob) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return String(age);
};

function Prescription() {
    const location = useLocation();
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [medicinesError, setMedicinesError] = useState(null);
    const [savedPrescriptionId, setSavedPrescriptionId] = useState(null);
    const appointmentData = location.state?.appointment;
    const hospitalName = appointmentData?.hospitalName || user?.hospitalName || "";

    const apptPatient = appointmentData?.patient || {};
    const [patient, setPatient] = useState({
        patientName: apptPatient.name || "",
        patientEmail: apptPatient.email || "",
        patientAge: ageFromDob(apptPatient.dateOfBirth),
        patientGender: apptPatient.gender || "",
        patientPhone: apptPatient.contactNo || "",
        patientAddress: "",
        patientDOB: apptPatient.dateOfBirth || ""
    });
    const department = appointmentData?.department || "";
    const [availableMedicines, setAvailableMedicines] = useState([]);

    const [vitals, setVitals] = useState(EMPTY_VITALS);
    const [medicineSearch, setMedicineSearch] = useState("");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [reportType, setReportType] = useState("none");
    const [reportValues, setReportValues] = useState(EMPTY_BLOOD_VALUES);
    const [reportNotes, setReportNotes] = useState("");
    const [suggestions, setSuggestions] = useState("");

    const commonSuggestions = commonSuggestionsList[department] || commonSuggestionsList.Generic;

    useEffect(() => {
        if (!token || !appointmentData) return undefined;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const [medsRes, patientRes] = await Promise.all([
                getMyHospitalMedicines(token),
                appointmentData.patient?.email
                    ? searchPatient(token, appointmentData.patient.email)
                    : Promise.resolve(null),
            ]);
            if (cancelled) return;

            if (medsRes.success) {
                setAvailableMedicines(
                    pickList(medsRes, "medicines").map((med) => ({
                        id: med._id || med.id,
                        name: med.product_name || "Unknown Medicine",
                        type: med.product_type || "",
                        stock: Number(med.stock) || 0,
                        price: Number(med.price_per_strip) || 0,
                    }))
                );
                setMedicinesError(null);
            } else {
                setMedicinesError(medsRes.message || "Failed to load available medicines");
            }

            // Patient lookup only enriches the data already embedded in the appointment.
            if (patientRes?.success && patientRes.data?.patient) {
                const p = patientRes.data.patient;
                setPatient((prev) => ({
                    patientName: p.name || prev.patientName,
                    patientEmail: p.email || prev.patientEmail,
                    patientAge: ageFromDob(p.dateOfBirth) || prev.patientAge,
                    patientGender: p.gender || prev.patientGender,
                    patientPhone: p.contactNo || prev.patientPhone,
                    patientAddress: p.address || prev.patientAddress,
                    patientDOB: p.dateOfBirth || prev.patientDOB,
                }));
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [token, appointmentData]);

    const handleVitalsChange = (e) => {
        setVitals({ ...vitals, [e.target.name]: e.target.value });
    };

    const handleReportValuesChange = (e) => {
        setReportValues({ ...reportValues, [e.target.name]: e.target.value });
    };

    const addMedicine = (medicine) => {
        if (!medicine) return;
        setMedicineSearch("");
        if (selectedMedicines.some((m) => m.medicineId === medicine.id)) return;
        setSelectedMedicines([
            ...selectedMedicines,
            {
                medicineId: medicine.id,
                name: medicine.name,
                price: medicine.price,
                stock: medicine.stock,
                quantity: 1,
                dosage: "1 tablet",
                frequency: "1 time/day",
                duration: "7 days",
            },
        ]);
    };

    /** Medicine not in the hospital pharmacy: patient buys it outside (₹0 on the hospital bill). */
    const addOutsideMedicine = (name) => {
        const clean = (name || "").trim();
        if (!clean) return;
        setMedicineSearch("");
        if (selectedMedicines.some((m) => m.name.toLowerCase() === clean.toLowerCase())) return;
        setSelectedMedicines([
            ...selectedMedicines,
            {
                key: `outside-${Date.now()}`,
                medicineId: null,
                outside: true,
                name: clean,
                price: 0,
                stock: null,
                quantity: 1,
                dosage: "1 tablet",
                frequency: "1 time/day",
                duration: "7 days",
            },
        ]);
    };

    const requestMedicine = (data) => createMedicineRequest(token, data);

    const removeMedicine = (index) => {
        setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
    };

    const addCommonSuggestion = (suggestion) => {
        setSuggestions(prev => prev ? `${prev}\n${suggestion}` : suggestion);
    };

    // Format date helper function
    const formatDate = (dateString) => {
        if (!dateString) return "Not available";
        const d = new Date(dateString);
        return Number.isNaN(d.getTime()) ? "Invalid date" : d.toLocaleDateString();
    };

    /** Build the body exactly as PrescriptionSerializer (save-prescription/) expects. */
    const buildPayload = () => {
        const cleanVitals = Object.fromEntries(
            Object.entries(vitals).filter(([, v]) => String(v).trim() !== "")
        );
        let reports = null;
        if (reportType === "blood_test") {
            const values = Object.fromEntries(
                Object.entries(reportValues).filter(([, v]) => String(v).trim() !== "")
            );
            reports = { reportType, reportValues: Object.keys(values).length ? values : null };
        } else if (reportType !== "none") {
            reports = { reportType, reportValues: reportNotes.trim() ? { notes: reportNotes.trim() } : null };
        }
        const age = parseInt(patient.patientAge, 10);
        return {
            appointmentId: appointmentData._id,
            ...(Number.isFinite(age) && { patientAge: age }),
            ...(patient.patientPhone && { patientPhone: patient.patientPhone }),
            ...(patient.patientAddress && { patientAddress: patient.patientAddress }),
            vitals: Object.keys(cleanVitals).length ? cleanVitals : null,
            medicines: selectedMedicines.map((m) => ({
                medicineId: m.medicineId,
                name: m.name,
                quantity: parseInt(m.quantity, 10),
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                price: Number(m.price),
                ...(m.outside && { outside: true }),
            })),
            suggestions,
            reports,
        };
    };

    /** Returns the new prescription id, or null on failure. */
    const savePrescription = async () => {
        setError(null);
        setSuccess(null);
        if (!appointmentData?._id) {
            setError("No appointment selected.");
            return null;
        }
        if (selectedMedicines.length === 0) {
            setError("Add at least one medicine.");
            return null;
        }
        const bad = selectedMedicines.find(
            (m) => !(parseInt(m.quantity, 10) > 0) || !String(m.dosage).trim() || !m.duration
        );
        if (bad) {
            setError(`Check quantity, dosage and duration for ${bad.name}.`);
            return null;
        }
        setLoading(true);
        const result = await savePrescriptionAPI(token, buildPayload());
        setLoading(false);
        if (!result.success) {
            setError(result.message || "Failed to save prescription");
            return null;
        }
        const id = result.data?.prescription?._id || "";
        setSavedPrescriptionId(id || "saved");
        setSuccess(result.message || "Prescription saved successfully");
        return id;
    };

    /** The server builds the PDF and emails it to the patient from the system mailbox. */
    const resendEmail = async () => {
        if (!savedPrescriptionId || savedPrescriptionId === "saved") return;
        setError(null);
        const result = await emailPrescription(token, savedPrescriptionId);
        if (result.success) setSuccess(result.message || "The prescription PDF is being sent to the patient.");
        else setError(result.message || "Could not send the email.");
    };


    const updateMedicine = (index, field, value) => {
        setSelectedMedicines((prev) =>
            prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
        );
    };

    const filteredMedicines = medicineSearch.trim() !== "" 
    ? availableMedicines.filter(med => 
        med.name.toLowerCase().includes(medicineSearch.toLowerCase())
      )
    : [];

    if (!appointmentData) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
                <Slidebar />
                <div className="flex flex-col flex-1 p-8 overflow-auto mt-16">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <h3 className="text-xl font-semibold mb-2 text-gray-700">No appointment selected</h3>
                        <p className="text-gray-500 mb-4">
                            Open this page from an approved appointment to write a prescription.
                        </p>
                        <Link to="/doctor/appointments" className="text-blue-600 hover:underline">
                            Go to appointments
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
            <Slidebar />
            <div className="flex flex-col flex-1 p-8 overflow-auto mt-16">
                <h2 className="text-3xl font-bold mb-4 flex items-center text-blue-700">
                    <FiClipboard className="mr-2 text-green-600" /> Prescription for {patient.patientName}
                </h2>

                {loading && (
                    <div className="w-full flex justify-center my-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        <p>{success}</p>
                    </div>
                )}

                {/* Patient Information */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold mb-4 text-blue-700">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <p className="text-gray-700"><strong className="text-blue-600">Name:</strong> {patient.patientName}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Age:</strong> {patient.patientAge}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Gender:</strong> {patient.patientGender}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Date of Birth:</strong> {formatDate(patient.patientDOB)}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Email:</strong> {patient.patientEmail}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Phone:</strong> {patient.patientPhone}</p>
                        <p className="text-gray-700"><strong className="text-blue-600">Address:</strong> {patient.patientAddress}</p>
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
                                    name={key}
                                    value={value}
                                    onChange={handleVitalsChange}
                                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter ${key}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reports Section */}
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-indigo-500">
                    <h3 className="text-xl font-semibold mb-4 text-blue-700">Department & Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-600 block mb-2">Department:</label>
                            <input
                                type="text"
                                value={department}
                                disabled
                                className="w-full p-2 border border-blue-200 rounded-lg bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="text-gray-600 block mb-2">Report Type:</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {REPORT_TYPES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {reportType !== "none" && reportType !== "blood_test" && (
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mt-4">
                            <label className="text-gray-700 block mb-2">Findings / notes:</label>
                            <textarea
                                value={reportNotes}
                                onChange={(e) => setReportNotes(e.target.value)}
                                className="border p-2 rounded w-full shadow-sm h-20"
                                placeholder="Enter report findings or the tests to perform"
                            />
                        </div>
                    )}

                    {reportType === "blood_test" && (
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mt-4">
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
                                    onClick={() => setShowAddDialog(true)}
                                    title="Add medicine"
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600"
                                >
                                    <FiPlus className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {/* Inventory medicines dropdown */}
                            {medicineSearch && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {filteredMedicines.length > 0 ? (
                                        filteredMedicines.map((medicine) => (
                                            <div
                                                key={medicine.id}
                                                className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between gap-2"
                                                onClick={() => addMedicine(medicine)}
                                            >
                                                <span className="font-medium">{medicine.name}</span>
                                                <span className={`text-sm ${medicine.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {medicine.stock > 0 ? `In Stock: ${medicine.stock}` : 'Out of Stock'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <button
                                            onClick={() => setShowAddDialog(true)}
                                            className="w-full text-left p-2 text-sm text-blue-700 hover:bg-blue-50"
                                        >
                                            Not in pharmacy — prescribe outside or request it…
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <AddMedicineDialog
                        open={showAddDialog}
                        onClose={() => setShowAddDialog(false)}
                        medicines={availableMedicines}
                        initialQuery={medicineSearch}
                        selectedIds={selectedMedicines.map((m) => m.medicineId).filter(Boolean)}
                        onAdd={addMedicine}
                        onAddOutside={addOutsideMedicine}
                        onRequest={requestMedicine}
                    />

                    {medicinesError && (
                        <p className="text-sm text-red-600 mb-2">{medicinesError}</p>
                    )}
                    {!medicinesError && !loading && availableMedicines.length === 0 && (
                        <p className="text-sm text-yellow-700 mb-2">
                            No in-stock medicines were returned for {hospitalName || "your hospital"}.
                        </p>
                    )}

                    {/* Selected Medicines */}
                    <div className="space-y-2">
                        {selectedMedicines.map((medicine, index) => (
                            <div key={medicine.medicineId || medicine.key} className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium text-blue-700">
                                        {medicine.name}
                                        {medicine.outside && (
                                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Buy outside</span>
                                        )}
                                    </span>
                                    <button 
                                        onClick={() => removeMedicine(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <MdDelete size={20} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div>
                                        <label className="text-gray-600 text-sm block mb-1">Dosage</label>
                                        <input
                                            type="text"
                                            value={medicine.dosage}
                                            onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                                            className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            placeholder="e.g. 1 tablet"
                                        />
                                    </div>
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
                                    <div>
                                        <label className="text-gray-600 text-sm block mb-1">Quantity (strips)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={medicine.outside ? undefined : medicine.stock || undefined}
                                            value={medicine.quantity}
                                            onChange={(e) => updateMedicine(index, 'quantity', e.target.value)}
                                            className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-600 text-sm block mb-1">Price / strip</label>
                                        <p className="p-2 text-gray-700">
                                            {medicine.outside ? "Not in pharmacy" : `₹${medicine.price} (stock ${medicine.stock})`}
                                        </p>
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
                    
                    {/* Patient Information Summary - Fixed: using patient instead of appointment */}
                    <div className="mb-6">
                        <h4 className="font-medium text-blue-600 mb-3 border-b pb-2">Patient Information</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <p><span className="font-medium">Name:</span> {patient.patientName}</p>
                            <p><span className="font-medium">Age:</span> {patient.patientAge}</p>
                            <p><span className="font-medium">Gender:</span> {patient.patientGender}</p>
                            <p><span className="font-medium">Date of Birth:</span> {formatDate(patient.patientDOB)}</p>
                            <p><span className="font-medium">Email:</span> {patient.patientEmail}</p>
                            <p><span className="font-medium">Phone:</span> {patient.patientPhone}</p>
                            <p><span className="font-medium">Address:</span> {patient.patientAddress}</p>
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
                            <p><span className="font-medium">Report Type:</span> {REPORT_TYPES.find((r) => r.value === reportType)?.label}</p>
                            {reportType !== "none" && reportType !== "blood_test" && reportNotes && (
                                <p className="whitespace-pre-wrap">{reportNotes}</p>
                            )}

                            {reportType === "blood_test" && (
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
                                            <th className="p-2 text-center">Dosage</th>
                                            <th className="p-2 text-center">Duration</th>
                                            <th className="p-2 text-center">Qty</th>
                                            <th className="p-2 text-center">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedMedicines.map((med, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2">{med.name}</td>
                                                <td className="p-2 text-center">{med.dosage} · {med.frequency}</td>
                                                <td className="p-2 text-center">{med.duration}</td>
                                                <td className="p-2 text-center">{med.quantity}</td>
                                                <td className="p-2 text-center">₹{((Number(med.quantity) || 0) * (Number(med.price) || 0)).toFixed(2)}</td>
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

                    {/* Save: PDF is generated on the server and emailed to the patient */}
                    <div className="flex flex-wrap justify-end items-center mt-6 gap-3">
                        {savedPrescriptionId ? (
                            <>
                                <span className="text-sm text-green-700 mr-auto">
                                    ✓ Saved. The PDF is emailed to {patient?.patientEmail || "the patient"}; they can also view it in their account.
                                </span>
                                <button
                                    onClick={resendEmail}
                                    className="px-5 py-3 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center"
                                >
                                    <FiClipboard className="mr-2" />
                                    Resend email
                                </button>
                                <button
                                    onClick={() => navigate("/doctor/appointments")}
                                    className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg shadow-lg hover:from-blue-600 hover:to-green-600"
                                >
                                    Back to appointments
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={savePrescription}
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg shadow-lg hover:from-blue-600 hover:to-green-600 flex items-center disabled:opacity-50"
                            >
                                <FiClipboard className="mr-2" />
                                {loading ? "Saving..." : "Save Prescription & Email PDF"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Prescription;