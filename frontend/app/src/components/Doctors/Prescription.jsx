import { useState, useEffect } from "react";
import { useLocation} from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import { FiClipboard, FiPlus } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // For better table formatting
import axios from 'axios';

function Prescription() {
    const location = useLocation();
    
    const [loading, setLoading] = useState(false);
    // const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const appointmentData = location.state?.appointment;
    const hospitalName = sessionStorage.getItem("hospitalName") || "Zydus";

    const [patient, setPatient] = useState({
        patientName: appointmentData?.patientName || "patient",
        patientEmail: appointmentData?.patientEmail || "",
        patientAge: "",
        patientGender: "",
        patientPhone: "",
        patientAddress: "",
        patientDOB: ""
    });
    const [department, setDepartment] = useState(appointmentData?.department || "General");
    // Available medicines from database
    const [availableMedicines, setAvailableMedicines] = useState([]);
    

    useEffect(() => {
        if (appointmentData?.patientEmail) {
            fetchPatientDetails(appointmentData.patientEmail);
        }
        // Fetch medicines based on hospital
        fetchAvailableMedicines();
        
        // Set common suggestions based on department
        if (appointmentData?.department) {
            setCommonSuggestions(
                commonSuggestionsList[appointmentData.department] || 
                commonSuggestionsList["General Medicine"]
            );
        }
    }, [appointmentData]);
    
    const fetchPatientDetails = async (patientEmail) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.post("http://localhost:8000/api/users/get-patient-by-email/", {
                email: patientEmail  // Using email parameter instead of patientId
            });
            
            if (response.data.status === "success") {
                const patientData = response.data.patient;
                
                // Calculate age from dateOfBirth
                let age = "";
                if (patientData.dateOfBirth) {
                    const birthDate = new Date(patientData.dateOfBirth);
                    const today = new Date();
                    age = today.getFullYear() - birthDate.getFullYear();
                    
                    // Adjust age if birthday hasn't occurred yet this year
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                }
                
                setPatient({
                    patientName: patientData.name || appointmentData?.patientName || "Unknown",
                    patientEmail: patientData.email || appointmentData?.patientEmail || "",
                    patientAge: age.toString(),
                    patientGender: patientData.gender || "",
                    patientPhone: patientData.contactNo || "",
                    patientAddress: patientData.address || "",
                    patientDOB: patientData.dateOfBirth || ""
                });
                
                // If patient has previous vitals, set them
                if (patientData.vitals) {
                    setVitals({
                        temperature: patientData.vitals.temperature || "",
                        bloodPressure: patientData.vitals.bloodPressure || "",
                        weight: patientData.vitals.weight || patientData.weight || "",
                        heartRate: patientData.vitals.heartRate || "",
                        oxygenLevel: patientData.vitals.oxygenLevel || "",
                        respiratoryRate: patientData.vitals.respiratoryRate || ""
                    });
                } else if (patientData.weight) {
                    // If there are no vitals but weight exists in patient data
                    setVitals(prev => ({
                        ...prev,
                        weight: patientData.weight
                    }));
                }
                
                setSuccess("Patient details loaded successfully");
            } else {
                throw new Error(response.data.message || "Failed to load patient details");
            }
        } catch (err) {
            console.error("Error fetching patient details:", err);
            setError("Failed to load patient details. Please check the patient email.");
        } finally {
            setLoading(false);
        }
    };
    
    // New function to fetch medicines from database based on hospital
    const fetchAvailableMedicines = async () => {
        try {
            setLoading(true);
            const response = await axios.post("http://localhost:8000/api/appointments/get-hospital-medicines/", {
                hospitalName: hospitalName,
                // department: appointmentData?.department
            });
            
            if (response.data.status === "success") {
                const medicines = response.data.medicines.map(med => ({
                    id: med._id,
                    name: med['Product Name'] || 'Unknown Medicine',
                    stock: med['Stock'] || 0,
                    price: med['Price (Per Unit/Strip)'] || 0
                }));
                setAvailableMedicines(medicines);
            } else {
                throw new Error(response.data.message || "Failed to load medicines");
            }
        } catch (err) {
            console.error("Error fetching medicines:", err);
            setError("Failed to load available medicines");
        } finally {
            setLoading(false);
        }
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

    // Format date helper function
    const formatDate = (dateString) => {
        if (!dateString) return "Not available";
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return "Invalid date"+ e;
        }
    };
    // Add this function to your component
    const savePrescription = async () => {
        try {
            setLoading(true);
            setError(null);
            const doctorName = sessionStorage.getItem("name") || "Doctor";
            const doctorEmail = sessionStorage.getItem("email") || "doctor@example.com";
            
            // Prepare data to be sent
            const prescriptionData = {
                // Patient information
                patientName: patient.patientName,
                patientEmail: patient.patientEmail,
                patientAge: patient.patientAge,
                patientGender: patient.patientGender,
                patientPhone: patient.patientPhone,
                patientAddress: patient.patientAddress,
                
                
                // Doctor information
                doctorName: doctorName,
                doctorEmail: doctorEmail,


                department: department,
                hospitalName: hospitalName,
                
                // Medical details
                vitals: vitals,
                medicines: selectedMedicines,
                suggestions: suggestions,
                
                // Reports
                reportType: reportType,
                reportValues: reportType === "manual" ? reportValues : null,
                
                // Appointment information if available
                appointmentId: appointmentData?._id || null,
            };
            

            
            // Send the data to the backend
            const response = await axios.post(
                "http://localhost:8000/api/appointments/save-prescription/", 
                prescriptionData

            );
            
            if (response.data.status === "success") {
                setSuccess("Prescription data sent successfully!");
                
            // Show alert notification
            alert("Prescription written successfully!");
            return true;
            } else {
                throw new Error(response.data.message || "Failed to send prescription data");
            }
        } catch (err) {
                // Check if this is actually a success message wrongly processed
            if (err.message === "Prescription saved successfully") {
                setSuccess("Prescription data saved successfully!");
                alert("Prescription written successfully!");
                return true;
            }
            
            console.error("Error sending prescription data:", err);
            setError(`Failed to save prescription data: ${err.message}`);
        return false;
        } finally {
            setLoading(false);
        }
    };
    const generateReport = () => {
        try {
            // Create a new PDF document
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            let yPos = 30; // Start a bit lower to accommodate header
    
            // Helper function for adding text
            const addText = (text, y, fontSize = 12, isBold = false, color = [0, 0, 0]) => {
                doc.setFontSize(fontSize);
                doc.setFont(undefined, isBold ? 'bold' : 'normal');
                doc.setTextColor(color[0], color[1], color[2]);
                doc.text(text, 20, y);
                return doc.getTextDimensions(text).h + y + 5;
            };
    
            // Add a stylish header with hospital logo
            doc.setFillColor(41, 82, 163); // Dark blue header
            doc.rect(0, 0, pageWidth, 22, 'F');
            
            // Add hospital name and tagline
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(hospitalName, 60, 15);
            
            // Add a simple logo (simulate with shapes since we can't import an image)
            doc.setFillColor(255, 255, 255);
            doc.circle(30, 11, 8, 'F'); // White circle
            doc.setFillColor(41, 82, 163);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            // Draw a medical cross
            doc.line(30, 7, 30, 15); // Vertical line
            doc.line(26, 11, 34, 11); // Horizontal line
    
            // Add date and prescription ID at top right
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 60, 10);
            doc.text(`Prescription ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, pageWidth - 60, 15);
            
            // Add a subtle background for the entire page
            doc.setFillColor(248, 250, 252); // Very light blue-gray
            doc.rect(0, 22, pageWidth, pageHeight - 22, 'F');
            
            // Reset text color for the main content
            doc.setTextColor(0, 0, 0);
            
            // Add decorative line under header
            doc.setDrawColor(41, 82, 163);
            doc.setLineWidth(0.5);
            doc.line(20, 26, pageWidth - 20, 26);
            
            // Document Title
            yPos = addText("MEDICAL PRESCRIPTION", yPos, 16, true, [41, 82, 163]);
            doc.setLineWidth(0.2);
            doc.line(20, yPos - 2, 120, yPos - 2);
            yPos += 5;
    
            // Patient Information Section
            doc.setDrawColor(41, 82, 163);
            doc.setFillColor(235, 245, 255); // Light blue background
            doc.roundedRect(15, yPos - 5, pageWidth - 30, 65, 3, 3, 'FD');
            
            yPos = addText('Patient Details', yPos, 14, true, [41, 82, 163]);
            
            // Two column layout for patient details
            const leftCol = 25;
            const rightCol = pageWidth / 2 + 5;
            
            // Left column fields
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text("Name:", leftCol, yPos + 5);
            doc.text("Age:", leftCol, yPos + 15);
            doc.text("Gender:", leftCol, yPos + 25);
            doc.text("Date of Birth:", leftCol, yPos + 35);
            
            // Right column fields
            doc.text("Email:", rightCol, yPos + 5);
            doc.text("Contact:", rightCol, yPos + 15);
            doc.text("Address:", rightCol, yPos + 25);
            
            // Left column values
            doc.setFont(undefined, 'normal');
            doc.text(patient.patientName || "Unknown", leftCol + 30, yPos + 5);
            doc.text(patient.patientAge || "N/A", leftCol + 30, yPos + 15);
            doc.text(patient.patientGender || "N/A", leftCol + 30, yPos + 25);
            doc.text(formatDate(patient.patientDOB) || "N/A", leftCol + 30, yPos + 35);
            
            // Right column values
            doc.text(patient.patientEmail || "N/A", rightCol + 30, yPos + 5);
            doc.text(patient.patientPhone || "N/A", rightCol + 30, yPos + 15);
            
            // Address might need multiple lines
            const address = patient.patientAddress || "N/A";
            const addressLines = doc.splitTextToSize(address, pageWidth / 2 - 40);
            doc.text(addressLines, rightCol + 30, yPos + 25);
            
            yPos += 50; // Move past the patient info box
            
            // Vital Signs Section
            doc.setDrawColor(41, 82, 163);
            doc.setFillColor(240, 249, 255); // Even lighter blue background
            doc.roundedRect(15, yPos - 5, pageWidth - 30, 50, 3, 3, 'FD');
            
            yPos = addText('Vital Signs', yPos, 14, true, [41, 82, 163]);
            
            // Display vitals in a 3-column grid
            let vitalsEntries = Object.entries(vitals).filter(([_, value]) => value);
            if (vitalsEntries.length > 0) {
                const cols = 3;
                const colWidth = (pageWidth - 40) / cols;
                
                vitalsEntries.forEach(([key, value], index) => {
                    const col = index % cols;
                    const row = Math.floor(index / cols);
                    const xPos = 25 + col * colWidth;
                    const rowYPos = yPos + 10 + row * 12;
                    
                    const label = key.replace(/([A-Z])/g, ' $1').trim();
                    
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(10);
                    doc.text(`${label}:`, xPos, rowYPos);
                    
                    doc.setFont(undefined, 'normal');
                    doc.text(value, xPos + 35, rowYPos);
                });
                
                // Adjust yPos based on number of rows
                yPos += 10 + Math.ceil(vitalsEntries.length / cols) * 12 + 5;
            } else {
                yPos = addText("No vital signs recorded", yPos + 10, 10, false, [100, 100, 100]);
            }
            
            yPos += 15;
            
            // Reports Section (if any)
            if (reportType !== "none") {
                doc.setDrawColor(41, 82, 163);
                doc.setFillColor(245, 250, 255); // Another light blue shade
                doc.roundedRect(15, yPos - 5, pageWidth - 30, 35 + (reportType === "manual" ? 30 : 0), 3, 3, 'FD');
                
                yPos = addText('Diagnostic Reports', yPos, 14, true, [41, 82, 163]);
                
                // Two-column layout for report info
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text("Department:", 25, yPos + 10);
                doc.text("Report Type:", 25, yPos + 22);
                
                doc.setFont(undefined, 'normal');
                doc.text(department, 85, yPos + 10);
                doc.text(reportType.charAt(0).toUpperCase() + reportType.slice(1), 85, yPos + 22);
                
                // If manual report, add the values
                if (reportType === "manual") {
                    yPos += 34;
                    
                    const reportEntries = Object.entries(reportValues).filter(([_, value]) => value);
                    if (reportEntries.length > 0) {
                        const cols = 3;
                        const colWidth = (pageWidth - 40) / cols;
                        
                        reportEntries.forEach(([key, value], index) => {
                            const col = index % cols;
                            const row = Math.floor(index / cols);
                            const xPos = 25 + col * colWidth;
                            const rowYPos = yPos + row * 12;
                            
                            const label = key.replace(/([A-Z])/g, ' $1').trim();
                            
                            doc.setFont(undefined, 'bold');
                            doc.setFontSize(10);
                            doc.text(`${label}:`, xPos, rowYPos);
                            
                            doc.setFont(undefined, 'normal');
                            doc.text(value, xPos + 35, rowYPos);
                        });
                        
                        // Adjust yPos based on number of rows
                        yPos += Math.ceil(reportEntries.length / cols) * 12;
                    }
                } else {
                    yPos += 35;
                }
            }
            
            // Prescribed Medicines Section
            if (selectedMedicines.length > 0) {
                doc.setDrawColor(41, 82, 163);
                doc.setFillColor(235, 245, 255);
                const medicineBoxHeight = selectedMedicines.length * 15 + 30;
                doc.roundedRect(15, yPos - 5, pageWidth - 30, medicineBoxHeight, 3, 3, 'FD');
                
                yPos = addText('Prescribed Medications', yPos, 14, true, [41, 82, 163]);
                yPos += 5;
                
                // Create styled table headers
                doc.setFillColor(41, 82, 163);
                doc.rect(20, yPos, pageWidth - 40, 10, 'F');
                
                const colWidth = (pageWidth - 40) / 3;
                
                // Table headers
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text('Medication', 25, yPos + 7);
                doc.text('Frequency', 25 + colWidth, yPos + 7);
                doc.text('Duration', 25 + (colWidth * 2), yPos + 7);
                
                yPos += 15;
                
                // Table rows
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                selectedMedicines.forEach((med, index) => {
                    const isEven = index % 2 === 0;
                    
                    if (isEven) {
                        doc.setFillColor(245, 250, 255); // Alternating row color
                        doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
                    }
                    
                    doc.setFont(undefined, 'bold');
                    doc.text(med.name || "", 25, yPos);
                    
                    doc.setFont(undefined, 'normal');
                    doc.text(med.frequency || "", 25 + colWidth, yPos);
                    doc.text(med.duration || "", 25 + (colWidth * 2), yPos);
                    
                    yPos += 10;
                });
                
                yPos += 5;
            }
            
            // Check if we need a new page for suggestions
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 30;
                
                // Add header to new page
                doc.setFillColor(41, 82, 163);
                doc.rect(0, 0, pageWidth, 22, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont(undefined, 'bold');
                doc.text(hospitalName, 60, 15);
                
                // Logo on new page
                doc.setFillColor(255, 255, 255);
                doc.circle(30, 11, 8, 'F');
                doc.setFillColor(41, 82, 163);
                doc.setDrawColor(255, 255, 255);
                doc.line(30, 7, 30, 15);
                doc.line(26, 11, 34, 11);
                
                // Page number
                doc.setFontSize(10);
                doc.text("Page 2", pageWidth - 30, 15);
            }
            
            // Doctor Suggestions
            if (suggestions) {
                doc.setDrawColor(41, 82, 163);
                doc.setFillColor(240, 249, 255);
                
                const suggestionLines = doc.splitTextToSize(suggestions, pageWidth - 50);
                const suggestionHeight = Math.max(40, suggestionLines.length * 7 + 20);
                
                doc.roundedRect(15, yPos - 5, pageWidth - 30, suggestionHeight, 3, 3, 'FD');
                
                yPos = addText('Doctor Recommendations', yPos, 14, true, [41, 82, 163]);
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(suggestionLines, 25, yPos + 10);
                
                yPos += suggestionHeight + 5;
            }
            
            // Footer with signature
            const footerY = pageHeight - 30;
            
            // Line for signature
            doc.setDrawColor(100, 100, 100);
            doc.line(pageWidth - 80, footerY, pageWidth - 20, footerY);
            
            // Text for signature
            doc.setFontSize(10);
            doc.text("Doctor's Signature", pageWidth - 80, footerY + 5);
            
            // Doctor's name
            const doctorName = sessionStorage.getItem("name") || "Doctor";
            doc.setFont(undefined, 'bold');
            doc.text(doctorName, pageWidth - 80, footerY + 12);
            
            // Hospital Stamp (simulated with a rounded rectangle and text)
            doc.setDrawColor(100, 100, 100);
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(25, footerY - 15, 60, 25, 3, 3, 'FD');
            doc.setFontSize(8);
            doc.text("OFFICIAL STAMP", 35, footerY - 5);
            doc.setFont(undefined, 'normal');
            doc.text(hospitalName, 35, footerY);
            doc.text("Verified " + new Date().toLocaleDateString(), 35, footerY + 5);
            
            // Bottom line
            doc.setDrawColor(41, 82, 163);
            doc.setLineWidth(1);
            doc.line(15, pageHeight - 10, pageWidth - 15, pageHeight - 10);
            
            // Contact info in footer
            doc.setFontSize(8);
            doc.text(`${hospitalName} | Phone: +123-456-7890 | Email: contact@hospital.com`, pageWidth/2, pageHeight - 5, { align: "center" });
            
            // Save the PDF with improved filename
            const safeName = patient.patientName 
                ? patient.patientName.replace(/[^\w\s]/gi, '_').replace(/\s+/g, '_')
                : "prescription";
            
            const safeDate = new Date().toLocaleDateString().replace(/\//g, '-');
            
            doc.save(`${hospitalName}_Prescription_${safeName}_${safeDate}.pdf`);
            
            // Save the prescription to database
            savePrescription();
            
            return true;
        } catch (error) {
            console.error("Error generating PDF:", error);
            setError(`Failed to generate report: ${error.message}`);
            return false;
        }
    };


    const updateMedicine = (index, field, value) => {
        const updatedMedicines = [...selectedMedicines];
        updatedMedicines[index][field] = value;
        setSelectedMedicines(updatedMedicines);
    };

    const filteredMedicines = medicineSearch.trim() !== "" 
    ? availableMedicines.filter(med => 
        med.name.toLowerCase().includes(medicineSearch.toLowerCase())
      )
    : [];

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
            <Slidebar userType="doctor" />
            <div className="flex flex-col flex-1 p-8 overflow-auto">
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
                                {existingReports.length > 0 ? (
                                    existingReports.map((report) => (
                                        <div key={report.id} className="flex items-center">
                                            <input type="checkbox" id={`report-${report.id}`} className="mr-2" />
                                            <label htmlFor={`report-${report.id}`}>{report.name}</label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No existing reports found for this patient</p>
                                )}
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
                                                    setMedicineSearch(medicine.name);
                                                    const newMedicine = {
                                                        name: medicine.name,
                                                        dosage: dosage,
                                                        frequency: frequency,
                                                        duration: duration,
                                                        medicineId: medicine._id
                                                    };
                                                    setSelectedMedicines([...selectedMedicines, newMedicine]);
                                                    setMedicineSearch("");
                                                }}
                                            >
                                                <span className="font-medium">{medicine.name}</span>
                                                <span className={`text-sm ${medicine.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {medicine.stock > 0 ? `In Stock: ${medicine.stock}` : 'Out of Stock'}
                                                </span>
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
                    <div className="flex justify-end mt-6 space-x-4">
                        <button 
                            onClick={generateReport}
                            className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg shadow-lg hover:from-blue-600 hover:to-green-600 flex items-center"
                        >
                            <FiClipboard className="mr-2" />
                            Generate PDF Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Prescription;