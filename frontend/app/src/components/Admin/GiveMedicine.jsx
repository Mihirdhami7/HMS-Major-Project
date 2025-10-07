import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiClipboard, FiShoppingCart, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
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


    const [gmloading, setGmLoading] = useState(false);
    const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
    const [reports, setReports] = useState([]); // State to store final reports

    const handleRefreshClick = () => {
        fetchPrescriptions(); // Fetch prescriptions again
    };
    
    const handleGenerateInvoiceClick = () => {
        setShowInvoiceDialog(true);
    };
    const closeInvoiceDialog = () => {
        setShowInvoiceDialog(false); // Close the invoice dialog
    };

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const response = await axios.post('http://localhost:8000/api/appointments/get_prescriptions/', {
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
            const response = await axios.post('http://localhost:8000/api/appointments/get-hospital-medicines/', {
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

    const removeFromCart = (medicineId) => {
        setSelectedMedicines(prev => prev.filter(med => med._id !== medicineId));
    };

    const calculateTotal = () => {
        return selectedMedicines.reduce((sum, med) => sum + med.total, 0);
    };
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMedicines = availableMedicines.filter(medicine => 
        medicine['Product Name'].toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
            console.log("Razorpay SDK loaded successfully.");
        };
        script.onerror = () => {
            console.error("Failed to load Razorpay SDK.");
        };
        document.body.appendChild(script);
    }, []);

    const handleOnlinePayment = async () => {


        if (!window.Razorpay) {
            alert("Razorpay SDK is not loaded. Please check your internet connection.");
            return;
        }
        const patientEmail = selectedPrescription.patientEmail;
        const patientName = selectedPrescription.patientName;
    
        if (!patientEmail || !patientName) {
            alert("Patient details are missing. Please try again.");
            return;
        }
    
        try {
            setGmLoading(true);
            // Create payment order

            console.log({
                amount: calculateTotal() + 50, // Convert to paise
                patientEmail: patientEmail,
                hospitalName: hospitalName,
            });
            const response = await axios.post("http://127.0.0.1:8000/api/payments/create_payment/", {
                amount: calculateTotal() + 50, // Total amount in rupees
                patientEmail: patientEmail,
                hospitalName: hospitalName,
            });
    
            const { order_id, key } = response.data;
    
            // Open Razorpay payment modal
            const options = {
                key: key,
                amount: calculateTotal(), // Convert to paise
                currency: "INR",
                name: "HMS Healthcare",
                description: "Medicine Purchase",
                order_id: order_id,
                handler: async function (paymentResult) {
                    // Verify payment and generate invoice
                    const payment_id = paymentResult.razorpay_payment_id;
                    const verifyResponse = await axios.post("http://127.0.0.1:8000/api/payments/verify_payment/", {
                        payment_id: payment_id,
                        order_id: order_id,
                        patientEmail: patientEmail,
                        hospitalName: hospitalName,
                    });
    
                    if (verifyResponse.data.status === "success") {
                        alert("Payment successful. Generating invoice...");
                        setShowInvoiceDialog(true); // Show the invoice dialog
                        generateInvoice(payment_id); // Call the invoice generation function
                    } else {
                        alert("Payment verification failed. Please try again.");
                    }
                },
                prefill: {
                    email: patientEmail,
                    name: patientName,
                },
                theme: {
                    color: "#3399cc",
                },
            };
    
            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error("Error creating payment:", error.response?.data || error.message);
            alert(error.response?.data?.message || "An error occurred while creating the payment. Please try again.");
        }
        finally {
            setGmLoading(false);
        }
    };
    const generateInvoice = async (paymentId) => {
        try {
            const invoiceData = {
                prescriptionId: selectedPrescription._id,
                patientName: selectedPrescription.patientName,
                patientEmail: selectedPrescription.patientEmail,
                medicines: selectedMedicines,
                totalAmount: calculateTotal(),
                hospitalName: hospitalName,
                paymentId: paymentId,
                doctorName: selectedPrescription.doctorName,
                department: selectedPrescription.department,

            };

            const response = await axios.post("http://127.0.0.1:8000/api/appointments/generate_invoice/", invoiceData);
    
            if (response.data.status === "success") {
                alert("Invoice generated successfully!");
    
                try {
                    const reportData = ({
                        patientName: selectedPrescription.patientName,
                        patientEmail: selectedPrescription.patientEmail,
                        doctorName: selectedPrescription.doctorName,
                        department: selectedPrescription.department,
                        totalAmount: calculateTotal(),
                        paymentId: paymentId,
                        medicines: selectedMedicines,
                    });
                      // Add this report data to the reports state
                    setReports(prev => [...prev, reportData]);
                    
                    fetchPrescriptions(); // Refresh prescriptions
                    setSelectedMedicines([]); // Reset selected medicines
                    setSelectedPrescription(null); // Close the prescription dialog
                    setShowInvoiceDialog(false); // Close the invoice dialog
                } catch (pdfError) {
                    console.error("Error generating PDF report:", pdfError);
                    alert("Invoice generated, but an error occurred while generating the PDF report.");
                }
                fetchPrescriptions(); // Refresh prescriptions
                setSelectedMedicines([]); // Reset selected medicines
                setSelectedPrescription(null); // Close the prescription dialog
                setShowInvoiceDialog(false); // Close the invoice dialog
            } else {
                alert("Failed to generate invoice. Please try again.");
            }
        } catch (error) {
            console.error("Error generating invoice:", error);
            alert("An error occurred while generating the invoice. Please try again.");
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Slidebar userType="admin" activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="container mx-auto p-6 mt-16">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-green-500">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-800 flex items-center">
                        <FiClipboard className="mr-3 text-green-600" />
                        Hospital Pharmacy Management
                    </h1>
                    <button 
                        onClick={handleRefreshClick}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                        title="Refresh data"
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
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
            {/* Final Reports Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4">Final Reports</h2>
            {reports.length > 0 ? (
                <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 px-4 py-2">Patient Name</th>
                            <th className="border border-gray-300 px-4 py-2">Payment ID</th>
                            <th className="border border-gray-300 px-4 py-2">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report, index) => (
                            <tr key={index}>
                                <td className="border border-gray-300 px-4 py-2">{report.patientName}</td>
                                <td className="border border-gray-300 px-4 py-2">
                                    {report.paymentId || "Cash Payment"}
                                </td>
                                <td className="border border-gray-300 px-4 py-2">
                                    ₹{report.totalAmount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-gray-600">No reports available.</p>
            )}
        </div>

            {/* Prescription Details Modal */}
            {selectedPrescription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto">
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

                            {/* Patient and Doctor Info Cards */}
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

                            {/* Split the main content into two columns */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column - Doctor Suggested Medicines and Available Medicines */}
                                <div className="space-y-6">
                                    

                                    {/* Available Medicines with Search */}
                                    <div className="bg-white rounded-lg shadow-lg p-6">
                                        <h3 className="text-xl font-bold text-blue-800 mb-4">Available Medicines</h3>
                                        
                                        {/* Search Box */}
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                placeholder="Search medicines..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {filteredMedicines.length > 0 ? (
                                                filteredMedicines.map(medicine => (
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
                                                                className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-2 rounded-lg
                                                                        hover:from-blue-600 hover:to-green-600 transition-all duration-300
                                                                        shadow-md hover:shadow-lg"
                                                            >
                                                                Add
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-center py-4">No medicines found matching your search.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Cart Section */}
                                <div>
                                    {/* Doctor Suggested Medicines */}
                                    <div className="bg-white rounded-lg shadow-lg p-6">
                                        <h3 className="text-xl font-bold text-blue-800 mb-4">Doctor Suggested Medicines</h3>
                                        <div className="space-y-2">
                                            {selectedPrescription.medicines?.map((medicine, index) => (
                                                <div key={index} className="bg-blue-50 p-3 rounded-lg">
                                                    <p className="font-medium text-blue-700">{medicine.name}</p>
                                                </div>
                                            )) || <p className="text-gray-500">No medicines suggested by doctor.</p>}
                                        </div>
                                    </div>
                                    {selectedMedicines.length > 0 ? (
                                        <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                                            <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                                                <FiShoppingCart className="mr-2" />
                                                Selected Medicines
                                            </h3>
                                            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
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
                                                                className="w-16 p-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                            />
                                                            <p className="font-bold text-green-600 w-16 text-right">₹{medicine.total}</p>
                                                            <button
                                                                onClick={() => removeFromCart(medicine._id)}
                                                                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-all duration-300"
                                                            >
                                                                <MdClose />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 rounded-lg mt-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-lg font-bold">Total Amount:</span>
                                                    <span className="text-2xl font-bold">₹{calculateTotal()}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleGenerateInvoiceClick}
                                                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg
                                                        hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300
                                                        font-bold text-lg shadow-lg hover:shadow-xl mt-4"
                                            >
                                                Generate Invoice
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                                            <FiShoppingCart className="mx-auto text-gray-400 text-5xl mb-4" />
                                            <h3 className="text-xl font-medium text-gray-600">Your cart is empty</h3>
                                            <p className="text-gray-500 mt-2">Add medicines from the available list</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modified Invoice Dialog */}
            {showInvoiceDialog && selectedPrescription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-2xl w-full max-w-4xl p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-blue-800">Invoice Details</h2>
                            <button 
                                onClick={closeInvoiceDialog}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <MdClose size={24} />
                            </button>
                        </div>
                        
                        {/* Patient and Doctor Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-1 rounded-lg shadow-lg">
                                <div className="bg-white p-4 rounded-lg">
                                    <h3 className="font-bold text-blue-800 mb-3">Patient Information</h3>
                                    <div className="space-y-2 text-gray-700">
                                        <p>
                                            <span className="font-medium text-blue-600">Name:</span> 
                                            <span className="text-gray-800"> {selectedPrescription.patientName}</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-blue-600">Email:</span> 
                                            <span className="text-gray-800"> {selectedPrescription.patientEmail}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-1 rounded-lg shadow-lg">
                                <div className="bg-white p-4 rounded-lg">
                                    <h3 className="font-bold text-green-800 mb-3">Doctor Information</h3>
                                    <div className="space-y-2 text-gray-700">
                                        <p>
                                            <span className="font-medium text-green-600">Name:</span> 
                                            <span className="text-gray-800"> Dr. {selectedPrescription.doctorName}</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-green-600">Department:</span> 
                                            <span className="text-gray-800"> {selectedPrescription.department}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selected Medicines and Bill Details */}
                        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">Bill Details</h3>
                            
                            {/* Medicines */}
                            <div className="space-y-2 mb-6">
                                <h4 className="font-medium text-gray-700">Selected Medicines:</h4>
                                {selectedMedicines.map(medicine => (
                                    <div key={medicine._id} className="flex justify-between items-center px-2 py-1 border-b border-gray-100">
                                        <div className="flex items-center">
                                            <span className="w-6 text-center text-gray-500 mr-2">x{medicine.quantity}</span>
                                            <p className="font-medium text-blue-700">{medicine['Product Name']}</p>
                                        </div>
                                        <p className="text-green-600 font-medium">₹{medicine.total}</p>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Fee Breakup */}
                            <div className="space-y-2 border-t border-gray-200 pt-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-600">
                                        Appointment Booking Fee:
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Already Paid</span>
                                    </p>
                                    <p className="font-medium">₹100.00</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-600">Consultation Charges:</p>
                                    <p className="font-medium">₹50.00</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-600">Medicine Cost:</p>
                                    <p className="font-medium">₹{calculateTotal()}</p>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                    <p className="font-bold text-gray-800">Total Amount:</p>
                                    <p className="font-bold text-green-600">₹{calculateTotal() + 50}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Buttons */}
                        <div className="flex justify-between">
                            <button
                                onClick={() => generateInvoice("Cash Payment")}
                                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-all duration-300 flex items-center"
                            >
                                <span className="mr-2">Cash Payment</span>
                            </button>
                            <button
                                onClick={handleOnlinePayment}
                                disabled={gmloading} // Disable button when loading
                                className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                                  gmloading
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600"
                                }`}
                              >
                                {gmloading ? (
                                  <>
                                    
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <FiCreditCard className="mr-2" />
                                    Pay Online
                                  </>
                                )}
                              </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};


export default Givemedicine;