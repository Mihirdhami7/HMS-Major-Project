import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "./Slidebar";
import Dashboard from "../components/Admin/Dashboard";
import AddData from "../components/Admin/AddData";

function AdminSection() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div className="flex">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />
      <div className="flex-1 p-6">
        <Routes>
          <Route path="/Admin/appointments" element={<Dashboard />} />
          <Route path="/Admin/AddData" element={<AddData />} />
          <Route path="*" element={<h2>Welcome to the Admin Section</h2>} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminSection;
