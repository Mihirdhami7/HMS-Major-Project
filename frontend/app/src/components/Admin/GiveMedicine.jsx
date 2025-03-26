import { useState, useEffect } from 'react';
import axios from 'axios';
import Slidebar from '../../pages/Slidebar';
import { useNavigate } from 'react-router-dom';

const GiveMedicine = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPrescription, setSelectedPrescription] = useState(null);

    const navigate = useNavigate();
    
    // Fetch prescriptions when component mounts
    useEffect(() => {
        fetchPrescriptions();
    }, []);

    // Updated fetchPrescriptions function to handle ObjectId serialization issues
    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("Fetching prescriptions...");
            
            // Try with the custom Content-Type to force parsing as text first
            const response = await axios.get('http://localhost:8000/api/get_prescriptions/', {
                headers: {
                    'Accept': 'application/json, text/plain, */*'
                }
            }).catch(error => {
                console.error("API error:", error);
                if (error.response) {
                    throw new Error(`Server error: ${error.response.data.message || error.response.status}`);
                } else if (error.request) {
                    throw new Error("No response from server. Please check if the backend is running.");
                } else {
                    throw new Error(`Request error: ${error.message}`);
                }
            });
            
            console.log("API Response:", response?.data);
            
            // More flexible response handling
            if (response?.data) {
                let prescriptionsData;
                
                // Try to extract prescriptions based on different possible response formats
                if (Array.isArray(response.data)) {
                    prescriptionsData = response.data;
                } else if (response.data.prescriptions && Array.isArray(response.data.prescriptions)) {
                    prescriptionsData = response.data.prescriptions;
                } else if (response.data.status === 'success' && response.data.data) {
                    prescriptionsData = Array.isArray(response.data.data) ? 
                        response.data.data : [response.data.data];
                } else if (typeof response.data === 'object') {
                    // Try to extract any array in the response
                    const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
                    if (possibleArrays.length > 0) {
                        prescriptionsData = possibleArrays[0];
                    }
                }
                
                if (prescriptionsData && prescriptionsData.length > 0) {
                    setPrescriptions(prescriptionsData);
                    console.log("Prescriptions loaded successfully:", prescriptionsData.length);
                } else {
                    setPrescriptions([]);
                    console.log("No prescriptions found in the response");
                }
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (err) {
            console.error("Error details:", err);
            setError(`Failed to load prescriptions: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Added function to show prescription details
    const viewPrescriptionDetails = (prescription) => {
        setSelectedPrescription(prescription);
    };

    // Added function to close the details view
    const closeDetails = () => {
        setSelectedPrescription(null);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <Slidebar userType="admin" />
            <div className="flex-1 p-8 overflow-auto">
                <h1 className="text-2xl font-bold mb-6">Provide Medicine</h1>
                
                {error && (
                    <div className="mb-6 bg-red-100 p-4 rounded shadow border border-red-300">
                        <p className="text-red-600">{error}</p>
                        <div className="flex gap-2 mt-2">
                            <button 
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={fetchPrescriptions}
                            >
                                Retry
                            </button>
                            <button 
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                onClick={() => {
                                    // Use mock data for testing
                                    setPrescriptions([
                                        {
                                            _id: "1",
                                            patientName: "John Doe",
                                            doctorName: "Dr. Smith",
                                            date: new Date().toISOString(),
                                            medicines: [
                                                { name: "Aspirin", dosage: "100mg", frequency: "Once daily" },
                                                { name: "Paracetamol", dosage: "500mg", frequency: "As needed" }
                                            ],
                                            status: "pending"
                                        },
                                        {
                                            _id: "2",
                                            patientName: "Jane Smith",
                                            doctorName: "Dr. Johnson",
                                            date: new Date().toISOString(),
                                            medicines: [
                                                { name: "Amoxicillin", dosage: "250mg", frequency: "Three times daily" }
                                            ],
                                            status: "pending"
                                        }
                                    ]);
                                    setError(null);
                                    setLoading(false);
                                }}
                            >
                                Use Mock Data
                            </button>
                        </div>
                    </div>
                )}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <p className="mb-2">Loading prescriptions...</p>
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {prescriptions.length === 0 && !error ? (
                            <div className="bg-yellow-50 p-4 rounded shadow border border-yellow-300 mb-4">
                                <p className="text-yellow-700">No prescriptions found.</p>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xl font-semibold mb-4">Available Prescriptions</h2>
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {prescriptions.map((prescription, index) => (
                                        <div 
                                            key={prescription._id || index} 
                                            className="bg-white p-4 rounded shadow hover:shadow-lg transition-shadow cursor-pointer"
                                            onClick={() => viewPrescriptionDetails(prescription)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg">{prescription.patientName || 'Unknown Patient'}</h3>
                                                    <p className="text-gray-600">{prescription.doctorName || 'Unknown Doctor'}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    prescription.status === 'dispensed' ? 'bg-green-100 text-green-800' : 
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {prescription.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-sm">
                                                    <span className="font-semibold">Date: </span>
                                                    {new Date(prescription.date || prescription.createdAt || Date.now()).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm mt-1">
                                                    <span className="font-semibold">Medicines: </span>
                                                    {prescription.medicines?.length || 0} items
                                                </p>
                                            </div>
                                            <button 
                                                className="w-full mt-3 bg-blue-500 text-white py-1 rounded hover:bg-blue-600 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    viewPrescriptionDetails(prescription);
                                                }}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Prescription Detail Modal */}
                {selectedPrescription && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold">Prescription Details</h2>
                                    <button 
                                        className="text-gray-500 hover:text-gray-700"
                                        onClick={closeDetails}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold">Patient Information</h3>
                                    <p className="text-gray-700">
                                        <span className="font-medium">Name:</span> {selectedPrescription.patientName || 'Not available'}
                                    </p>
                                    <p className="text-gray-700">
                                        <span className="font-medium">ID:</span> {selectedPrescription.patientId || 'Not available'}
                                    </p>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold">Doctor Information</h3>
                                    <p className="text-gray-700">
                                        <span className="font-medium">Name:</span> {selectedPrescription.doctorName || 'Not available'}
                                    </p>
                                    <p className="text-gray-700">
                                        <span className="font-medium">Department:</span> {selectedPrescription.department || 'Not available'}
                                    </p>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold">Prescribed Medicines</h3>
                                    {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 ? (
                                        <table className="w-full border-collapse mt-2">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border p-2 text-left">Medicine Name</th>
                                                    <th className="border p-2 text-left">Dosage</th>
                                                    <th className="border p-2 text-left">Frequency</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPrescription.medicines.map((medicine, index) => (
                                                    <tr key={index} className="border hover:bg-gray-50">
                                                        <td className="border p-2">{medicine.name || 'Not specified'}</td>
                                                        <td className="border p-2">{medicine.dosage || 'Not specified'}</td>
                                                        <td className="border p-2">{medicine.frequency || 'Not specified'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="text-gray-500 italic">No medicines listed in this prescription.</p>
                                    )}
                                </div>
                                
                                {selectedPrescription.notes && (
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold">Notes</h3>
                                        <p className="text-gray-700 whitespace-pre-line">{selectedPrescription.notes}</p>
                                    </div>
                                )}
                                
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button 
                                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                        onClick={() => {
                                            // Store the current prescription ID in session storage for reference
                                            sessionStorage.setItem("currentPrescriptionId", selectedPrescription._id || "");
                                            navigate("/admin/givemedicine/medicine");
                                        }}
                                    >
                                        Give Medicine
                                    </button>
                                    <button 
                                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                                        onClick={closeDetails}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GiveMedicine;