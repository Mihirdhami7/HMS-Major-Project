import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import Home from "../pages/Home/Home"
import Login from "../pages/Auth/Login"
import SignUp from "../pages/Auth/Signup"

import PatientSection from "../pages/Patients/PatientSection"
import Appointment from "../pages/Patients/Appointments"
import Disease from "../pages/Patients/Disease"    

import DoctorSection from "../pages/Doctors/DoctorSection"
import DoctorAppointments from '../pages/Doctors/DoctorAppointments'
import Prescription from "../pages/Doctors/Prescription"
import MedicalProducts from "../pages/Doctors/MedicalProducts"

import Profiile from "../pages/Profile/Profile"


import NewRegister from "../pages/Admin/NewRegister"
import Products from "../pages/Admin/Products"
import GiveMedicine from '../pages/Admin/GiveMedicine'
// import Medicine from "../pages/Admin/Medicine"
import AdminSection from "../pages/Admin/AdminSection"
import Department from "../pages/Admin/Department"
import Dashboard from "../pages/Admin/Dashboard"

import SupplierSection from "../pages/Supplier/SupplierSection"
import SuppDashboard from "../pages/Supplier/SupplierDashboard"
import SuppProducts from "../pages/Supplier/SupplierProducts"

import SuperAdminSection from "../pages/SuperAdmin/SuperAdminSection"
import SuperAdminDashboard from "../pages/SuperAdmin/AdminDashboard"
import Hospitals from "../pages/SuperAdmin/Hospital"
import Reports from "../pages/SuperAdmin/Reports"


const Routers = () => {
    console.log("Routers component rendered");
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<SignUp />} />

            {/* Protected Routes */}
                {/* Doctor Routes */}
                <Route path="/doctor" element={<ProtectedRoute requiredRole="Doctor"><DoctorSection /></ProtectedRoute>} />
                <Route path="/doctor/appointments" element={<ProtectedRoute requiredRole="Doctor"><DoctorAppointments /></ProtectedRoute>} />
                <Route path="/doctor/appointments/prescription" element={<ProtectedRoute requiredRole="Doctor"><Prescription /></ProtectedRoute>} />
                <Route path="/doctor/profile" element={<ProtectedRoute requiredRole="Doctor"><Profiile /></ProtectedRoute>} />
                <Route path="/doctor/medical_products" element={<ProtectedRoute requiredRole="Doctor"><MedicalProducts /></ProtectedRoute>} />

                {/* Patient Routes */}
                <Route path="/patient" element={<ProtectedRoute requiredRole="Patient"><PatientSection /></ProtectedRoute>} />
                <Route path="/patient/appointments" element={<ProtectedRoute requiredRole="Patient"><Appointment /></ProtectedRoute>} />
                
                <Route path="/patient/disease" element={<ProtectedRoute requiredRole="Patient"><Disease /></ProtectedRoute>} />
                <Route path="/patient/profile" element={<ProtectedRoute requiredRole="Patient"><Profiile /></ProtectedRoute>} />


                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute requiredRole="Admin"><AdminSection /></ProtectedRoute>} />
                <Route path="/admin/givemedicine" element={<ProtectedRoute requiredRole="Admin"><GiveMedicine /></ProtectedRoute>} />
                {/* <Route path="/admin/givemedicine/medicine" element={<ProtectedRoute requiredRole="Admin"><Medicine /></ProtectedRoute>} /> */}
                <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="Admin"><Dashboard /></ProtectedRoute>} />
                <Route path="/admin/newRegister" element={<ProtectedRoute requiredRole="Admin"><NewRegister /></ProtectedRoute>} />
                <Route path="/admin/product" element={<ProtectedRoute requiredRole="Admin"><Products /></ProtectedRoute>} />
                <Route path="/admin/department" element={<ProtectedRoute requiredRole="Admin"><Department /></ProtectedRoute>} />

                {/* Supplier Routes */}
                <Route path="/supplier" element={<ProtectedRoute requiredRole="Supplier"><SupplierSection /></ProtectedRoute>} />
                <Route path="/supplier/suppdashboard" element={<ProtectedRoute requiredRole="Supplier"><SuppDashboard /></ProtectedRoute>} />
                <Route path="/supplier/suppproduct" element={<ProtectedRoute requiredRole="Supplier"><SuppProducts /></ProtectedRoute>} />
                <Route path="/supplier/profile" element={<ProtectedRoute requiredRole="Supplier"><Profiile /></ProtectedRoute>} />

                {/* Super Admin Routes */}
                <Route path="/superadmin" element={<ProtectedRoute requiredRole="SuperAdmin"><SuperAdminSection /></ProtectedRoute>} />
                <Route path="/superadmin/dashboard" element={<ProtectedRoute requiredRole="SuperAdmin"><SuperAdminDashboard /></ProtectedRoute>} />
                <Route path="/superadmin/hospitals" element={<ProtectedRoute requiredRole="SuperAdmin"><Hospitals /></ProtectedRoute>} />
                <Route path="/superadmin/reports" element={<ProtectedRoute requiredRole="SuperAdmin"><Reports /></ProtectedRoute>} />

            {/* Catch all - 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
export default Routers;