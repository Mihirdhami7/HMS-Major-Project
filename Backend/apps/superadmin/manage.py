"""
Super admin management: hospitals, hospital admins and suppliers.

    GET    /api/superadmin/hospitals/                    hospitals with departments, admins and numbers
    POST   /api/superadmin/hospitals/                    {name, description, address, contactNo}
    PATCH  /api/superadmin/hospitals/<id>/               edit details (rename only while it has no data)
    DELETE /api/superadmin/hospitals/<id>/               only while it has no data

    POST   /api/superadmin/admins/                       {name, email, contactNo, hospitalName} -> invite link
    PATCH  /api/superadmin/admins/<id>/                  {hospitalName?, name?, contactNo?, active?}
    POST   /api/superadmin/admins/<id>/invite/           new "set your password" link

    GET    /api/superadmin/suppliers/?period=...         suppliers with products, orders, payments + charts
    POST   /api/superadmin/suppliers/                    {name, email, contactNo, companyName} -> invite link
    PATCH  /api/superadmin/suppliers/<id>/               {name?, contactNo?, active?}
    DELETE /api/superadmin/suppliers/<id>/               only without products / orders
    POST   /api/superadmin/suppliers/<id>/invite/
"""
import logging
import re
from collections import Counter, defaultdict
from datetime import date, datetime

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.accounts.permissions import IsSuperAdmin
from apps.orders.purchase_orders import order_items, order_number, order_totals
from backend.db import (
    appointments_collection, departments_collection, hospitals_collection, orders_collection, products_collection,
    sessions_collection, staff_collection, users_collection,
)
from .invites import invite_user
from .periods import PERIODS, PERIOD_LABELS, bucket_index, buckets, day_of, in_range, period_range
from .views import booking_fees, pharmacy_bills

logger = logging.getLogger(__name__)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ORDER_STATUSES = ("requested", "processing", "completed", "cancelled")


def _err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"status": "error", "message": message}, status=code)


def _oid(value):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None


def _iso(value):
    return value.isoformat() + "Z" if isinstance(value, datetime) else value


def _clean_contact(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if digits and len(digits) != 10:
        raise ValueError("Contact number must be 10 digits.")
    return digits


def _account(u):
    """Public view of an admin / supplier account."""
    invite_pending = not u.get("hpassword")
    return {
        "id": str(u["_id"]),
        "name": u.get("name") or "",
        "email": u.get("email"),
        "contactNo": str(u.get("contactNo") or ""),
        "hospitalName": u.get("hospitalName"),
        "companyName": u.get("companyName"),
        "active": bool(u.get("is_active")) and not invite_pending,
        "invitePending": invite_pending,
        "inviteExpired": invite_pending and bool(u.get("inviteExpiresAt")) and u["inviteExpiresAt"] < datetime.utcnow(),
        "createdAt": _iso(u.get("created_at")),
    }


def _new_account(data, user_type, created_by, extra):
    """Validate + insert an account without a password; returns (user, error_message)."""
    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    if not name:
        return None, "Name is required."
    if not EMAIL_RE.match(email):
        return None, "Enter a valid email address."
    if users_collection.find_one({"email": email, "userType": {"$in": ["Admin", "Supplier", "SuperAdmin"]}}):
        return None, "This email already has an admin, supplier or super admin account."
    try:
        contact = _clean_contact(data.get("contactNo"))
    except ValueError as exc:
        return None, str(exc)
    now = datetime.utcnow()
    user = {"email": email, "name": name, "contactNo": contact, "userType": user_type, "is_active": False,
            "created_at": now, "updated_at": now, "createdBy": created_by, **extra}
    user["_id"] = users_collection.insert_one(user).inserted_id
    return user, None


def _set_active(user, active):
    users_collection.update_one({"_id": user["_id"]}, {"$set": {"is_active": bool(active), "updated_at": datetime.utcnow()}})
    if not active:  # log the person out everywhere
        sessions_collection.delete_many({"email": user.get("email"), "userType": user.get("userType")})


# =========================================================================== hospitals

def hospital_has_data(name):
    return any(c.find_one({"hospitalName": name}, {"_id": 1}) for c in (
        users_collection, staff_collection, departments_collection, appointments_collection, products_collection))


class HospitalsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        today = date.today()
        month_start, month_end = period_range("month", today)
        hospitals = list(hospitals_collection.find().sort("name", 1))
        staff = list(staff_collection.find({"role": "Doctor"}, {"hospitalName": 1, "department": 1, "isApproved": 1}))
        doctors = Counter(d.get("hospitalName") for d in staff if d.get("isApproved"))
        pending = Counter(d.get("hospitalName") for d in staff if not d.get("isApproved"))
        dept_doctors = Counter((d.get("hospitalName"), d.get("department")) for d in staff if d.get("isApproved"))
        patients = Counter(u.get("hospitalName") for u in users_collection.find({"userType": "Patient"}, {"hospitalName": 1}))
        admins = defaultdict(list)
        for u in users_collection.find({"userType": "Admin"}).sort("name", 1):
            admins[u.get("hospitalName")].append(_account(u))
        departments = defaultdict(list)
        for d in departments_collection.find().sort("name", 1):
            departments[d.get("hospitalName")].append({
                "id": str(d["_id"]), "name": d.get("name"), "head": d.get("headOfDepartment") or "",
                "doctors": dept_doctors[(d.get("hospitalName"), d.get("name"))],
            })
        appts = list(appointments_collection.find({}, {"hospitalName": 1, "appointmentDate": 1, "acceptedDate": 1,
                                                       "payments": 1, "status": 1}))
        appt_all = Counter(a.get("hospitalName") for a in appts)
        appt_month = Counter(a.get("hospitalName") for a in appts
                             if in_range(day_of(a.get("acceptedDate") or a.get("appointmentDate")), month_start, month_end))
        revenue = Counter()
        for h, _d, amt, _m in booking_fees(appts) + pharmacy_bills():
            revenue[h] += amt
        products = Counter(p.get("hospitalName") for p in products_collection.find({"is_approved": True}, {"hospitalName": 1}))

        rows = [{
            "id": str(h["_id"]),
            "name": h.get("name"),
            "description": h.get("description") or "",
            "address": h.get("address") or "",
            "contactNo": str(h.get("contactNo") or ""),
            "createdAt": _iso(h.get("createdAt")),
            "departments": departments[h.get("name")],
            "admins": admins[h.get("name")],
            "doctors": doctors[h.get("name")],
            "pendingDoctors": pending[h.get("name")],
            "patients": patients[h.get("name")],
            "products": products[h.get("name")],
            "appointments": appt_all[h.get("name")],
            "appointmentsThisMonth": appt_month[h.get("name")],
            "revenue": round(revenue[h.get("name")], 2),
            "canDelete": not hospital_has_data(h.get("name")),
        } for h in hospitals]
        unassigned = [a for name, lst in admins.items() if name not in {h.get("name") for h in hospitals} for a in lst]
        return Response({"status": "success", "hospitals": rows, "unassignedAdmins": unassigned})

    def post(self, request):
        data = request.data
        name = str(data.get("name") or "").strip()
        if not name:
            return _err("Hospital name is required.")
        if hospitals_collection.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
            return _err("A hospital with this name already exists.")
        try:
            contact = _clean_contact(data.get("contactNo"))
        except ValueError as exc:
            return _err(str(exc))
        now = datetime.utcnow()
        doc = {"name": name, "description": str(data.get("description") or "").strip(),
               "address": str(data.get("address") or "").strip(), "contactNo": contact,
               "adminEmail": "", "adminName": "", "createdAt": now, "updatedAt": now,
               "createdBy": getattr(request.user, "email", None)}
        doc["_id"] = hospitals_collection.insert_one(doc).inserted_id
        return Response({"status": "success", "message": f"{name} added. Now add its hospital admin.",
                         "hospital": {"id": str(doc["_id"]), "name": name}}, status=status.HTTP_201_CREATED)


class HospitalDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request, hospital_id):
        h = hospitals_collection.find_one({"_id": _oid(hospital_id)}) if _oid(hospital_id) else None
        if not h:
            return _err("Hospital not found.", status.HTTP_404_NOT_FOUND)
        changes = {}
        for field in ("description", "address"):
            if field in request.data:
                changes[field] = str(request.data.get(field) or "").strip()
        if "contactNo" in request.data:
            try:
                changes["contactNo"] = _clean_contact(request.data.get("contactNo"))
            except ValueError as exc:
                return _err(str(exc))
        new_name = str(request.data.get("name") or "").strip()
        if new_name and new_name != h.get("name"):
            if hospital_has_data(h.get("name")):
                return _err("This hospital already has staff, patients or data, so its name cannot be changed.")
            if hospitals_collection.find_one({"name": {"$regex": f"^{re.escape(new_name)}$", "$options": "i"}}):
                return _err("A hospital with this name already exists.")
            changes["name"] = new_name
        changes["updatedAt"] = datetime.utcnow()
        hospitals_collection.update_one({"_id": h["_id"]}, {"$set": changes})
        return Response({"status": "success", "message": "Hospital updated."})

    def delete(self, request, hospital_id):
        h = hospitals_collection.find_one({"_id": _oid(hospital_id)}) if _oid(hospital_id) else None
        if not h:
            return _err("Hospital not found.", status.HTTP_404_NOT_FOUND)
        if hospital_has_data(h.get("name")):
            return _err("This hospital has staff, patients or data and cannot be deleted.")
        hospitals_collection.delete_one({"_id": h["_id"]})
        return Response({"status": "success", "message": f"{h.get('name')} deleted."})


# =========================================================================== hospital admins

class AdminsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        hospital = str(request.data.get("hospitalName") or "").strip()
        h = hospitals_collection.find_one({"name": hospital}) if hospital else None
        if not h:
            return _err("Choose the hospital this admin will manage.")
        user, error = _new_account(request.data, "Admin", getattr(request.user, "email", None), {"hospitalName": hospital})
        if error:
            return _err(error)
        if not h.get("adminEmail"):  # first admin becomes the hospital's main contact
            hospitals_collection.update_one({"_id": h["_id"]}, {"$set": {"adminEmail": user["email"], "adminName": user["name"]}})
        result = invite_user(user)
        return Response({"status": "success", "admin": _account(user), **result,
                         "message": f"{user['name']} added as admin of {hospital}. " + (
                             "The set-password link was emailed." if result["emailSent"] else
                             "Email could not be sent — share the link below.")},
                        status=status.HTTP_201_CREATED)


class AdminDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def _get(self, admin_id):
        return users_collection.find_one({"_id": _oid(admin_id), "userType": "Admin"}) if _oid(admin_id) else None

    def patch(self, request, admin_id):
        user = self._get(admin_id)
        if not user:
            return _err("Admin not found.", status.HTTP_404_NOT_FOUND)
        changes = {}
        if "name" in request.data:
            name = str(request.data.get("name") or "").strip()
            if not name:
                return _err("Name is required.")
            changes["name"] = name
        if "contactNo" in request.data:
            try:
                changes["contactNo"] = _clean_contact(request.data.get("contactNo"))
            except ValueError as exc:
                return _err(str(exc))
        new_hospital = str(request.data.get("hospitalName") or "").strip()
        if new_hospital and new_hospital != user.get("hospitalName"):
            target = hospitals_collection.find_one({"name": new_hospital})
            if not target:
                return _err("Hospital not found.")
            changes["hospitalName"] = new_hospital
            # the old hospital loses this admin as its main contact; the new one gets it if it has none
            hospitals_collection.update_many({"adminEmail": user["email"]}, {"$set": {"adminEmail": "", "adminName": ""}})
            if not target.get("adminEmail"):
                hospitals_collection.update_one({"_id": target["_id"]}, {"$set": {
                    "adminEmail": user["email"], "adminName": changes.get("name", user.get("name"))}})
            sessions_collection.delete_many({"email": user["email"], "userType": "Admin"})  # re-login with new hospital
        if changes:
            changes["updated_at"] = datetime.utcnow()
            users_collection.update_one({"_id": user["_id"]}, {"$set": changes})
        if "active" in request.data:
            if request.data.get("active") and not user.get("hpassword"):
                return _err("This admin has not set a password yet. Send the invitation again instead.")
            _set_active(user, request.data.get("active"))
        return Response({"status": "success", "message": "Admin updated.", "admin": _account(self._get(admin_id))})


class AdminInviteView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, admin_id):
        user = users_collection.find_one({"_id": _oid(admin_id), "userType": {"$in": ["Admin", "Supplier"]}}) if _oid(admin_id) else None
        if not user:
            return _err("Account not found.", status.HTTP_404_NOT_FOUND)
        result = invite_user(user)
        return Response({"status": "success", **result, "message": (
            f"New set-password link emailed to {user['email']}." if result["emailSent"]
            else "Email could not be sent — share the link below.")})


# =========================================================================== suppliers

class SuppliersView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        period = request.query_params.get("period", "year")
        if period not in PERIODS:
            return _err(f"period must be one of {', '.join(PERIODS)}")
        orders = list(orders_collection.find())
        first = min((day_of(o.get("order_date") or o.get("created_at")) for o in orders
                     if day_of(o.get("order_date") or o.get("created_at"))), default=None)
        start, end = period_range(period, first_date=date.fromisoformat(first) if first else None)

        products = list(products_collection.find({}, {"supplier_company": 1, "hospitalName": 1, "is_approved": 1, "stock": 1}))
        accounts = {u.get("companyName"): u for u in users_collection.find({"userType": "Supplier"})}
        companies = sorted({*accounts, *(p.get("supplier_company") for p in products), *(o.get("supplier_company") for o in orders)} - {None, ""})

        stats = {c: {"products": 0, "approved": 0, "hospitals": set(), "orders": Counter(), "paid": 0.0, "open": 0.0,
                     "lastOrder": None} for c in companies}
        for p in products:
            s = stats.get(p.get("supplier_company"))
            if s:
                s["products"] += 1
                s["approved"] += 1 if p.get("is_approved") else 0
                s["hospitals"].add(p.get("hospitalName"))
        bl = buckets(period, start, end)
        find = bucket_index(bl)
        timeline = [{"label": b["label"], **{k: 0 for k in ORDER_STATUSES}, "paid": 0.0} for b in bl]
        by_hospital = Counter()
        recent = []
        for o in orders:
            company, st = o.get("supplier_company"), o.get("status") or "requested"
            totals = order_totals(o)
            day = day_of(o.get("order_date") or o.get("created_at"))
            s = stats.get(company)
            if s:
                s["orders"][st] += 1
                if st == "completed":
                    s["paid"] += totals["amount"]
                elif st in ("requested", "processing"):
                    s["open"] += totals["amount"]
                s["lastOrder"] = max(filter(None, [s["lastOrder"], day]), default=None)
            if in_range(day, start, end):
                i = find(day)
                if i is not None:
                    timeline[i][st] = timeline[i].get(st, 0) + 1
                by_hospital[o.get("hospitalName")] += 1
            paid_day = day_of(o.get("paid_at") or o.get("completed_at"))
            if st == "completed" and in_range(paid_day, start, end):
                i = find(paid_day)
                if i is not None:
                    timeline[i]["paid"] += totals["amount"]
            recent.append({"id": str(o["_id"]), "orderNumber": order_number(o), "supplier": company,
                           "hospital": o.get("hospitalName"), "status": st, "date": day,
                           "items": len(order_items(o)), "amount": totals["amount"]})

        rows = []
        for c in companies:
            s, acc = stats[c], accounts.get(c)
            rows.append({
                "company": c,
                "account": _account(acc) if acc else None,
                "products": s["products"], "approvedProducts": s["approved"],
                "hospitals": sorted(h for h in s["hospitals"] if h),
                "orders": sum(s["orders"].values()),
                **{k: s["orders"][k] for k in ORDER_STATUSES},
                "paid": round(s["paid"], 2), "openValue": round(s["open"], 2),
                "lastOrder": s["lastOrder"],
                "canDelete": bool(acc) and s["products"] == 0 and sum(s["orders"].values()) == 0,
            })
        recent.sort(key=lambda r: r["date"] or "", reverse=True)
        return Response({
            "status": "success", "period": period, "periodLabel": PERIOD_LABELS[period],
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "cards": {
                "suppliers": len(companies),
                "withAccount": sum(1 for r in rows if r["account"]),
                "products": len(products),
                "openOrders": sum(r["requested"] + r["processing"] for r in rows),
                "awaitingPayment": round(sum(order_totals(o)["amount"] for o in orders if o.get("status") == "processing"), 2),
                "paid": round(sum(r["paid"] for r in rows), 2),
            },
            "suppliers": rows,
            "timeline": [{**t, "paid": round(t["paid"], 2)} for t in timeline],
            "byHospital": [{"hospital": h, "orders": n} for h, n in by_hospital.most_common()],
            "recentOrders": recent[:25],
        })

    def post(self, request):
        company = str(request.data.get("companyName") or "").strip()
        if not company:
            return _err("Company name is required.")
        if users_collection.find_one({"userType": "Supplier",
                                      "companyName": {"$regex": f"^{re.escape(company)}$", "$options": "i"}}):
            return _err("A supplier account for this company already exists.")
        user, error = _new_account(request.data, "Supplier", getattr(request.user, "email", None),
                                   {"companyName": company, "hospitalNames": []})
        if error:
            return _err(error)
        result = invite_user(user)
        return Response({"status": "success", "supplier": _account(user), **result,
                         "message": f"{company} added. " + ("The set-password link was emailed." if result["emailSent"]
                                                            else "Email could not be sent — share the link below.")},
                        status=status.HTTP_201_CREATED)


class SupplierDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def _get(self, supplier_id):
        return users_collection.find_one({"_id": _oid(supplier_id), "userType": "Supplier"}) if _oid(supplier_id) else None

    def patch(self, request, supplier_id):
        user = self._get(supplier_id)
        if not user:
            return _err("Supplier not found.", status.HTTP_404_NOT_FOUND)
        changes = {}
        if "name" in request.data:
            if not str(request.data.get("name") or "").strip():
                return _err("Name is required.")
            changes["name"] = str(request.data["name"]).strip()
        if "contactNo" in request.data:
            try:
                changes["contactNo"] = _clean_contact(request.data.get("contactNo"))
            except ValueError as exc:
                return _err(str(exc))
        if changes:
            changes["updated_at"] = datetime.utcnow()
            users_collection.update_one({"_id": user["_id"]}, {"$set": changes})
        if "active" in request.data:
            if request.data.get("active") and not user.get("hpassword"):
                return _err("This supplier has not set a password yet. Send the invitation again instead.")
            _set_active(user, request.data.get("active"))
        return Response({"status": "success", "message": "Supplier updated.", "supplier": _account(self._get(supplier_id))})

    def delete(self, request, supplier_id):
        user = self._get(supplier_id)
        if not user:
            return _err("Supplier not found.", status.HTTP_404_NOT_FOUND)
        company = user.get("companyName")
        if products_collection.find_one({"supplier_company": company}) or orders_collection.find_one({"supplier_company": company}):
            return _err("This supplier has products or orders. Deactivate it instead, so the history stays.")
        _set_active(user, False)
        users_collection.delete_one({"_id": user["_id"]})
        return Response({"status": "success", "message": f"{company} removed."})
