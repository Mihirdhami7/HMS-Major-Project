import {Routes,Route} from 'react-router-dom'
// import Service from "../components/Features"
// import HealthTips from "../components/HealthTips"
// import EmergencyServices from "../components/EmergencyServices"
// import ContactUs from "../components/ContactUs"
// import FindADoctor from "../components/Doctors/FindDoctor"
import Home from "../pages/Home"
import Login from "../pages/Login"
import SignUp from "../pages/Signup"

import PatientSection from "../pages/PatientSection"
import Appointment from "../components/Patients/Appointments"
import Disease from "../components/Patients/Disease"

import DoctorSection from "../pages/DoctorSection"
import DoctorAppointments from '../components/Doctors/Dappointments'
import Prescription from "../components/Doctors/Prescription"


import AddData from "../components/Admin/AddData"
import Products from "../components/Admin/Products"
import Medicine from "../components/Admin/Medicine"
import AdminSection from "../pages/AdminSection"


const Routers= () => {
    console.log("Routers component rendered");
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            {/* <Route path="/#services" element={<Service />} />
            <Route path="/#findadocter" element={<FindADoctor />} />
            <Route path="/#heathtips" element={<HealthTips />} />
            <Route path="/#contactus" element={<ContactUs />} />
            <Route path="/#emergency" element={<EmergencyServices />} /> */}
            <Route path="/home" element={<Home />} /> 
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<SignUp />} />

            {/* Patient Section */}
            <Route path="/patient" element={<PatientSection />} />
            <Route path="/patient/appointments" element={<Appointment />} />
            <Route path="/patient/disease" element={<Disease />} />

            {/* Doctor Section */}
            <Route path="/doctor" element={<DoctorSection />} />
            <Route path="/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/doctor/appointments/prescription" element={<Prescription />} />

            {/* Admin Section */}
            <Route path="/admin" element={<AdminSection />} />
            <Route path="/admin/addData" element={<AddData />} />
            <Route path="/admin/product" element={<Products />} />
            <Route path="/admin/product/medicine" element={<Medicine />} />

            {/* <Route path="/doctor" element={<DoctorSection />} />
            <Route path="/admin" element={<AdminSection />} /> */}
            
        </Routes>
    );
};
export default Routers;