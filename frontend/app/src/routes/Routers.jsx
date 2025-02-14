import Home from "../pages/Home"
// import Service from "../components/Features"
// import HealthTips from "../components/HealthTips"
// import EmergencyServices from "../components/EmergencyServices"
// import ContactUs from "../components/ContactUs"
// import FindADoctor from "../components/Doctors/FindDoctor"
import Login from "../pages/Login"
import SignUp from "../pages/Signup"
import PatientSection from "../pages/PatientSection"
import DoctorSection from "../pages/DoctorSectiom"
import Appointment from "../components/Patients/Appointments"
import DoctorDetails from "../components/Patients/doctorDetails"
import FindDoctor from "../components/Doctors/FindDoctor"
import Appointmentss from "../components/Doctors/Appointments"
// import DoctorSection from "../pages/DoctorSectiom"
// import AdminSection from "../pages/AdiminSection"
import {Routes,Route} from 'react-router-dom'

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
            <Route path="/patient" element={<PatientSection />} />
            <Route path="/patient/appointments" element={<Appointment />} />
            <Route path="/patient/appointments/doctordetails" element={<DoctorDetails />} />
            {/* <Route path="/doctor/appointments/FindDoctor" element={<FindDoctor/> } /> */}

             <Route path="/doctor" element={<DoctorSection />} />
             <Route path="/doctor/appointments" element={<Appointmentss />} />

            {/* <Route path="/admin" element={<AdminSection />} />  */}
            
        </Routes>
    );
};
export default Routers;