import Home from "../pages/Home"
// import Service from "../components/Features"
// import HealthTips from "../components/HealthTips"
// import EmergencyServices from "../components/EmergencyServices"
// import ContactUs from "../components/ContactUs"
// import FindADoctor from "../components/Doctors/FindDoctor"
import Login from "../pages/Login"
import SignUp from "../pages/Signup"

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
            
        </Routes>
    );
};
export default Routers;