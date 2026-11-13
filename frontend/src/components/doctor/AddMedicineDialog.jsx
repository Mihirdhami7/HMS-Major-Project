import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FiSearch, FiX, FiPlus, FiSend, FiShoppingBag } from "react-icons/fi";

const TYPES = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Other"];

/**
 * Add a medicine to a prescription.
 *  1. Pick from the hospital pharmacy (in-stock medicines).
 *  2. Not in the list -> add as an "outside" medicine (patient buys elsewhere)
 *     and/or request it from the pharmacy (admin gets notified).
 */
export default function AddMedicineDialog({ open, onClose, medicines, initialQuery = "", selectedIds = [], onAdd, onAddOutside, onRequest }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Tablet");
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery || "");
      setNotes("");
      setMessage(null);
    }
  }, [open, initialQuery]);

  const term = query.trim().toLowerCase();
  const results = useMemo(
    () => (term ? medicines.filter((m) => m.name.toLowerCase().includes(term)) : medicines),
    [medicines, term]
  );
  const exactMatch = term && medicines.some((m) => m.name.toLowerCase() === term);

  if (!open) return null;

  const request = async () => {
    setRequesting(true);
    setMessage(null);
    const result = await onRequest({ medicineName: query.trim(), productType: type, notes: notes.trim() });
    setRequesting(false);
    setMessage(result.success
      ? { ok: true, text: result.message || "Request sent to the hospital pharmacy." }
      : { ok: false, text: result.message || "Could not send the request." });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-green-500 px-5 py-4 text-white flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Medicine</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-gray-100">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the hospital pharmacy..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Pharmacy list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[120px]">
          <p className="text-xs text-gray-500 mb-2">
            In hospital pharmacy ({results.length}{term ? ` matching "${query.trim()}"` : ""})
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No medicine with this name in the pharmacy.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((m) => {
                const added = selectedIds.includes(m.id);
                return (
                  <li key={m.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        ₹{m.price} · <span className="text-green-700">In stock: {m.stock}</span>
                      </p>
                    </div>
                    <button
                      disabled={added}
                      onClick={() => {
                        onAdd(m);
                        onClose();
                      }}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
                    >
                      {added ? "Added" : (<><FiPlus /> Add</>)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Not in the list */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-2">Not in the list?</p>
          {term && !exactMatch ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="sm:col-span-2 p-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Medicine name"
                />
                <select value={type} onChange={(e) => setType(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm">
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-3"
                placeholder="Note for the pharmacy (strength, brand…) — optional"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    onAddOutside(query.trim());
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <FiShoppingBag /> Prescribe as outside medicine
                </button>
                <button
                  onClick={request}
                  disabled={requesting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-gradient-to-r from-blue-500 to-green-500 text-white hover:opacity-90 disabled:opacity-60"
                >
                  <FiSend /> {requesting ? "Sending..." : "Request from pharmacy"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Outside medicine: the patient buys it elsewhere (₹0 on the hospital bill). Request: the hospital admin is notified to stock it.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">Type the medicine name above. If it is not in the pharmacy, you can prescribe it as an outside medicine or request it.</p>
          )}
          {message && (
            <p className={`text-sm mt-2 ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

AddMedicineDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  medicines: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, name: PropTypes.string, price: PropTypes.number, stock: PropTypes.number })
  ).isRequired,
  initialQuery: PropTypes.string,
  selectedIds: PropTypes.arrayOf(PropTypes.string),
  onAdd: PropTypes.func.isRequired,
  onAddOutside: PropTypes.func.isRequired,
  onRequest: PropTypes.func.isRequired,
};
