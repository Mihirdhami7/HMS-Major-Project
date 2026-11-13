/** "Alish" -> "Dr. Alish"; "Dr. Alish" / "dr alish" stay as they are. */
export const doctorName = (name) => {
  const n = String(name || "").trim();
  if (!n) return "—";
  return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`;
};
