import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { FiHome, FiLayers, FiBriefcase, FiUsers, FiClock, FiRefreshCw } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { listHospitals, listDepartments } from "../../services/hospitalService";
import { listDoctors, listPendingDoctors, listPatients } from "../../services/userService";
import { pickList } from "../../services/apiClient";

const countOf = (result, key) => {
  if (!result?.success) return null;
  if (typeof result.data?.count === "number") return result.data.count;
  return pickList(result, key).length;
};

/**
 * Builds a real system overview from the existing list endpoints:
 *   GET /api/hospitals/                                 → hospitals
 *   GET /api/hospitals/<id>/departments/                → departments per hospital
 *   GET /api/users/doctors/<hospital>/                  → approved doctors per hospital
 *   GET /api/users/doctors/<hospital>/pending/          → doctors awaiting approval
 *   GET /api/users/patients/<hospital>/                 → patients per hospital
 * (There is no system-wide statistics endpoint, so counts are summed client-side.)
 */
const useSystemOverview = (token) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const hRes = await listHospitals(token);
    if (!hRes.success) {
      setError(hRes.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const hospitals = pickList(hRes, "hospitals");
    const detailed = await Promise.all(
      hospitals.map(async (h) => {
        const [dep, doc, pend, pat] = await Promise.all([
          listDepartments(token, h.id),
          listDoctors(token, h.name),
          listPendingDoctors(token, h.name),
          listPatients(token, h.name),
        ]);
        return {
          ...h,
          departments: countOf(dep, "departments"),
          doctors: countOf(doc, "doctors"),
          pendingDoctors: countOf(pend, "pending_doctors"),
          patients: countOf(pat, "patients"),
        };
      })
    );
    setRows(detailed);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
};

const sum = (rows, key) => rows.reduce((total, r) => total + (typeof r[key] === "number" ? r[key] : 0), 0);
const show = (v) => (typeof v === "number" ? v.toLocaleString() : "—");

/** Stats + per-hospital table. Used by the super admin home and the dashboard page. */
export function SystemOverview({ token }) {
  const { rows, loading, error, reload } = useSystemOverview(token);

  const stats = [
    { label: "Total Hospitals", value: rows.length, icon: <FiHome />, color: "blue" },
    { label: "Total Departments", value: sum(rows, "departments"), icon: <FiLayers />, color: "green" },
    { label: "Approved Doctors", value: sum(rows, "doctors"), icon: <FiBriefcase />, color: "blue" },
    { label: "Pending Doctors", value: sum(rows, "pendingDoctors"), icon: <FiClock />, color: "yellow" },
    { label: "Total Patients", value: sum(rows, "patients"), icon: <FiUsers />, color: "green" },
  ];

  if (loading) {
    return <p className="text-gray-600">Loading system overview...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex items-center justify-between">
        <p className="text-red-700">{error}</p>
        <button onClick={reload} className="text-sm text-red-700 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-lg p-6">
            <div className={`text-${stat.color}-500 text-2xl mb-2`}>{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{stat.value.toLocaleString()}</div>
            <div className="text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Per-hospital table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Hospitals</h2>
          <div className="flex items-center gap-4">
            <button onClick={reload} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
              <FiRefreshCw /> Refresh
            </button>
            <Link to="/superadmin/hospitals" className="text-sm text-blue-600 hover:underline">
              Manage hospitals →
            </Link>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-500">No hospitals yet. Add the first one from Hospitals Data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Hospital", "Admin", "Departments", "Doctors", "Pending", "Patients"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {h.name}
                      {h.address && <div className="text-xs text-gray-500">{h.address}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {h.adminName || "—"}
                      {h.adminEmail && <div className="text-xs text-gray-400">{h.adminEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{show(h.departments)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{show(h.doctors)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{show(h.pendingDoctors)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{show(h.patients)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">&quot;—&quot; means the count could not be loaded for that hospital.</p>
          </div>
        )}
      </div>
    </div>
  );
}

SystemOverview.propTypes = {
  token: PropTypes.string,
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="superadmin" />
      <div className="flex-1 p-8 mt-16">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">System Dashboard</h1>
        <SystemOverview token={token} />
      </div>
    </div>
  );
};

export default AdminDashboard;
