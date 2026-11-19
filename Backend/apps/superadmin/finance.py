"""
Finance across all hospitals.

    GET /api/superadmin/finance/?period=week|month|quarter|year|all&hospital=<name>

Money in : booking fees (online / cash) and pharmacy bills (online / cash)
Money out: stock purchases paid to suppliers (completed purchase orders)
"""
import logging
from collections import defaultdict
from datetime import date

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.accounts.permissions import IsSuperAdmin
from apps.orders.purchase_orders import order_number, order_totals
from backend.db import appointments_collection, hospitals_collection, invoices_collection, orders_collection
from .periods import (
    PERIOD_LABELS, PERIODS, bucket_index, buckets, day_of, in_range, pct_change, period_range, previous_range,
)
from .views import PAID

logger = logging.getLogger(__name__)


def transactions(hospital=None):
    """Every money movement: {date, hospital, kind, method, amount, party, reference}."""
    hq = {"hospitalName": hospital} if hospital else {}
    out = []
    for a in appointments_collection.find(hq, {"hospitalName": 1, "patient": 1, "payments": 1, "appointmentDate": 1,
                                               "acceptedDate": 1}):
        for p in a.get("payments") or []:
            if str(p.get("status", "")).lower() in PAID:
                out.append({"date": day_of(p.get("paymentDate")) or day_of(a.get("acceptedDate") or a.get("appointmentDate")),
                            "hospital": a.get("hospitalName"), "kind": "booking",
                            "method": "cash" if str(p.get("method") or "").lower() == "cash" else "online",
                            "amount": float(p.get("amount") or 0), "party": (a.get("patient") or {}).get("name"),
                            "reference": p.get("paymentId")})
    for inv in invoices_collection.find(hq):
        if str(inv.get("status") or "paid").lower() not in PAID:
            continue
        method = inv.get("paymentMethod") or ("online" if inv.get("paymentId") else "cash")
        out.append({"date": day_of(inv.get("createdAt") or inv.get("created_at")), "hospital": inv.get("hospitalName"),
                    "kind": "pharmacy", "method": "cash" if str(method).lower() == "cash" else "online",
                    "amount": float(inv.get("totalAmount") or 0),
                    "party": (inv.get("patient") or {}).get("name") or inv.get("patientName"),
                    "reference": inv.get("invoiceId") or str(inv["_id"])})
    for o in orders_collection.find({**hq, "status": "completed"}):
        out.append({"date": day_of(o.get("paid_at") or o.get("completed_at") or o.get("updated_at")),
                    "hospital": o.get("hospitalName"), "kind": "purchase", "method": "online",
                    "amount": float(o.get("paid_amount") or order_totals(o)["amount"]),
                    "party": o.get("supplier_company"), "reference": order_number(o)})
    return out


def _sum(rows, **match):
    return round(sum(r["amount"] for r in rows if all(r.get(k) == v for k, v in match.items())), 2)


class FinanceView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        period = request.query_params.get("period", "month")
        if period not in PERIODS:
            return Response({"status": "error", "message": f"period must be one of {', '.join(PERIODS)}"},
                            status=status.HTTP_400_BAD_REQUEST)
        hospital = (request.query_params.get("hospital") or "").strip() or None
        try:
            return Response(self.build(period, hospital))
        except Exception as exc:
            logger.error("superadmin finance: %s", exc, exc_info=True)
            return Response({"status": "error", "message": "Could not load finance data."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @staticmethod
    def build(period, hospital):
        rows = [r for r in transactions(hospital) if r["date"]]
        first = min((r["date"] for r in rows), default=None)
        start, end = period_range(period, first_date=date.fromisoformat(first) if first else None)
        prev = previous_range(period, start, end)
        cur = [r for r in rows if in_range(r["date"], start, end)]
        before = [r for r in rows if prev and in_range(r["date"], *prev)]

        def income(rs):
            return _sum(rs, kind="booking") + _sum(rs, kind="pharmacy")

        bl = buckets(period, start, end)
        find = bucket_index(bl)
        timeline = [{"label": b["label"], "booking": 0.0, "pharmacy": 0.0, "purchase": 0.0} for b in bl]
        for r in cur:
            i = find(r["date"])
            if i is not None:
                timeline[i][r["kind"]] += r["amount"]

        names = [hospital] if hospital else [h["name"] for h in hospitals_collection.find({}, {"name": 1}).sort("name", 1)]
        per = defaultdict(lambda: defaultdict(float))
        for r in cur:
            per[r["hospital"]][f"{r['kind']}_{r['method']}"] += r["amount"]
        by_hospital = []
        for h in names:
            p = per[h]
            booking = p["booking_online"] + p["booking_cash"]
            pharmacy = p["pharmacy_online"] + p["pharmacy_cash"]
            purchase = p["purchase_online"] + p["purchase_cash"]
            by_hospital.append({
                "hospital": h,
                "bookingOnline": round(p["booking_online"], 2), "bookingCash": round(p["booking_cash"], 2),
                "pharmacyOnline": round(p["pharmacy_online"], 2), "pharmacyCash": round(p["pharmacy_cash"], 2),
                "income": round(booking + pharmacy, 2), "purchases": round(purchase, 2),
                "net": round(booking + pharmacy - purchase, 2),
            })

        cur_income, prev_income = income(cur), income(before)
        return {
            "status": "success",
            "period": period, "periodLabel": PERIOD_LABELS[period],
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "hospital": hospital,
            "hospitals": [h["name"] for h in hospitals_collection.find({}, {"name": 1}).sort("name", 1)],
            "cards": {
                "income": cur_income,
                "incomeChange": pct_change(cur_income, prev_income) if prev else None,
                "booking": _sum(cur, kind="booking"),
                "bookingOnline": _sum(cur, kind="booking", method="online"),
                "bookingCash": _sum(cur, kind="booking", method="cash"),
                "pharmacy": _sum(cur, kind="pharmacy"),
                "pharmacyOnline": _sum(cur, kind="pharmacy", method="online"),
                "pharmacyCash": _sum(cur, kind="pharmacy", method="cash"),
                "purchases": _sum(cur, kind="purchase"),
                "net": round(cur_income - _sum(cur, kind="purchase"), 2),
                "online": _sum([r for r in cur if r["kind"] != "purchase"], method="online"),
                "cash": _sum([r for r in cur if r["kind"] != "purchase"], method="cash"),
                "transactions": len(cur),
            },
            "timeline": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in t.items()} for t in timeline],
            "byHospital": by_hospital,
            "transactions": sorted(cur, key=lambda r: r["date"], reverse=True)[:60],
        }
