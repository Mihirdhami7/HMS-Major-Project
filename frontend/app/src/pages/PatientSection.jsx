import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Slidebar from "../pages/Slidebar";
import Appointment from "../components/Patients/Appointments";
/* import Profile from "../components/Patients/profile"; // Import Profiles component
import BriefDisease from "../components/Patients/BriefDisease"; // Import BriefDisease component
 */
function PatientSection() {
  const [activeTab, setActiveTab] = useState("Appointments");

  return (
    <div className="flex">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />
      <div className="flex-1 p-6">
        <Routes>
          <Route path="/patient/appointments" element={<Appointment />} />
          {/* <Route path="/patient/profiles" element={<Profiles />} />
          <Route path="/patient/brief_disease" element={<BriefDisease />} /> */}
          <Route path="*" element={<h2>Welcome to the Patient Section</h2>} />
        </Routes>
      </div>
    </div>
  );
}

export default PatientSection;
