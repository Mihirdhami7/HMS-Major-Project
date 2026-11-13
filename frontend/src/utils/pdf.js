import { getPrescriptionPdf } from "../services/appointmentsService";

/**
 * Open a prescription PDF in a new browser tab (view only — nothing is saved by the app).
 * The tab is opened synchronously so pop-up blockers allow it, then filled when the PDF arrives.
 * @returns {Promise<string|null>} error message, or null on success
 */
export const viewPrescriptionPdf = async (token, prescriptionId) => {
  const tab = window.open("", "_blank");
  if (tab) tab.document.write("<p style='font-family:sans-serif;padding:24px'>Loading prescription…</p>");
  const result = await getPrescriptionPdf(token, prescriptionId);
  if (!result.success || !(result.data instanceof Blob)) {
    if (tab) tab.close();
    return result.message || "Could not open the prescription.";
  }
  const url = URL.createObjectURL(new Blob([result.data], { type: "application/pdf" }));
  if (tab) tab.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return null;
};
