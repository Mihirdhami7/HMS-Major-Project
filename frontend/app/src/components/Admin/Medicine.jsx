import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import { FiPlus, FiMinus, FiSend, FiDollarSign, FiSearch, FiClock, FiDownload } from 'react-icons/fi';

const Medicine = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("medicine");
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, completed, failed
  const [loading, setLoading] = useState(false);

  // Frequently used medicines
  const frequentMedicines = [
    { id: 1, name: "Paracetamol", price: 5.99, stock: 100, frequency: "Very High" },
    { id: 2, name: "Amoxicillin", price: 15.99, stock: 80, frequency: "High" },
    { id: 3, name: "Omeprazole", price: 12.99, stock: 90, frequency: "High" },
    { id: 4, name: "Metformin", price: 8.99, stock: 85, frequency: "High" },
    { id: 5, name: "Amlodipine", price: 11.99, stock: 75, frequency: "Medium" },
    { id: 6, name: "Cetirizine", price: 6.99, stock: 95, frequency: "High" },
    { id: 7, name: "Aspirin", price: 4.99, stock: 120, frequency: "Very High" },
    { id: 8, name: "Ibuprofen", price: 7.99, stock: 110, frequency: "Very High" },
    { id: 9, name: "Azithromycin", price: 19.99, stock: 70, frequency: "Medium" },
    { id: 10, name: "Vitamin D3", price: 9.99, stock: 150, frequency: "High" }
  ];

  // All medicines database
  const medicineDatabase = {
    painkillers: [
      { id: 1, name: "Paracetamol", price: 5.99, stock: 100 },
      { id: 2, name: "Ibuprofen", price: 7.99, stock: 80 },
      { id: 3, name: "Aspirin", price: 4.99, stock: 120 },
    ],
    antibiotics: [
      { id: 4, name: "Amoxicillin", price: 15.99, stock: 50 },
      { id: 5, name: "Azithromycin", price: 19.99, stock: 40 },
      { id: 6, name: "Ciprofloxacin", price: 12.99, stock: 60 },
    ],
    vitamins: [
      { id: 7, name: "Vitamin C", price: 8.99, stock: 150 },
      { id: 8, name: "Vitamin D3", price: 9.99, stock: 100 },
      { id: 9, name: "Multivitamin", price: 14.99, stock: 80 },
    ]
  };

  const frequencyOptions = [
    "Once daily",
    "Twice daily",
    "Three times daily",
    "Four times daily",
    "As needed"
  ];

  const doseOptions = [
    "1 tablet",
    "2 tablets",
    "1 teaspoon",
    "2 teaspoons",
    "1 capsule",
    "2 capsules"
  ];

  const addMedicine = (medicine) => {
    setSelectedMedicines([...selectedMedicines, {
      ...medicine,
      frequency: frequencyOptions[0],
      dose: doseOptions[0],
      duration: 1,
      quantity: 1,
      subtotal: medicine.price
    }]);
    calculateTotal();
  };

  const updateMedicine = (index, field, value) => {
    const updated = selectedMedicines.map((med, i) => {
      if (i === index) {
        const updatedMed = { ...med, [field]: value };
        // Recalculate subtotal
        updatedMed.subtotal = updatedMed.price * updatedMed.quantity;
        return updatedMed;
      }
      return med;
    });
    setSelectedMedicines(updated);
    calculateTotal();
  };

  const removeMedicine = (index) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
    calculateTotal();
  };

  const calculateTotal = () => {
    const total = selectedMedicines.reduce((sum, med) => sum + med.subtotal, 0);
    setTotalAmount(total);
  };

  const handleSubmit = async () => {
    try {
      // Format the prescription data
      const prescriptionData = {
        appointmentId,
        medicines: selectedMedicines,
        totalAmount,
        date: new Date().toISOString(),
      };

      // In real app, send to backend
      console.log("Sending prescription:", prescriptionData);
      
      // Show success message and redirect
      alert("Prescription sent successfully!");
      navigate('/admin/appointments');
    } catch (error) {
      console.error("Error sending prescription:", error);
      alert("Failed to send prescription. Please try again.");
    }
  };

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/generate-payment-qr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          amount: totalAmount,
          appointmentId: appointmentId,
          medicines: selectedMedicines
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowPaymentQR(true);
        // Start polling for payment status
        startPaymentStatusCheck(data.paymentId);
      }
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPaymentStatusCheck = (paymentId) => {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/check-payment-status/${paymentId}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'completed') {
            setPaymentStatus('completed');
            clearInterval(checkInterval);
            generateInvoice();
          } else if (data.status === 'failed') {
            setPaymentStatus('failed');
            clearInterval(checkInterval);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  const generateInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/generate-invoice/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          medicines: selectedMedicines,
          totalAmount: totalAmount,
          paymentStatus: 'completed'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${appointmentId}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter medicines based on search
  const filteredMedicines = Object.entries(medicineDatabase).reduce((acc, [category, medicines]) => {
    const filtered = medicines.filter(medicine => 
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />
      
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-blue-700 mb-6">Prescription Management</h2>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Frequently Used Medicines */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
              <FiClock className="mr-2" />
              Frequently Used Medicines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frequentMedicines.map(medicine => (
                <div key={medicine.id} 
                  className="p-4 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">{medicine.name}</h4>
                      <p className="text-sm text-gray-600">Stock: {medicine.stock}</p>
                      <p className="text-sm text-blue-600">Usage: {medicine.frequency}</p>
                    </div>
                    <span className="text-green-600 font-medium">${medicine.price}</span>
                  </div>
                  <button
                    onClick={() => addMedicine(medicine)}
                    className="w-full mt-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 flex items-center justify-center"
                  >
                    <FiPlus className="mr-1" /> Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Medicine Selection Section */}
          <div className="grid grid-cols-1">

            {/* Selected Medicines & Prescription Details */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Prescription Details</h3>
              
              {selectedMedicines.map((medicine, index) => (
                <div key={index} className="mb-4 p-4 border border-blue-100 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">{medicine.name}</h4>
                    <button
                      onClick={() => removeMedicine(index)}
                      className="p-1 text-red-500 hover:text-red-600"
                    >
                      <FiMinus />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600">Frequency</label>
                      <select
                        value={medicine.frequency}
                        onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {frequencyOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Dose</label>
                      <select
                        value={medicine.dose}
                        onChange={(e) => updateMedicine(index, 'dose', e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {doseOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        value={medicine.duration}
                        onChange={(e) => updateMedicine(index, 'duration', parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={medicine.quantity}
                        onChange={(e) => updateMedicine(index, 'quantity', parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-green-600 font-medium">
                      Subtotal: ${medicine.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {selectedMedicines.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span className="flex items-center">
                      <FiDollarSign className="mr-1" />
                      Total Amount:
                    </span>
                    <span className="text-green-600">${totalAmount.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleSubmit}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-green-600"
                  >
                    <FiSend className="mr-2" />
                    Send Prescription
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Updated Payment and Invoice Section */}
          {selectedMedicines.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center text-lg font-semibold mb-4">
                <span className="flex items-center">
                  <FiDollarSign className="mr-1" />
                  Total Amount:
                </span>
                <span className="text-green-600">${totalAmount.toFixed(2)}</span>
              </div>

              {!showPaymentQR ? (
                <button
                  onClick={generateQRCode}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-green-600"
                >
                  {loading ? "Generating QR..." : "Generate Payment QR"}
                </button>
              ) : (
                <div className="text-center">
                  {paymentStatus === 'pending' && (
                    <div className="mb-4">
                      <div className="animate-pulse bg-gray-200 w-64 h-64 mx-auto mb-4"></div>
                      <p className="text-gray-600">Scan QR code to make payment</p>
                      <p className="text-sm text-gray-500">Waiting for payment...</p>
                    </div>
                  )}

                  {paymentStatus === 'completed' && (
                    <div className="mb-4">
                      <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
                        Payment Completed Successfully!
                      </div>
                      <button
                        onClick={generateInvoice}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center mx-auto"
                      >
                        <FiDownload className="mr-2" />
                        {loading ? "Generating Invoice..." : "Download Invoice"}
                      </button>
                    </div>
                  )}

                  {paymentStatus === 'failed' && (
                    <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                      Payment Failed. Please try again.
                      <button
                        onClick={() => {
                          setShowPaymentQR(false);
                          setPaymentStatus('pending');
                        }}
                        className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Retry Payment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Medicine;
