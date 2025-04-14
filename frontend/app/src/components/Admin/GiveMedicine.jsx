import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiClipboard, FiShoppingCart } from 'react-icons/fi';
import { MdClose } from 'react-icons/md';
import Slidebar from "../../pages/Slidebar";

const Givemedicine = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [availableMedicines, setAvailableMedicines] = useState([]);
    const [activeTab, setActiveTab] = useState('prescription');
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const hospitalName = sessionStorage.getItem('hospitalName') || 'Zydus';

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const response = await axios.post('http://localhost:8000/api/get_prescriptions/', {
                hospitalName: hospitalName
            });
            setPrescriptions(response.data.prescriptions);
        } catch (err) {
            setError('Failed to fetch prescriptions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableMedicines = async (medicineList) => {
        try {
            const response = await axios.post('http://localhost:8000/api/get-hospital-medicines/', {
                hospitalName: hospitalName,
                medicineNames: medicineList.map(med => med.name)
            });
            setAvailableMedicines(response.data.medicines);
        } catch (err) {
            console.error('Failed to fetch medicines:', err);
        }
    };

    const handlePrescriptionClick = async (prescription) => {
        setSelectedPrescription(prescription);
        if (prescription.medicines?.length > 0) {
            await fetchAvailableMedicines(prescription.medicines);
        }
    };

    const addToCart = (medicine) => {
        setSelectedMedicines(prev => [...prev, {
            ...medicine,
            quantity: 1,
            total: parseFloat(medicine['Price (Per Unit/Strip)'])
        }]);
    };

    const updateQuantity = (medicineId, quantity) => {
        setSelectedMedicines(prev => prev.map(med => 
            med._id === medicineId 
                ? { 
                    ...med, 
                    quantity, 
                    total: quantity * parseFloat(med['Price (Per Unit/Strip)'])
                } 
                : med
        ));
    };

    const calculateTotal = () => {
        return selectedMedicines.reduce((sum, med) => sum + med.total, 0);
    };

    const generateInvoice = async () => {
        try {
            const invoiceData = {
                prescriptionId: selectedPrescription._id,
                patientName: selectedPrescription.patientName,
                patientEmail: selectedPrescription.patientEmail,
                medicines: selectedMedicines,
                totalAmount: calculateTotal(),
                hospitalName: hospitalName
            };

            const response = await axios.post('http://localhost:8000/api/generate-invoice/', invoiceData);
            
            // Handle successful invoice generation
            alert('Invoice generated successfully!');
            fetchPrescriptions(); // Refresh prescriptions
            // Reset selected medicines
            setSelectedMedicines([]);
            setSelectedPrescription(null);
        } catch (err) {
            console.error('Failed to generate invoice:', err);
            alert('Failed to generate invoice');
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Slidebar userType="admin" activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="container mx-auto p-6 mt-16">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-green-500">
                <h1 className="text-2xl font-bold text-blue-800 flex items-center">
                    <FiClipboard className="mr-3 text-green-600" />
                    Hospital Pharmacy Management
                </h1>
            </div>

            {loading && (
                <div className="flex justify-center my-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4">
                    <p className="font-medium">Error</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prescriptions.map(prescription => (
                    <div 
                        key={prescription._id}
                        onClick={() => handlePrescriptionClick(prescription)}
                        className={`bg-white rounded-lg shadow-lg hover:shadow-xl 
                            transition-all duration-300 cursor-pointer overflow-hidden group
                            ${prescription.status === 'completed' ? 'opacity-50' : ''}`}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-green-500 p-1">
                            <div className="bg-white p-4">
                                <h3 className="font-bold text-lg text-blue-800 mb-2 group-hover:text-green-600 transition-colors">
                                    {prescription.patientName}
                                </h3>
                                <div className="space-y-2 text-gray-600">
                                    <p className="flex items-center">
                                        <span className="font-medium text-green-600 mr-2">Doctor:</span>
                                        Dr. {prescription.doctorName}
                                    </p>
                                    <p className="flex items-center">
                                        <span className="font-medium text-green-600 mr-2">Date:</span>
                                        {new Date(prescription.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="flex items-center">
                                        <span className="font-medium text-green-600 mr-2">Medicines:</span>
                                        {prescription.medicines?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Prescription Details Modal */}
            {selectedPrescription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-blue-800">Prescription Details</h2>
                                <button 
                                    onClick={() => setSelectedPrescription(null)}
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    <MdClose size={24} />
                                </button>
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-1 rounded-lg shadow-lg">
                                    <div className="bg-white p-4 rounded-lg">
                                        <h3 className="font-bold text-blue-800 mb-3">Patient Information</h3>
                                        <div className="space-y-2 text-gray-700">
                                            <p><span className="font-medium text-blue-600">Name:</span> {selectedPrescription.patientName}</p>
                                            <p><span className="font-medium text-blue-600">Email:</span> {selectedPrescription.patientEmail}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-1 rounded-lg shadow-lg">
                                    <div className="bg-white p-4 rounded-lg">
                                        <h3 className="font-bold text-green-800 mb-3">Doctor Information</h3>
                                        <div className="space-y-2 text-gray-700">
                                            <p><span className="font-medium text-green-600">Name:</span> Dr. {selectedPrescription.doctorName}</p>
                                            <p><span className="font-medium text-green-600">Department:</span> {selectedPrescription.department}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Medicines Section */}
                            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                                <h3 className="text-xl font-bold text-blue-800 mb-4">Available Medicines</h3>
                                <div className="space-y-4">
                                    {availableMedicines.map(medicine => (
                                        <div key={medicine._id} 
                                            className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg flex justify-between items-center group hover:shadow-lg transition-all duration-300">
                                            <div>
                                                <p className="font-bold text-blue-700">{medicine['Product Name']}</p>
                                                <p className="text-sm text-gray-600">Stock: {medicine.Stock}</p>
                                                <p className="text-sm text-green-600 font-medium">₹{medicine['Price (Per Unit/Strip)']} per unit</p>
                                            </div>
                                            {!selectedMedicines.find(m => m._id === medicine._id) && (
                                                <button
                                                    onClick={() => addToCart(medicine)}
                                                    className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-2 rounded-lg
                                                             hover:from-blue-600 hover:to-green-600 transform hover:scale-105 transition-all duration-300
                                                             shadow-md hover:shadow-lg"
                                                >
                                                    Add to Cart
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Section */}
                            {selectedMedicines.length > 0 && (
                                <div className="bg-white rounded-lg shadow-lg p-6">
                                    <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                                        <FiShoppingCart className="mr-2" />
                                        Selected Medicines
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedMedicines.map(medicine => (
                                            <div key={medicine._id} 
                                                className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-blue-700">{medicine['Product Name']}</p>
                                                    <p className="text-green-600">₹{medicine['Price (Per Unit/Strip)']} per unit</p>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={medicine.Stock}
                                                        value={medicine.quantity}
                                                        onChange={(e) => updateQuantity(medicine._id, parseInt(e.target.value))}
                                                        className="w-20 p-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    />
                                                    <p className="font-bold text-green-600">₹{medicine.total}</p>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold">Total Amount:</span>
                                                <span className="text-2xl font-bold">₹{calculateTotal()}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={generateInvoice}
                                            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg
                                                     hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300
                                                     font-bold text-lg shadow-lg hover:shadow-xl"
                                        >
                                            Generate Invoice
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};


export default Givemedicine;