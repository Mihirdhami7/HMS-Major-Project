"""
Platform settings, editable by the super admin (Settings page) instead of hard-coded values.

Stored in one MongoDB document: platform_settings {_id: "global"}. The values come only from
the database (the .env values were copied in on 2026-11-19); the old .env fallback is kept below
as comments until the site is fully tested.

    booking_fee()                -> int   appointment booking fee (INR)
    razorpay_keys()              -> (key_id, key_secret)
    mail_config()                -> (address, app_password, "Name <address>")  system mailbox for all emails
    notification_enabled(type)   -> bool  in-app notifications per type
    email_enabled(kind)          -> bool  optional emails (security emails are always sent)
"""
import time
from datetime import datetime

from django.conf import settings as dj

from backend.db import db

settings_collection = db["platform_settings"]
_DOC_ID = "global"
_CACHE_SECONDS = 15
_cache = {"at": 0.0, "doc": None}

# in-app notification types (NotificationDocument.type) the super admin can switch off
NOTIFICATION_TYPES = {
    "appointment": "Appointments (booked, approved, rejected, completed)",
    "payment": "Payments (booking fees, medicine bills)",
    "prescription": "Prescriptions written",
    "order": "Stock orders (new, fulfilled, declined, paid)",
    "medicine_request": "Doctors' medicine requests",
    "general": "General (role changes and other updates)",
}
# optional emails; sign-up codes, password reset and account invitations are always sent
EMAIL_TYPES = {
    "prescription_pdf": "Prescription PDF emailed to the patient",
}


def _env_from_name():
    """Sender name from DEFAULT_FROM_EMAIL ("EasyTreat Hospital <x@y>") or a default."""
    raw = getattr(dj, "DEFAULT_FROM_EMAIL", "") or ""
    return raw.split("<", 1)[0].strip().strip('"') if "<" in raw else "EasyTreat Hospital"


def _defaults():
    # Old .env fallback (kept until the site is fully tested, then remove):
    # "emailAddress": getattr(dj, "EMAIL_HOST_USER", "") or "",
    # "emailAppPassword": getattr(dj, "EMAIL_HOST_PASSWORD", "") or "",
    # "emailFromName": _env_from_name() or "EasyTreat Hospital",
    # "bookingFee": int(getattr(dj, "APPOINTMENT_BOOKING_FEE", 100) or 100),
    # "razorpayKeyId": getattr(dj, "RAZORPAY_KEY_ID", "") or "",
    # "razorpayKeySecret": getattr(dj, "RAZORPAY_KEY_SECRET", "") or "",
    return {
        "emailAddress": "",          # set on the Settings page
        "emailAppPassword": "",
        "emailFromName": "EasyTreat Hospital",
        "bookingFee": 100,
        "razorpayKeyId": "",
        "razorpayKeySecret": "",
        "notifications": {k: True for k in NOTIFICATION_TYPES},
        "emails": {k: True for k in EMAIL_TYPES},
    }


def get_settings(fresh=False):
    """Stored values merged over the defaults (cached for a few seconds)."""
    now = time.time()
    if not fresh and _cache["doc"] is not None and now - _cache["at"] < _CACHE_SECONDS:
        return _cache["doc"]
    stored = settings_collection.find_one({"_id": _DOC_ID}) or {}
    merged = _defaults()
    for key in ("bookingFee", "razorpayKeyId", "razorpayKeySecret", "emailAddress", "emailAppPassword",
                "emailFromName", "updatedAt", "updatedBy"):
        if stored.get(key) not in (None, ""):
            merged[key] = stored[key]
    for group in ("notifications", "emails"):
        merged[group].update({k: bool(v) for k, v in (stored.get(group) or {}).items() if k in merged[group]})
    _cache.update(at=now, doc=merged)
    return merged


def update_settings(changes, user_email=None):
    """Save the given fields (already validated by the caller) and clear the cache."""
    changes = dict(changes)
    changes["updatedAt"] = datetime.utcnow()
    changes["updatedBy"] = user_email
    settings_collection.update_one({"_id": _DOC_ID}, {"$set": changes}, upsert=True)
    _cache["doc"] = None
    return get_settings(fresh=True)


def booking_fee():
    return int(get_settings()["bookingFee"])


def razorpay_keys():
    s = get_settings()
    return s["razorpayKeyId"], s["razorpayKeySecret"]


def mail_config():
    """(address, app_password, from_header) of the system mailbox used for every email."""
    s = get_settings()
    address, password = s["emailAddress"], s["emailAppPassword"]
    name = (s.get("emailFromName") or "").strip()
    return address, password, (f"{name} <{address}>" if name and address else address)


def mail_configured():
    address, password, _ = mail_config()
    return bool(address and password)


def notification_enabled(notification_type):
    return get_settings()["notifications"].get(notification_type or "general", True)


def email_enabled(kind):
    return get_settings()["emails"].get(kind, True)
