import { useState } from "react";
import { Link } from "react-router-dom";
import { FiBarChart2 } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";

// The backend has no reporting / analytics endpoint yet (revenue, appointment volume, sales).
// Rather than show made-up numbers this page says so and points to the real overview.
const Reports = () => {
  const [activeTab, setActiveTab] = useState("reports");

  return (
    <div className="flex bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="superadmin" />
      <div className="flex-1 p-8 mt-16">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FiBarChart2 className="mx-auto text-5xl text-blue-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Reports are coming soon</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6">
            System-wide reports (appointments over time, revenue, medicine sales and purchases) need
            reporting endpoints that the server does not provide yet.
          </p>
          <Link
            to="/superadmin/dashboard"
            className="inline-block px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View current hospital, doctor and patient counts
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Reports;
