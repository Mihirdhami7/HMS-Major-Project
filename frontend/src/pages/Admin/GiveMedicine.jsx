import { useState, useEffect, useCallback } from 'react';
import { FiClipboard, FiShoppingCart, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import { MdClose } from 'react-icons/md';
import Slidebar from "../../components/Sidebar";
import { useAuth } from '../../context/AuthContext';
import { pickList } from '../../services/apiClient';
import { getPendingPrescriptions } from '../../services/appointmentsService';
import { listProducts } from '../../services/orderService';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/paymentService';

import { doctorName } from "../../utils/format";
const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Load the Razorpay checkout script once, only when a payment is started.
const loadRazorpay = () =>
    new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const existing = document.querySelector(`script[src="${RAZORPAY_SRC}"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve(true));
            existing.addEventListener("error", () => resolve(false));
            return;
        }
        const script = document.createElement("script");
        script.src = RAZORPAY_SRC;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const getId = (doc) => doc?._id || doc?.id;
const money = (value) => Number(value || 0).toFixed(2);

const Givemedicine = () => {
    const { token, user } = useAuth();
    const hospitalName = user?.hospitalName || '';
    const [prescriptions, setPrescriptions] = useState([]);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [availableMedicines, setAvailableMedicines] = useState([]);
    const [activeTab, setActiveTab] = useState('givemedicine');
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [medicinesError, setMedicinesError] = useState(null);
    const [paymentMessage, setPaymentMessage] = useState(null);

    const [gmloading, setGmLoading] = useState(false);
    const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
    const [reports, setReports] = useState([]);

    const fetchPrescriptions = useCallback(async () => {
        if (!token) return;
        if (!hospitalName) {
            setError('Hospital information is missing from your account. Please log in again.');
            return;
        }
        setLoading(true);
        setError(null);
        const result = await getPendingPrescriptions(token);
        if (result.success) {
            setPrescriptions(pickList(result, "prescriptions"));
        } else {
            setError(result.message);
        }
        setLoading(false);
    }, [token, hospitalName]);

    useEffect(() => {
        fetchPrescriptions();
    }, [fetchPrescriptions]);

    const handleRefreshClick = () => {
        fetchPrescriptions();
    };

    const handleGenerateInvoiceClick = () => {
        setPaymentMessage(null);
        setShowInvoiceDialog(true);
    };

    const closeInvoiceDialog = () => {
        setShowInvoiceDialog(false);
    };

    const fetchAvailableMedicines = async () => {
        setMedicinesError(null);
        // Approved products of this hospital (the dedicated medicines endpoint filters on a
        // field products do not have, so the product list is used instead).
        const result = await listProducts(token, hospitalName);
        if (result.success) {
            setAvailableMedicines(pickList(result, "products").filter((p) => (p.stock || 0) > 0));
        } else {
            setAvailableMedicines([]);
            setMedicinesError(result.message);
        }
    };

    const handlePrescriptionClick = async (prescription) => {
        setSelectedPrescription(prescription);
        setSelectedMedicines([]);
        setPaymentMessage(null);
        await fetchAvailableMedicines();
    };

    const addToCart = (medicine, quantity = 1) => {
        const price = parseFloat(medicine.price_per_strip) || 0;
        setSelectedMedicines(prev => [...prev, {
            ...medicine,
            quantity,
            total: quantity * price
        }]);
    };

    // Put every prescribed medicine that is in stock into the cart with the prescribed quantity.
    const addPrescribedToCart = () => {
        const prescribed = selectedPrescription?.medicines || [];
        prescribed.forEach((item) => {
            const match = availableMedicines.find((m) => getId(m) === item.medicineId);
            if (match && !selectedMedicines.find((m) => getId(m) === getId(match))) {
                const qty = Math.min(parseInt(item.quantity) || 1, match.stock || 1);
                addToCart(match, qty);
            }
        });
    };

    const updateQuantity = (medicineId, quantity) => {
        const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        setSelectedMedicines(prev => prev.map(med =>
            getId(med) === medicineId
                ? {
                    ...med,
                    quantity: qty,
                    total: qty * (parseFloat(med.price_per_strip) || 0)
                }
                : med
        ));
    };

    const removeFromCart = (medicineId) => {
        setSelectedMedicines(prev => prev.filter(med => getId(med) !== medicineId));
    };

    const calculateTotal = () => {
        return selectedMedicines.reduce((sum, med) => sum + med.total, 0);
    };
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMedicines = availableMedicines.filter(medicine =>
        (medicine.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // There is no backend invoice endpoint yet, so the bill is kept on this page only.
    const recordBill = (paymentId) => {
        setReports(prev => [...prev, {
            patientName: selectedPrescription.patient?.name,
            patientEmail: selectedPrescription.patient?.email,
            doctorName: selectedPrescription.doctor?.name,
            department: selectedPrescription.department,
            totalAmount: money(calculateTotal()),
            paymentId,
            medicines: selectedMedicines,
        }]);
        setSelectedMedicines([]);
        setSelectedPrescription(null);
        setShowInvoiceDialog(false);
    };

    const handleCashPayment = () => {
        recordBill(null);
    };

    const handleOnlinePayment = async () => {
        const patient = selectedPrescription?.patient || {};
        if (!patient.patientId || !patient.name) {
            setPaymentMessage("Patient details are missing on this prescription.");
            return;
        }
        const amount = Number(money(calculateTotal()));
        if (amount <= 0) {
            setPaymentMessage("Add at least one medicine before taking payment.");
            return;
        }

        const prescriptionId = getId(selectedPrescription);
        const paymentId = `PAY-${prescriptionId}-${Date.now()}`;
        const paymentData = {
            payment_id: paymentId,
            order_id: prescriptionId,
            source: "PATIENT",
            category: "PRESCRIPTION_INVOICE",
            amount,
            currency: "INR",
            patient_id: patient.patientId,
            patient_name: patient.name,
            invoice_id: `INV-${prescriptionId}`,
            hospital_name: hospitalName,
        };

        setPaymentMessage(null);
        setGmLoading(true);
        try {
            const created = await createRazorpayOrder(token, paymentData);
            if (!created.success) {
                setPaymentMessage(`Online payment could not be started: ${created.message}. You can still take a cash payment.`);
                return;
            }
            const loaded = await loadRazorpay();
            if (!loaded || !window.Razorpay) {
                setPaymentMessage("Could not load the Razorpay checkout. Check your internet connection.");
                return;
            }
            const { razorpay_key_id, razorpay_order } = created.data || {};
            const razorpay = new window.Razorpay({
                key: razorpay_key_id,
                amount: razorpay_order?.amount,
                currency: razorpay_order?.currency || "INR",
                name: "HMS Healthcare",
                description: "Medicine Purchase",
                order_id: razorpay_order?.id,
                handler: async (paymentResult) => {
                    const verified = await verifyRazorpayPayment(token, {
                        ...paymentData,
                        razorpay_order_id: paymentResult.razorpay_order_id,
                        razorpay_payment_id: paymentResult.razorpay_payment_id,
                        razorpay_signature: paymentResult.razorpay_signature,
                    });
                    if (verified.success) {
                        recordBill(paymentResult.razorpay_payment_id);
                    } else {
                        setPaymentMessage(`Payment verification failed: ${verified.message}`);
                    }
                },
                prefill: {
                    email: patient.email,
                    name: patient.name,
                    contact: patient.phone || patient.contactNo || "",
                },
                theme: {
                    color: "#3399cc",
                },
            });
            razorpay.open();
        } finally {
            setGmLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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

            {!loading && !error && prescriptions.length === 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-4 text-center text-gray-600">
                    No pending prescriptions.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prescriptions.map(prescription => (
                    <div
                        key={getId(prescription)}
                        onClick={() => handlePrescriptionClick(prescription)}
                        className={`bg-white rounded-lg shadow-lg hover:shadow-xl
                            transition-all duration-300 cursor-pointer overflow-hidden group
                            ${prescription.status === 'completed' ? 'opacity-50' : ''}`}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-green-500 p-1">
                            <div className="bg-white p-4">
                                <h3 className="font-bold text-lg text-blue-800 mb-2 group-hover:text-green-600 transition-colors">
                                    {prescription.patient?.name}
                                </h3>
                                <div className="space-y-2 text-gray-600">
                                    <p className="flex items-center">
                                        <span className="font-medium text-green-600 mr-2">Doctor:</span>
                                        {doctorName(prescription.doctor?.name)}
                                    </p>
                                    <p className="flex items-center">
                                        <span className="font-medium text-green-600 mr-2">Date:</span>
                                        {prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : '-'}
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
            <h2 className="text-xl font-bold text-blue-800 mb-1">Final Reports</h2>
            <p className="text-sm text-gray-500 mb-4">Bills taken during this session. Saving invoices to the server is not available yet.</p>
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
                            <tr key={`${report.paymentId || 'cash'}-${index}`}>
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
                                            <p><span className="font-medium text-blue-600">Name:</span> {selectedPrescription.patient?.name}</p>
                                            <p><span className="font-medium text-blue-600">Email:</span> {selectedPrescription.patient?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-1 rounded-lg shadow-lg">
                                    <div className="bg-white p-4 rounded-lg">
                                        <h3 className="font-bold text-green-800 mb-3">Doctor Information</h3>
                                        <div className="space-y-2 text-gray-700">
                                            <p><span className="font-medium text-green-600">Name:</span> {doctorName(selectedPrescription.doctor?.name)}</p>
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

                                        {medicinesError && (
                                            <p className="text-red-600 text-sm mb-3">{medicinesError}</p>
                                        )}
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {filteredMedicines.length > 0 ? (
                                                filteredMedicines.map(medicine => (
                                                    <div key={getId(medicine)}
                                                        className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg flex justify-between items-center group hover:shadow-lg transition-all duration-300">
                                                        <div>
                                                            <p className="font-bold text-blue-700">{medicine.product_name}</p>
                                                            <p className="text-sm text-gray-600">Stock: {medicine.stock}</p>
                                                            <p className="text-sm text-green-600 font-medium">₹{medicine.price_per_strip} per unit</p>
                                                        </div>
                                                        {!selectedMedicines.find(m => getId(m) === getId(medicine)) && (
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
                                            {selectedPrescription.medicines?.length > 0 ? (
                                                selectedPrescription.medicines.map((medicine, index) => (
                                                    <div key={medicine.medicineId || index} className="bg-blue-50 p-3 rounded-lg">
                                                        <p className="font-medium text-blue-700">{medicine.name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Qty: {medicine.quantity}
                                                            {medicine.dosage ? ` | ${medicine.dosage}` : ''}
                                                            {medicine.duration ? ` | ${medicine.duration}` : ''}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500">No medicines suggested by doctor.</p>
                                            )}
                                        </div>
                                        {selectedPrescription.medicines?.length > 0 && availableMedicines.length > 0 && (
                                            <button
                                                onClick={addPrescribedToCart}
                                                className="mt-4 w-full bg-blue-100 text-blue-700 py-2 rounded-lg hover:bg-blue-200 transition-all"
                                            >
                                                Add prescribed medicines to cart
                                            </button>
                                        )}
                                    </div>
                                    {selectedMedicines.length > 0 ? (
                                        <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                                            <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                                                <FiShoppingCart className="mr-2" />
                                                Selected Medicines
                                            </h3>
                                            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                                                {selectedMedicines.map(medicine => (
                                                    <div key={getId(medicine)}
                                                        className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg flex justify-between items-center">
                                                        <div>
                                                            <p className="font-bold text-blue-700">{medicine.product_name}</p>
                                                            <p className="text-green-600">₹{medicine.price_per_strip} per unit</p>
                                                        </div>
                                                        <div className="flex items-center space-x-4">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={medicine.stock}
                                                                value={medicine.quantity}
                                                                onChange={(e) => updateQuantity(getId(medicine), parseInt(e.target.value))}
                                                                className="w-16 p-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                            />
                                                            <p className="font-bold text-green-600 w-16 text-right">₹{money(medicine.total)}</p>
                                                            <button
                                                                onClick={() => removeFromCart(getId(medicine))}
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
                                                    <span className="text-2xl font-bold">₹{money(calculateTotal())}</span>
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
                                            <span className="text-gray-800"> {selectedPrescription.patient?.name}</span>
                                        </p>
                                        <p>
                                            <span className="font-medium text-blue-600">Email:</span>
                                            <span className="text-gray-800"> {selectedPrescription.patient?.email}</span>
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
                                            <span className="text-gray-800"> {doctorName(selectedPrescription.doctor?.name)}</span>
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
                                    <div key={getId(medicine)} className="flex justify-between items-center px-2 py-1 border-b border-gray-100">
                                        <div className="flex items-center">
                                            <span className="w-6 text-center text-gray-500 mr-2">x{medicine.quantity}</span>
                                            <p className="font-medium text-blue-700">{medicine.product_name}</p>
                                        </div>
                                        <p className="text-green-600 font-medium">₹{money(medicine.total)}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Fee Breakup */}
                            <div className="space-y-2 border-t border-gray-200 pt-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-600">Medicine Cost:</p>
                                    <p className="font-medium">₹{money(calculateTotal())}</p>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                    <p className="font-bold text-gray-800">Total Amount:</p>
                                    <p className="font-bold text-green-600">₹{money(calculateTotal())}</p>
                                </div>
                            </div>
                        </div>

                        {paymentMessage && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded-lg mb-4">
                                {paymentMessage}
                            </div>
                        )}

                        {/* Payment Buttons */}
                        <div className="flex justify-between">
                            <button
                                onClick={handleCashPayment}
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