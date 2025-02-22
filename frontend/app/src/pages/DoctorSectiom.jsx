import { useState } from "react";
import { BrowserRouter as  Route, Routes } from "react-router-dom";
import Slidebar from "../pages/Slidebar";
import Appointments from "../components/Doctors/Appointments";
/* import Profile from "../components/Patients/profile"; // Import Profiles component
import BriefDisease from "../components/Patients/BriefDisease"; // Import BriefDisease component
 */
function DoctorSection() {
  const [activeTab, setActiveTab] = useState("Appointments");

  return (
    <div className="flex">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="doctor" />
      <div className="flex-1 p-6">
        <Routes>
          <Route path="/doctors/appointment" element={<Appointments />} />
          {/* <Route path="/patient/profiles" element={<Profiles />} />
          <Route path="/patient/brief_disease" element={<BriefDisease />} /> */}
      
          <Route path="*" element={<h2>Welcome to the Doctor Section</h2>} />
        </Routes>
      </div>
    </div>
  );
}

export default DoctorSection;
