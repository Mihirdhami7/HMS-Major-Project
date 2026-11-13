import { useState } from "react";
import PropTypes from "prop-types";
import { FiEye, FiMail } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { emailPrescription } from "../../services/appointmentsService";
import { viewPrescriptionPdf } from "../../utils/pdf";

/** "View PDF" (opens in a new tab, nothing saved) and "Email me" for one prescription. */
export default function PrescriptionActions({ prescriptionId, showEmail = true }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  const view = async () => {
    setBusy("view");
    setMessage(null);
    const err = await viewPrescriptionPdf(token, prescriptionId);
    if (err) setMessage({ ok: false, text: err });
    setBusy(null);
  };

  const email = async () => {
    setBusy("email");
    setMessage(null);
    const result = await emailPrescription(token, prescriptionId);
    setMessage({ ok: result.success, text: result.message || (result.success ? "Sent to your email." : "Could not send.") });
    setBusy(null);
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={view}
          disabled={!!busy}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
        >
          <FiEye /> {busy === "view" ? "Opening…" : "View PDF"}
        </button>
        {showEmail && (
        <button
          onClick={email}
          disabled={!!busy}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60"
        >
          <FiMail /> {busy === "email" ? "Sending…" : "Email me"}
        </button>
        )}
      </div>
      {message && <p className={`text-xs mt-1 ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>}
    </div>
  );
}

PrescriptionActions.propTypes = {
  prescriptionId: PropTypes.string.isRequired,
  showEmail: PropTypes.bool,
};
