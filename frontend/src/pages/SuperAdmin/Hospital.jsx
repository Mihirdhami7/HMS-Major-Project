import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import Slidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
  listHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
  listDepartments,
} from "../../services/hospitalService";
import { listDoctors } from "../../services/userService";
import { pickList } from "../../services/apiClient";

// Fields accepted by backend HospitalSerializer (adminEmail must belong to an existing Admin user).
const EMPTY_FORM = { name: "", adminEmail: "", contactNo: "", address: "", description: "" };

const inputClass =
  "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const initialOf = (name = "") => name.trim().charAt(0).toUpperCase() || "H";

/** Departments + doctors of one hospital. */
function HospitalDetail({ token, hospital, onBack }) {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [dRes, docRes] = await Promise.all([
        listDepartments(token, hospital.id),
        listDoctors(token, hospital.name),
      ]);
      if (cancelled) return;
      setDepartments(pickList(dRes, "departments"));
      setDoctors(pickList(docRes, "doctors"));
      const errors = [dRes, docRes].filter((r) => !r.success).map((r) => r.message);
      setError(errors.length ? errors.join(" | ") : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hospital.id, hospital.name]);

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Back to All Hospitals
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {initialOf(hospital.name)}
          </div>
          <div className="ml-6">
            <h2 className="text-2xl font-bold text-gray-900">{hospital.name}</h2>
            {hospital.address && <p className="text-gray-600">{hospital.address}</p>}
            {hospital.contactNo && <p className="text-gray-600">{hospital.contactNo}</p>}
            <p className="text-gray-600">
              Admin: {hospital.adminName || "—"} {hospital.adminEmail && `(${hospital.adminEmail})`}
            </p>
            {hospital.description && <p className="text-gray-500 mt-1">{hospital.description}</p>}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">{error}</div>}

      {loading ? (
        <p className="text-gray-600">Loading hospital details...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Departments ({departments.length})</h3>
            {departments.length === 0 ? (
              <p className="text-gray-500 text-sm">No departments yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.headOfDepartment || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Doctors ({doctors.length})</h3>
            {doctors.length === 0 ? (
              <p className="text-gray-500 text-sm">No doctors yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.map((d) => (
                    <tr key={d._id || d.email}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {d.name}
                        <div className="text-xs text-gray-400">{d.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.department || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.specialization || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

HospitalDetail.propTypes = {
  token: PropTypes.string,
  hospital: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    address: PropTypes.string,
    contactNo: PropTypes.string,
    adminName: PropTypes.string,
    adminEmail: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
};

const HospitalDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("hospitals");
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // Form state: editingId === null → create, otherwise update that hospital.
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listHospitals(token);
    if (result.success) {
      setHospitals(pickList(result, "hospitals"));
    } else {
      setError(result.message);
      setHospitals([]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setForm({
      name: h.name || "",
      adminEmail: h.adminEmail || "",
      contactNo: h.contactNo || "",
      address: h.address || "",
      description: h.description || "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      adminEmail: form.adminEmail.trim().toLowerCase(),
      contactNo: form.contactNo.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
    };
    if (!payload.name || !payload.adminEmail || !payload.contactNo) {
      setFormError("Name, admin email and contact number are required.");
      return;
    }

    setSaving(true);
    const result = editingId
      ? await updateHospital(token, editingId, payload)
      : await createHospital(token, payload);
    setSaving(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }
    setShowForm(false);
    setNotice(result.message || (editingId ? "Hospital updated" : "Hospital created"));
    load();
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Delete hospital "${h.name}"? This cannot be undone.`)) return;
    setNotice(null);
    setError(null);
    const result = await deleteHospital(token, h.id);
    if (result.success) {
      setNotice(result.message || "Hospital deleted");
      load();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex bg-gray-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="superadmin" />
      <div className="flex-1 min-h-screen bg-gray-100 mt-16">
        <div className="container mx-auto p-4">
          {selectedHospital ? (
            <HospitalDetail token={token} hospital={selectedHospital} onBack={() => setSelectedHospital(null)} />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Hospitals</h2>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus size={18} /> Add Hospital
                </button>
              </div>

              {notice && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 text-green-700">{notice}</div>
              )}
              {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700">{error}</div>}

              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {editingId ? "Edit Hospital" : "New Hospital"}
                    </h3>
                    <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </div>
                  {formError && <p className="text-red-600 text-sm">{formError}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Hospital name *</label>
                      <input name="name" value={form.name} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Admin email * (existing Admin account)</label>
                      <input name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Contact number *</label>
                      <input name="contactNo" value={form.contactNo} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Address</label>
                      <input name="address" value={form.address} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows={3} value={form.description} onChange={handleChange} className={inputClass} />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Create Hospital"}
                  </button>
                </form>
              )}

              {loading ? (
                <p className="text-gray-600">Loading hospitals...</p>
              ) : hospitals.length === 0 ? (
                !error && <p className="text-gray-500">No hospitals yet. Click “Add Hospital” to create one.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {hospitals.map((h) => (
                    <div
                      key={h.id}
                      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all border-l-4 border-blue-500"
                      onClick={() => setSelectedHospital(h)}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                          {initialOf(h.name)}
                        </div>
                        <div className="ml-4 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{h.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{h.address || "No address"}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Admin:</span>
                          <span className="ml-1 font-medium">{h.adminName || h.adminEmail || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Contact:</span>
                          <span className="ml-1 font-medium">{h.contactNo || "—"}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(h)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(h)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
