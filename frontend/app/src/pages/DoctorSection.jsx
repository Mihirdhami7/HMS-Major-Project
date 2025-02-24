import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import DoctorAppointments from "../components/Doctors/Dappointments";
import Prescription from "../components/Doctors/Prescription";

function DoctorSection() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div className="flex">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="doctor" />
      <div className="flex-1 p-6">
        <Routes>
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/appointments/precription" element={<Prescription />} />
          <Route path="*" element={<h2>Welcome to the Admin Section</h2>} />
        </Routes>
      </div>
    </div>
  );
}

export default DoctorSection;
