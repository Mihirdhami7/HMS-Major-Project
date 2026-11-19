"""
Super admin API: platform-wide numbers across all hospitals.

    GET /api/superadmin/dashboard/?period=week|month|quarter|year|all&hospital=<name>
"""
import logging
from datetime import date
from collections import Counter, defaultdict

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.accounts.permissions import IsSuperAdmin
from backend.db import (
    appointments_collection, departments_collection, hospitals_collection, invoices_collection,
    staff_collection, users_collection,
)
from .periods import (
    PERIOD_LABELS, PERIODS, bucket_index, buckets, day_of, in_range, pct_change, period_range, previous_range,
)

logger = logging.getLogger(__name__)

STATUSES = ("pending", "approved", "completed", "rejected", "cancelled")
PAID = {"completed", "success", "paid"}


def appointment_day(a):
    """The visit date (rescheduled date when the admin changed it)."""
    return day_of(a.get("acceptedDate") or a.get("appointmentDate"))


def booking_fees(appointments):
    """[(hospital, day, amount, method)] for every paid booking fee."""
    out = []
    for a in appointments:
        for p in a.get("payments") or []:
            if str(p.get("status", "")).lower() in PAID:
                out.append((a.get("hospitalName"), day_of(p.get("paymentDate")) or appointment_day(a),
                            float(p.get("amount") or 0), str(p.get("method") or "online").lower()))
    return out


def pharmacy_bills(hospital=None):
    """[(hospital, day, amount, method)] for every paid medicine bill."""
    query = {"hospitalName": hospital} if hospital else {}
    out = []
    for inv in invoices_collection.find(query, {"hospitalName": 1, "totalAmount": 1, "createdAt": 1, "created_at": 1,
                                                "paymentMethod": 1, "paymentId": 1, "status": 1}):
        if str(inv.get("status") or "paid").lower() not in PAID:
            continue
        method = inv.get("paymentMethod") or ("online" if inv.get("paymentId") else "cash")
        out.append((inv.get("hospitalName"), day_of(inv.get("createdAt") or inv.get("created_at")),
                    float(inv.get("totalAmount") or 0), str(method).lower()))
    return out


class DashboardView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        period = request.query_params.get("period", "month")
        if period not in PERIODS:
            return Response({"status": "error", "message": f"period must be one of {', '.join(PERIODS)}"},
                            status=status.HTTP_400_BAD_REQUEST)
        hospital = (request.query_params.get("hospital") or "").strip() or None
        try:
            return Response(self.build(period, hospital), status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error("superadmin dashboard: %s", exc, exc_info=True)
            return Response({"status": "error", "message": "Could not load the dashboard."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @staticmethod
    def build(period, hospital):
        hospitals = [h["name"] for h in hospitals_collection.find({}, {"name": 1}).sort("name", 1)]
        names = [hospital] if hospital else hospitals
        hq = {"hospitalName": hospital} if hospital else {}

        appts = list(appointments_collection.find(hq, {"hospitalName": 1, "department": 1, "status": 1,
                                                       "appointmentDate": 1, "acceptedDate": 1, "payments": 1}))
        fees = booking_fees(appts)
        bills = pharmacy_bills(hospital)
        money = [(h, d, amt) for h, d, amt, _ in fees + bills]

        first = min((appointment_day(a) for a in appts if appointment_day(a)), default=None)
        start, end = period_range(period, first_date=date.fromisoformat(first) if first else None)
        prev = previous_range(period, start, end)

        in_period = [a for a in appts if in_range(appointment_day(a), start, end)]
        prev_count = sum(1 for a in appts if prev and in_range(appointment_day(a), *prev))
        revenue = sum(amt for _, d, amt in money if in_range(d, start, end))
        prev_revenue = sum(amt for _, d, amt in money if prev and in_range(d, *prev)) if prev else None

        # ---- timeline (appointments by status per bucket)
        bl = buckets(period, start, end)
        find = bucket_index(bl)
        timeline = [{"label": b["label"], "total": 0, **{s: 0 for s in STATUSES}} for b in bl]
        for a in in_period:
            i = find(appointment_day(a))
            if i is not None:
                s = a.get("status") if a.get("status") in STATUSES else "pending"
                timeline[i][s] += 1
                timeline[i]["total"] += 1
        revenue_timeline = [{"label": b["label"], "amount": 0.0} for b in bl]
        for _, d, amt in money:
            i = find(d) if in_range(d, start, end) else None
            if i is not None:
                revenue_timeline[i]["amount"] += amt

        # ---- per hospital
        staff = list(staff_collection.find({"role": "Doctor", **hq}, {"hospitalName": 1, "isApproved": 1}))
        doctors = Counter(d.get("hospitalName") for d in staff if d.get("isApproved"))
        pending = Counter(d.get("hospitalName") for d in staff if not d.get("isApproved"))
        patients = Counter(u.get("hospitalName") for u in users_collection.find({"userType": "Patient", **hq},
                                                                                 {"hospitalName": 1}))
        departments = Counter(d.get("hospitalName") for d in departments_collection.find(hq, {"hospitalName": 1}))
        per_status = defaultdict(Counter)
        for a in in_period:
            per_status[a.get("hospitalName")][a.get("status") or "pending"] += 1
        hospital_revenue = Counter()
        for h, d, amt in money:
            if in_range(d, start, end):
                hospital_revenue[h] += amt

        by_hospital = [{
            "hospital": h,
            "departments": departments[h],
            "doctors": doctors[h],
            "pendingDoctors": pending[h],
            "patients": patients[h],
            "appointments": sum(per_status[h].values()),
            **{s: per_status[h][s] for s in STATUSES},
            "revenue": round(hospital_revenue[h], 2),
        } for h in names]

        status_split = Counter(a.get("status") or "pending" for a in in_period)
        dept_split = Counter(a.get("department") or "Other" for a in in_period)

        return {
            "status": "success",
            "period": period,
            "periodLabel": PERIOD_LABELS[period],
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "hospital": hospital,
            "hospitals": hospitals,
            "cards": {
                "hospitals": len(names),
                "departments": sum(departments.values()),
                "doctors": sum(doctors.values()),
                "pendingDoctors": sum(pending.values()),
                "patients": sum(patients.values()),
                "suppliers": users_collection.count_documents({"userType": "Supplier"}),
                "appointments": len(in_period),
                "appointmentsChange": pct_change(len(in_period), prev_count) if prev else None,
                "completed": status_split["completed"],
                "pendingAppointments": status_split["pending"],
                "revenue": round(revenue, 2),
                "revenueChange": pct_change(revenue, prev_revenue) if prev else None,
            },
            "timeline": timeline,
            "revenueTimeline": [{**r, "amount": round(r["amount"], 2)} for r in revenue_timeline],
            "byHospital": by_hospital,
            "byStatus": [{"status": s, "count": status_split[s]} for s in STATUSES if status_split[s]],
            "byDepartment": [{"department": d, "count": c} for d, c in dept_split.most_common(8)],
        }
