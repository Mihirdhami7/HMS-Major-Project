import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FiClipboard, FiShoppingCart, FiCreditCard, FiRefreshCw, FiSearch, FiDollarSign } from 'react-icons/fi';
import { MdClose } from 'react-icons/md';
import Slidebar from "../../components/Sidebar";
import { useAuth } from '../../context/AuthContext';
import { pickList } from '../../services/apiClient';
import { getPendingPrescriptions } from '../../services/appointmentsService';
import { listProducts } from '../../services/orderService';
import { createRazorpayOrder, verifyRazorpayPayment, getInvoices, payCashInvoice } from '../../services/paymentService';
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
const rupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const isOutside = (m) => m?.outside || !m?.medicineId;
const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "-");
const RANGES = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "all", label: "All" },
];

function StatCard({ icon, label, value, sub }) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-2xl shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

StatCard.propTypes = {
    icon: PropTypes.node,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sub: PropTypes.string,
};

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
    const [notice, setNotice] = useState(null);
    const [medicinesError, setMedicinesError] = useState(null);
    const [paymentMessage, setPaymentMessage] = useState(null);
    const [gmloading, setGmLoading] = useState(false);
    const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [prescriptionSearch, setPrescriptionSearch] = useState('');

    // Billing history (server)
    const [invoices, setInvoices] = useState([]);
    const [todayInvoices, setTodayInvoices] = useState([]);
    const [billRange, setBillRange] = useState('7d');
    const [billsLoading, setBillsLoading] = useState(false);
    const [billsError, setBillsError] = useState(null);
    const [openInvoice, setOpenInvoice] = useState(null);

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

    const fetchInvoices = useCallback(async () => {
        if (!token) return;
        setBillsLoading(true);
        const [rangeRes, todayRes] = await Promise.all([getInvoices(token, billRange), getInvoices(token, "today")]);
        setInvoices(pickList(rangeRes, "invoices"));
        setTodayInvoices(pickList(todayRes, "invoices"));
        setBillsError(rangeRes.success ? null : rangeRes.message);
        setBillsLoading(false);
    }, [token, billRange]);

    useEffect(() => {
        fetchPrescriptions();
    }, [fetchPrescriptions]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleRefreshClick = () => {
        fetchPrescriptions();
        fetchInvoices();
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
        setSearchTerm('');
        await fetchAvailableMedicines();
    };

    const addToCart = (medicine, quantity = 1) => {
        const price = parseFloat(medicine.price_per_strip) || 0;
        setSelectedMedicines(prev => [...prev, { ...medicine, quantity, total: quantity * price }]);
    };

    // Put every prescribed medicine that is in stock into the cart with the prescribed quantity.
    const addPrescribedToCart = () => {
        const prescribed = (selectedPrescription?.medicines || []).filter((m) => !isOutside(m));
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
                ? { ...med, quantity: qty, total: qty * (parseFloat(med.price_per_strip) || 0) }
                : med
        ));
    };

    const removeFromCart = (medicineId) => {
        setSelectedMedicines(prev => prev.filter(med => getId(med) !== medicineId));
    };

    const calculateTotal = () => selectedMedicines.reduce((sum, med) => sum + med.total, 0);

    const filteredMedicines = availableMedicines.filter(medicine =>
        (medicine.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPrescriptions = useMemo(() => {
        const q = prescriptionSearch.trim().toLowerCase();
        if (!q) return prescriptions;
        return prescriptions.filter((p) =>
            [p.patient?.name, p.patient?.email, p.doctor?.name, p.department].some((v) => (v || "").toLowerCase().includes(q))
        );
    }, [prescriptions, prescriptionSearch]);

    const cartItems = () => selectedMedicines.map((m) => ({ medicineId: getId(m), quantity: m.quantity }));

    /** After a successful bill: close dialogs, refresh lists. */
    const billSaved = (message) => {
        setSelectedMedicines([]);
        setSelectedPrescription(null);
        setShowInvoiceDialog(false);
        setNotice(message);
        fetchPrescriptions();
        fetchInvoices();
    };

    const handleCashPayment = async () => {
        if (selectedMedicines.length === 0) {
            setPaymentMessage("Add at least one medicine before taking payment.");
            return;
        }
        setGmLoading(true);
        setPaymentMessage(null);
        const result = await payCashInvoice(token, { prescriptionId: getId(selectedPrescription), items: cartItems() });
        setGmLoading(false);
        if (result.success) billSaved(result.message || "Cash payment recorded.");
        else setPaymentMessage(result.message || "Could not save the cash bill.");
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
            items: cartItems(),
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
                name: hospitalName || "Hospital Pharmacy",
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
                        billSaved(`Online payment of ${rupees(razorpay_order?.amount / 100)} received.`);
                    } else {
                        setPaymentMessage(`Payment verification failed: ${verified.message}`);
                    }
                },
                prefill: {
                    email: patient.email,
                    name: patient.name,
                    contact: patient.phone || patient.contactNo || "",
                },
                theme: { color: "#3399cc" },
            });
            razorpay.open();
        } finally {
            setGmLoading(false);
        }
    };

    const todayTotal = todayInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const rangeTotal = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const cashCount = invoices.filter((i) => i.paymentMethod === "cash").length;

    return (
        <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
            <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                                <FiClipboard className="mr-2 text-green-600" /> Pharmacy · Give Medicine
                            </h1>
                            <p className="text-sm text-gray-500">Dispense prescribed medicines and take payment — {hospitalName}</p>
                        </div>
                        <button
                            onClick={handleRefreshClick}
                            disabled={loading || billsLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-700 rounded-xl hover:bg-blue-50 shadow-sm"
                            title="Refresh data"
                        >
                            <FiRefreshCw className={loading || billsLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                    </div>

                    {notice && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded flex justify-between">
                            <p className="text-green-700">{notice}</p>
                            <button onClick={() => setNotice(null)} className="text-green-700"><MdClose /></button>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon="💊" label="To Dispense" value={loading ? "…" : prescriptions.length} sub="Prescriptions waiting" />
                        <StatCard icon="🧾" label="Bills Today" value={todayInvoices.length} sub={`${rupees(todayTotal)} collected`} />
                        <StatCard icon="📈" label={`Revenue (${RANGES.find((r) => r.key === billRange)?.label})`} value={rupees(rangeTotal)} sub={`${invoices.length} bills`} />
                        <StatCard icon="💵" label="Cash / Online" value={`${cashCount} / ${invoices.length - cashCount}`} sub="In the selected period" />
                    </div>

                    {/* Prescriptions waiting */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Prescriptions to dispense</h2>
                                <p className="text-xs text-gray-500">Click a prescription to prepare the medicines and bill</p>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={prescriptionSearch}
                                    onChange={(e) => setPrescriptionSearch(e.target.value)}
                                    placeholder="Search patient, doctor, department…"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <p className="text-gray-500 text-center py-8">Loading…</p>
                        ) : filteredPrescriptions.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                {prescriptions.length === 0 ? "No prescriptions waiting — all dispensed." : "No prescription matches your search."}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredPrescriptions.map((prescription) => {
                                    const meds = prescription.medicines || [];
                                    const outside = meds.filter(isOutside).length;
                                    return (
                                        <button
                                            key={getId(prescription)}
                                            onClick={() => handlePrescriptionClick(prescription)}
                                            className="text-left rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition bg-gradient-to-br from-blue-50 to-green-50"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-800 truncate">{prescription.patient?.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{prescription.patient?.email}</p>
                                                </div>
                                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                            </div>
                                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                                                <p>🩺 {doctorName(prescription.doctor?.name)} · {prescription.department}</p>
                                                <p>📅 {prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : '-'}</p>
                                                <p>💊 {meds.length} medicine{meds.length === 1 ? "" : "s"}
                                                    {outside > 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">{outside} outside</span>}
                                                </p>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 truncate">
                                                {meds.map((m) => m.name).join(", ")}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Billing history (server) */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Billing History</h2>
                                <p className="text-xs text-gray-500">Medicine bills saved for this hospital (cash and online)</p>
                            </div>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                                {RANGES.map((r) => (
                                    <button
                                        key={r.key}
                                        onClick={() => setBillRange(r.key)}
                                        className={`px-3 py-1.5 ${billRange === r.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {billsError && <p className="text-sm text-red-700 mb-2">{billsError}</p>}
                        {billsLoading ? (
                            <p className="text-gray-500 text-center py-6">Loading bills…</p>
                        ) : invoices.length === 0 ? (
                            <p className="text-gray-500 text-center py-6">No bills in this period.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200">
                                            <th className="py-2 pr-3 font-medium">Date</th>
                                            <th className="py-2 pr-3 font-medium">Invoice</th>
                                            <th className="py-2 pr-3 font-medium">Patient</th>
                                            <th className="py-2 pr-3 font-medium">Items</th>
                                            <th className="py-2 pr-3 font-medium">Payment</th>
                                            <th className="py-2 pr-3 font-medium text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => (
                                            <tr
                                                key={inv.id}
                                                onClick={() => setOpenInvoice(inv)}
                                                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                                            >
                                                <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{formatDateTime(inv.createdAt)}</td>
                                                <td className="py-2 pr-3 text-gray-500 font-mono text-xs">{String(inv.invoiceId).slice(-8).toUpperCase()}</td>
                                                <td className="py-2 pr-3 text-gray-800">{inv.patient?.name || "-"}</td>
                                                <td className="py-2 pr-3 text-gray-600">{inv.medicines.length}</td>
                                                <td className="py-2 pr-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${inv.paymentMethod === "cash" ? "bg-gray-100 text-gray-700" : "bg-green-100 text-green-700"}`}>
                                                        {inv.paymentMethod === "cash" ? "Cash" : "Online"}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3 text-right font-semibold text-gray-800">{rupees(inv.totalAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={5} className="pt-3 text-right text-gray-500">Total</td>
                                            <td className="pt-3 pr-3 text-right font-bold text-green-700">{rupees(rangeTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoice detail */}
                {openInvoice && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpenInvoice(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">Bill {String(openInvoice.invoiceId).slice(-8).toUpperCase()}</h3>
                                    <p className="text-xs text-gray-500">{formatDateTime(openInvoice.createdAt)} · {openInvoice.paymentMethod === "cash" ? "Cash" : "Online"}{openInvoice.paymentId ? ` · ${openInvoice.paymentId}` : ""}</p>
                                </div>
                                <button onClick={() => setOpenInvoice(null)} className="text-gray-500 hover:text-red-500"><MdClose size={22} /></button>
                            </div>
                            <p className="text-sm text-gray-700"><span className="text-gray-500">Patient:</span> {openInvoice.patient?.name} ({openInvoice.patient?.email})</p>
                            {openInvoice.doctor?.name && (
                                <p className="text-sm text-gray-700"><span className="text-gray-500">Doctor:</span> {doctorName(openInvoice.doctor.name)} · {openInvoice.department}</p>
                            )}
                            <table className="w-full text-sm mt-4">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-200">
                                        <th className="py-1.5">Medicine</th><th className="py-1.5">Qty</th><th className="py-1.5 text-right">Price</th><th className="py-1.5 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openInvoice.medicines.map((m, i) => (
                                        <tr key={`${m.medicineId || m.name}-${i}`} className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-800">{m.name}</td>
                                            <td className="py-1.5">{m.quantity}</td>
                                            <td className="py-1.5 text-right">{rupees(m.price)}</td>
                                            <td className="py-1.5 text-right">{rupees(m.total ?? (m.price || 0) * (m.quantity || 1))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-right mt-3 font-bold text-green-700">Total {rupees(openInvoice.totalAmount)}</p>
                        </div>
                    </div>
                )}

                {/* Prescription details: pick medicines */}
                {selectedPrescription && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
                        <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-auto">
                            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold">Dispense medicines</h2>
                                    <p className="text-sm text-white/90">
                                        {selectedPrescription.patient?.name} · {doctorName(selectedPrescription.doctor?.name)} · {selectedPrescription.department}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedPrescription(null)} className="hover:bg-white/20 rounded-full p-1">
                                    <MdClose size={24} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Prescribed */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-800 mb-3">Prescribed by doctor</h3>
                                    <div className="space-y-2">
                                        {selectedPrescription.medicines?.length > 0 ? (
                                            selectedPrescription.medicines.map((medicine, index) => (
                                                <div key={medicine.medicineId || index} className="bg-blue-50 p-3 rounded-lg">
                                                    <p className="font-medium text-blue-700">
                                                        {medicine.name}
                                                        {isOutside(medicine) && (
                                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Buy outside</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        Qty {medicine.quantity}
                                                        {medicine.dosage ? ` · ${medicine.dosage}` : ''}
                                                        {medicine.frequency ? ` · ${medicine.frequency}` : ''}
                                                        {medicine.duration ? ` · ${medicine.duration}` : ''}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 text-sm">No medicines prescribed.</p>
                                        )}
                                    </div>
                                    {selectedPrescription.medicines?.some((m) => !isOutside(m)) && availableMedicines.length > 0 && (
                                        <button
                                            onClick={addPrescribedToCart}
                                            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                                        >
                                            Add prescribed medicines to cart
                                        </button>
                                    )}
                                    {selectedPrescription.suggestions && (
                                        <p className="mt-4 text-xs text-gray-500"><span className="font-medium text-gray-700">Advice:</span> {selectedPrescription.suggestions}</p>
                                    )}
                                </div>

                                {/* Pharmacy stock */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-800 mb-3">Pharmacy stock</h3>
                                    <div className="relative mb-3">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search medicines…"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    {medicinesError && <p className="text-red-600 text-sm mb-3">{medicinesError}</p>}
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {filteredMedicines.length > 0 ? (
                                            filteredMedicines.map(medicine => {
                                                const inCart = selectedMedicines.find(m => getId(m) === getId(medicine));
                                                return (
                                                    <div key={getId(medicine)} className="p-3 rounded-lg border border-gray-100 flex justify-between items-center gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-800 truncate">{medicine.product_name}</p>
                                                            <p className="text-xs text-gray-500">{rupees(medicine.price_per_strip)} · Stock {medicine.stock}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => addToCart(medicine)}
                                                            disabled={!!inCart}
                                                            className="shrink-0 px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500"
                                                        >
                                                            {inCart ? "Added" : "Add"}
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-gray-500 text-center py-4 text-sm">No medicines found.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Cart */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
                                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                                        <FiShoppingCart className="mr-2" /> Cart
                                    </h3>
                                    {selectedMedicines.length > 0 ? (
                                        <>
                                            <div className="space-y-2 flex-1 max-h-80 overflow-y-auto">
                                                {selectedMedicines.map(medicine => (
                                                    <div key={getId(medicine)} className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 flex items-center gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-gray-800 truncate">{medicine.product_name}</p>
                                                            <p className="text-xs text-gray-500">{rupees(medicine.price_per_strip)} each</p>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={medicine.stock}
                                                            value={medicine.quantity}
                                                            onChange={(e) => updateQuantity(getId(medicine), parseInt(e.target.value))}
                                                            className="w-16 p-1.5 border border-gray-300 rounded-lg text-sm"
                                                        />
                                                        <p className="w-20 text-right font-semibold text-gray-800 text-sm">{rupees(medicine.total)}</p>
                                                        <button onClick={() => removeFromCart(getId(medicine))} className="text-red-500 hover:text-red-700">
                                                            <MdClose />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 rounded-xl mt-4 flex justify-between items-center">
                                                <span className="font-semibold">Total</span>
                                                <span className="text-2xl font-bold">{rupees(calculateTotal())}</span>
                                            </div>
                                            <button
                                                onClick={handleGenerateInvoiceClick}
                                                className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-semibold mt-3"
                                            >
                                                Generate Invoice
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center py-10">
                                            <FiShoppingCart className="mx-auto text-gray-300 text-5xl mb-3" />
                                            <p className="text-gray-600 font-medium">Cart is empty</p>
                                            <p className="text-gray-400 text-sm mt-1">Add medicines from pharmacy stock</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice dialog: confirm and pay */}
                {showInvoiceDialog && selectedPrescription && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">Invoice</h2>
                                    <p className="text-sm text-white/90">{hospitalName} Pharmacy</p>
                                </div>
                                <button onClick={closeInvoiceDialog} className="hover:bg-white/20 rounded-full p-1"><MdClose size={24} /></button>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-sm">
                                    <div className="rounded-xl bg-blue-50 p-3">
                                        <p className="text-xs text-gray-500">Patient</p>
                                        <p className="font-medium text-gray-800">{selectedPrescription.patient?.name}</p>
                                        <p className="text-gray-600">{selectedPrescription.patient?.email}</p>
                                    </div>
                                    <div className="rounded-xl bg-green-50 p-3">
                                        <p className="text-xs text-gray-500">Doctor</p>
                                        <p className="font-medium text-gray-800">{doctorName(selectedPrescription.doctor?.name)}</p>
                                        <p className="text-gray-600">{selectedPrescription.department}</p>
                                    </div>
                                </div>

                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200">
                                            <th className="py-2">Medicine</th><th className="py-2">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedMedicines.map(medicine => (
                                            <tr key={getId(medicine)} className="border-b border-gray-100">
                                                <td className="py-2 text-gray-800">{medicine.product_name}</td>
                                                <td className="py-2">{medicine.quantity}</td>
                                                <td className="py-2 text-right">{rupees(medicine.price_per_strip)}</td>
                                                <td className="py-2 text-right">{rupees(medicine.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                                    <p className="font-semibold text-gray-800">Total Amount</p>
                                    <p className="text-xl font-bold text-green-700">{rupees(calculateTotal())}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Prices are confirmed by the server from the pharmacy list; stock is reduced after payment.</p>

                                {paymentMessage && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded-lg mt-4 text-sm">
                                        {paymentMessage}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                                    <button
                                        onClick={handleCashPayment}
                                        disabled={gmloading}
                                        className="px-5 py-3 rounded-xl bg-gray-700 text-white hover:bg-gray-800 flex items-center justify-center disabled:opacity-60"
                                    >
                                        <FiDollarSign className="mr-2" /> {gmloading ? "Saving..." : "Cash Payment"}
                                    </button>
                                    <button
                                        onClick={handleOnlinePayment}
                                        disabled={gmloading}
                                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600 flex items-center justify-center disabled:opacity-60"
                                    >
                                        <FiCreditCard className="mr-2" /> {gmloading ? "Processing..." : "Pay Online"}
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

export default Givemedicine;
