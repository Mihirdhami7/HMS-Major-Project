import {Routes, Route, Navigate} from 'react-router-dom'
import Home from "../pages/Home"
import Login from "../pages/Login"
import SignUp from "../pages/Signup"

import PatientSection from "../pages/PatientSection"
import Appointment from "../components/Patients/Appointments"
import Disease from "../components/Patients/Disease"    

import DoctorSection from "../pages/DoctorSection"
import DoctorAppointments from '../components/Doctors/Dappointments'
import Prescription from "../components/Doctors/Prescription"
import MedicalProducts from "../components/Doctors/MedicalProducts"

import Profiile from "../pages/Profile"


import NewRegister from "../components/Admin/NewRegister"
import Products from "../components/Admin/Products"
import GiveMedicine from '../components/Admin/GiveMedicine'
import Medicine from "../components/Admin/Medicine"
import AdminSection from "../pages/AdminSection"
import Department from "../components/Admin/Department"
import Dashboard from "../components/Admin/Dashboard"

import SupplierSection from "../pages/SupplierSection"
import SuppDashboard from "../components/Supplier/SuppDashboard"
import SuppProducts from "../components/Supplier/suppProducts"

import SuperAdminSection from "../pages/SuperAdminSection"
import SuperAdminDashboard from "../components/SuperAdmin/AdminDashborad"
import Hospitals from "../components/SuperAdmin/Hospital"
import Reports from "../components/SuperAdmin/Reports"
import ProtectedRoute from "../components/ProtectedRoute";

const Routers = () => {
    console.log("Routers component rendered");
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<SignUp />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                {/* Doctor Routes */}
                <Route path="/doctor" element={<DoctorSection />} />
                <Route path="/doctor/appointments" element={<DoctorAppointments />} />
                <Route path="/doctor/appointments/prescription" element={<Prescription />} />
                <Route path="/doctor/profile/:email" element={<Profiile />} />
                <Route path="/doctor/medical_products" element={<MedicalProducts />} />

                {/* Patient Routes */}
                <Route path="/patient" element={<PatientSection />} />
                <Route path="/patient/appointments" element={<Appointment />} />
                
                <Route path="/patient/disease" element={<Disease />} />
                <Route path="/patient/profile/:email" element={<Profiile />} />


                {/* Admin Routes */}
                <Route path="/admin" element={<AdminSection />} />
                <Route path="/admin/givemedicine" element={<GiveMedicine />} />
                <Route path="/admin/givemedicine/medicine" element={<Medicine />} />
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/newRegister" element={<NewRegister />} />
                <Route path="/admin/product" element={<Products />} />
                <Route path="/admin/department" element={<Department />} />

                {/* Supplier Routes */}
                <Route path="/supplier" element={<SupplierSection />} />
                <Route path="/supplier/suppdashboard" element={<SuppDashboard />} />
                <Route path="/supplier/suppproduct" element={<SuppProducts />} />

                {/* Super Admin Routes */}
                <Route path="/superadmin" element={<SuperAdminSection />} />
                <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/superadmin/hospitals" element={<Hospitals />} />
                <Route path="/superadmin/reports" element={<Reports />} />

            </Route>

            {/* Catch all - 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
export default Routers;