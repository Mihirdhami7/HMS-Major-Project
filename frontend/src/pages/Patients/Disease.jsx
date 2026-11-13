import { useEffect, useMemo, useState } from 'react';
import { listDiseases } from "../../services/diseaseService";
import { pickList } from "../../services/apiClient";
import Slidebar from "../../components/Sidebar";

// Static health tips (general guidance, not patient data)
const HEALTH_TIPS = [
  { icon: "💧", tip: "Drink at least 8 glasses of water daily." },
  { icon: "🚶", tip: "Take a 30-minute walk for heart health." },
  { icon: "😴", tip: "Get 7–9 hours of sleep for recovery." },
  { icon: "🥦", tip: "Eat vegetables and fruits every meal." },
  { icon: "🧘", tip: "5 minutes of deep breathing reduces stress." },
];

const Disease = () => {
  const [activeTab, setActiveTab] = useState("disease");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Disease catalogue from the backend (GET /api/diseases/), grouped by department.
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listDiseases();
      if (cancelled) return;
      if (result.success) setCatalogue(pickList(result, "diseases"));
      else setError(result.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const diseases = useMemo(
    () =>
      catalogue.reduce((groups, d) => {
        (groups[d.department] = groups[d.department] || []).push(d);
        return groups;
      }, {}),
    [catalogue]
  );

  const getDisplayedDiseases = () =>
    selectedDepartment === "all" ? catalogue : diseases[selectedDepartment] || [];

  return (
    <div className="flex h-screen pt-16 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-3xl font-bold mb-6 flex items-center text-blue-700">
          
          Common Diseases & Conditions
        </h2>

        {/* Daily health tips (moved here from the patient dashboard) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Daily Health Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {HEALTH_TIPS.map(({ icon, tip }) => (
              <div key={tip} className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

         {/* Department Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto py-2">
          <button
            onClick={() => setSelectedDepartment("all")}
            className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
              selectedDepartment === "all"
                ? "bg-blue-500 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Departments
          </button>
          {Object.keys(diseases).map((department) => (
            <button
              key={department}
              onClick={() => setSelectedDepartment(department)}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
                selectedDepartment === department
                  ? "bg-blue-500 text-white border-blue-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {department.charAt(0).toUpperCase() + department.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 py-6 text-center">Loading diseases…</p>}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {!loading && !error && catalogue.length === 0 && (
          <p className="text-gray-500 py-6 text-center">No disease information available yet.</p>
        )}

        {/* Disease Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getDisplayedDiseases().map((disease) => (
            <div key={disease.id} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 border border-blue-100 hover:border-green-200">
              {/* Disease Image */}
              <div className="h-48 bg-gradient-to-r from-blue-100 to-green-100">
                {disease.image ? (
                  <img
                    src={disease.image}
                    alt={disease.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-700">
                    {disease.name}
                  </div>
                )}
              </div>

              {/* Disease Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-blue-700">{disease.name}</h3>
                <p className="text-gray-600 mb-4">{disease.description}</p>

                {/* Symptoms */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-700">Common Symptoms:</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {(disease.symptoms || []).map((symptom, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Disease;
