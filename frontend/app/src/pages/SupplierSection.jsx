import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Slidebar from "../pages/Slidebar";
import SuppProduct from "../components/Supplier/suppProducts";
import SuppDashboard from "../components/Supplier/SuppDashboard";


function SupplierSection() {
  const [activeTab, setActiveTab] = useState("suppdashboard");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get user data from localStorage
    const email = localStorage.getItem("userEmail");
    const userType = localStorage.getItem("userType");
    
    // In a real app, you'd fetch this from your API
    setUserData({
      name: email?.split("@")[0] || "User",
      email: email,
      type: userType
    });
  }, []);

  return (
    <div className="flex bg-gray-50">
  <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="supplier" />
  <div className="flex-1 p-8 mt-16">
    <Routes>
      <Route path="/supplier/products" element={<SuppProduct />} />
      <Route path="/supplier/dashboard" element={<SuppDashboard />} />

      <Route path="*" element={
        <div>
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {userData?.name}! 👋
            </h1>
            <p className="text-lg opacity-90">
              Manage your inventory and track your performance all in one place.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-gray-800">Inventory Status</h3>
              <p className="text-gray-600">5 products low in stock</p>
              <button className="mt-4 text-indigo-500 hover:text-indigo-600">
                View Inventory →
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
              <p className="text-gray-600">3 new orders pending approval</p>
              <button className="mt-4 text-indigo-500 hover:text-indigo-600">
                Process Orders →
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-gray-800">Performance</h3>
              <p className="text-gray-600">Your monthly sales are up 12%</p>
              <button className="mt-4 text-indigo-500 hover:text-indigo-600">
                View Reports →
              </button>
            </div>
          </div>

          {/* Supplier Opportunities */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Business Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
                title: "Bulk Orders Available",
                description: "New bulk order opportunities from regional hospitals."
              },
              {
                icon: <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
                title: "Partner Program",
                description: "Join our premium partner program for exclusive benefits."
              },
              {
                icon: <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: "Financing Options",
                description: "Exclusive financing options for expanding your business."
              }
            ].map((opportunity, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="mb-4">
                  {opportunity.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {opportunity.title}
                </h3>
                <p className="text-gray-600">
                  {opportunity.description}
                </p>
                <button className="mt-4 text-indigo-500 hover:text-indigo-600">
                  Learn More →
                </button>
              </div>
            ))}
          </div>
        </div>
      } />
    </Routes>
  </div>
</div>
  );
}

export default SupplierSection;
