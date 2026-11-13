"""
Prescription PDF (generated on the server) + email to the patient from the SYSTEM mailbox.

- build_prescription_pdf(prescription, hospital) -> bytes
- email_prescription_async(prescription_id)    -> sends in a background thread, records the result
  on the prescription as  emailStatus: { sent, to, at, error }
"""
import logging
import threading
from datetime import datetime, timezone

from bson import ObjectId
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from fpdf import FPDF

from backend.db import hospitals_collection, prescriptions_collection

logger = logging.getLogger(__name__)

BLUE = (37, 99, 235)
GREEN = (22, 163, 74)
GRAY = (100, 116, 139)
DARK = (30, 41, 59)


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _txt(value):
    """Core PDF fonts are latin-1 only: replace characters they cannot draw."""
    text = "" if value is None else str(value)
    text = text.replace("₹", "Rs. ").replace("–", "-").replace("—", "-").replace("•", "-")
    return text.encode("latin-1", "replace").decode("latin-1")


def _dr(name):
    n = str(name or "").strip()
    return n if n.lower().startswith("dr") else f"Dr. {n}"


def _date(value):
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    return _txt(value or "")


class _PrescriptionPDF(FPDF):
    def __init__(self, hospital_name, footer_text):
        super().__init__(format="A4")
        self.hospital_name = hospital_name
        self.footer_text = footer_text
        self.set_auto_page_break(auto=True, margin=18)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 6, _txt(self.footer_text), align="C")


def build_prescription_pdf(prescription, hospital=None):
    hospital = hospital or {}
    patient = prescription.get("patient") or {}
    doctor = prescription.get("doctor") or {}
    hospital_name = hospital.get("name") or prescription.get("hospitalName") or "Hospital"

    pdf = _PrescriptionPDF(hospital_name, f"{hospital_name} - computer-generated prescription. Valid with the doctor's name.")
    pdf.add_page()
    w = pdf.w - pdf.l_margin - pdf.r_margin

    # ---- header band ----
    pdf.set_fill_color(*BLUE)
    pdf.rect(0, 0, pdf.w, 30, "F")
    pdf.set_xy(pdf.l_margin, 8)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(w * 0.65, 8, _txt(hospital_name))
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(w * 0.35, 8, _txt("PRESCRIPTION"), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    line = " | ".join(x for x in [hospital.get("address"), hospital.get("contactNo")] if x)
    pdf.cell(w, 5, _txt(line), new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(36)

    # ---- doctor / date ----
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(w * 0.6, 6, _txt(_dr(doctor.get("name"))))
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(w * 0.4, 6, _txt(f"Date: {_date(prescription.get('createdAt'))}"), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*GRAY)
    pdf.cell(w * 0.6, 5, _txt(f"Department: {prescription.get('department') or '-'}"))
    pdf.cell(w * 0.4, 5, _txt(f"Rx No: {str(prescription.get('_id'))[-8:].upper()}"), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # ---- patient box ----
    pdf.set_draw_color(226, 232, 240)
    pdf.set_fill_color(248, 250, 252)
    y = pdf.get_y()
    pdf.rect(pdf.l_margin, y, w, 20, "DF")
    pdf.set_xy(pdf.l_margin + 3, y + 3)
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(w / 2, 5, _txt(f"Patient: {patient.get('name') or '-'}"))
    pdf.set_font("Helvetica", "", 9)
    age_gender = ", ".join(x for x in [f"{patient.get('age')} yrs" if patient.get("age") else "", patient.get("gender") or ""] if x)
    pdf.cell(w / 2 - 6, 5, _txt(age_gender), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(pdf.l_margin + 3)
    pdf.set_text_color(*GRAY)
    pdf.cell(w / 2, 5, _txt(patient.get("email") or ""))
    pdf.cell(w / 2 - 6, 5, _txt(patient.get("phone") or ""), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(y + 24)

    # ---- vitals ----
    vitals = {k: v for k, v in (prescription.get("vitals") or {}).items() if v not in (None, "")}
    if vitals:
        labels = {"bloodPressure": "BP", "heartRate": "Pulse", "temperature": "Temp", "weight": "Weight",
                  "height": "Height", "oxygenLevel": "SpO2"}
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(w, 6, "Vitals", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(w, 5, _txt("   ".join(f"{labels.get(k, k)}: {v}" for k, v in vitals.items())), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    # ---- medicines table ----
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(w, 8, "Rx", new_x="LMARGIN", new_y="NEXT")
    cols = [("#", 8), ("Medicine", 62), ("Dosage", 30), ("Frequency", 32), ("Duration", 26), ("Qty", 0)]
    cols[-1] = ("Qty", w - sum(c[1] for c in cols[:-1]))
    pdf.set_fill_color(*BLUE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    for title, cw in cols:
        pdf.cell(cw, 7, title, border=0, fill=True)
    pdf.ln()
    pdf.set_text_color(*DARK)
    pdf.set_font("Helvetica", "", 9)
    outside_any = False
    for i, m in enumerate(prescription.get("medicines") or [], start=1):
        outside = bool(m.get("outside")) or not m.get("medicineId")
        outside_any = outside_any or outside
        name = f"{m.get('name', '')}{' *' if outside else ''}"
        row = [str(i), name, m.get("dosage", ""), m.get("frequency", ""), m.get("duration", ""), str(m.get("quantity", ""))]
        fill = i % 2 == 0
        pdf.set_fill_color(241, 245, 249)
        for (title, cw), value in zip(cols, row):
            pdf.cell(cw, 7, _txt(value)[:40], border="B", fill=fill)
        pdf.ln()
    if outside_any:
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(*GRAY)
        pdf.cell(w, 5, "* Not available in the hospital pharmacy - please buy from an outside chemist.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # ---- advice ----
    if prescription.get("suggestions"):
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(w, 6, "Advice", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(w, 5, _txt(prescription["suggestions"]), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    # ---- report ----
    reports = prescription.get("reports") or {}
    if reports.get("reportType") and reports.get("reportType") != "none":
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(w, 6, _txt(f"Tests / Report: {reports.get('reportType')}"), new_x="LMARGIN", new_y="NEXT")
        values = reports.get("reportValues") or {}
        if isinstance(values, dict) and values:
            pdf.set_font("Helvetica", "", 9)
            pdf.multi_cell(w, 5, _txt(", ".join(f"{k}: {v}" for k, v in values.items())), new_x="LMARGIN", new_y="NEXT")

    # ---- signature ----
    pdf.ln(10)
    pdf.set_x(pdf.l_margin + w - 60)
    pdf.set_draw_color(*GRAY)
    pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 60, pdf.get_y())
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*DARK)
    pdf.cell(60, 6, _txt(_dr(doctor.get("name"))), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(pdf.l_margin + w - 60)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(60, 4, _txt(prescription.get("department") or ""), align="C")

    return bytes(pdf.output())


def pdf_filename(prescription):
    name = "".join(ch for ch in str((prescription.get("patient") or {}).get("name") or "patient") if ch.isalnum() or ch in " -_").strip().replace(" ", "_")
    return f"Prescription_{name}_{_date(prescription.get('createdAt')).replace(' ', '-')}.pdf"


def _send_prescription_email(prescription_id):
    """Runs in a background thread. Sends from the system mailbox (settings.DEFAULT_FROM_EMAIL)."""
    status_doc = {"sent": False, "at": _now()}
    try:
        prescription = prescriptions_collection.find_one({"_id": ObjectId(prescription_id)})
        if not prescription:
            return
        patient = prescription.get("patient") or {}
        to = patient.get("email")
        status_doc["to"] = to
        if not to:
            raise RuntimeError("patient has no email address")
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            raise RuntimeError("system email is not configured (EMAIL_HOST_USER / EMAIL_HOST_PASSWORD)")

        hospital = hospitals_collection.find_one({"name": prescription.get("hospitalName")}) or {}
        pdf_bytes = build_prescription_pdf(prescription, hospital)
        hospital_name = hospital.get("name") or prescription.get("hospitalName") or "the hospital"
        doctor = _dr((prescription.get("doctor") or {}).get("name"))
        medicines = ", ".join(m.get("name", "") for m in prescription.get("medicines") or []) or "-"

        text = (f"Dear {patient.get('name') or 'Patient'},\n\n"
                f"Your prescription from {doctor} ({prescription.get('department') or ''}) at {hospital_name} is attached as a PDF.\n\n"
                f"Medicines: {medicines}\n"
                f"Advice: {prescription.get('suggestions') or '-'}\n\n"
                "You can also view it any time in your EasyTreat account (Home > My Prescriptions).\n\n"
                f"Get well soon,\n{hospital_name}\n\n"
                "This is an automated message - please do not reply.")
        html = (f"<p>Dear {patient.get('name') or 'Patient'},</p>"
                f"<p>Your prescription from <strong>{doctor}</strong> ({prescription.get('department') or ''}) at "
                f"<strong>{hospital_name}</strong> is attached as a PDF.</p>"
                f"<p><strong>Medicines:</strong> {medicines}<br><strong>Advice:</strong> {prescription.get('suggestions') or '-'}</p>"
                "<p>You can also view it any time in your EasyTreat account (Home &rsaquo; My Prescriptions).</p>"
                f"<p>Get well soon,<br>{hospital_name}</p>"
                "<p style='color:#64748b;font-size:12px'>This is an automated message - please do not reply.</p>")
        msg = EmailMultiAlternatives(
            subject=f"Your prescription from {doctor} - {hospital_name}",
            body=text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        )
        msg.attach_alternative(html, "text/html")
        msg.attach(pdf_filename(prescription), pdf_bytes, "application/pdf")
        msg.send(fail_silently=False)
        status_doc["sent"] = True
        logger.info("Prescription %s emailed to %s", prescription_id, to)
    except Exception as exc:
        status_doc["error"] = str(exc)[:300]
        logger.warning("Prescription %s email failed: %s", prescription_id, exc)
    finally:
        try:
            prescriptions_collection.update_one({"_id": ObjectId(prescription_id)}, {"$set": {"emailStatus": status_doc}})
        except Exception:  # pragma: no cover - best effort
            pass


def email_prescription_async(prescription_id):
    """Send the prescription email in the background so saving never waits for the mail server."""
    threading.Thread(target=_send_prescription_email, args=(str(prescription_id),), daemon=True).start()
