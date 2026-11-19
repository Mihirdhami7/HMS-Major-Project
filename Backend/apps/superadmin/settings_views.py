"""
Platform settings for the super admin (no more hard-coded fee / payment keys).

    GET  /api/superadmin/settings/               current settings (Razorpay secret is masked)
    PUT  /api/superadmin/settings/               {bookingFee?, razorpayKeyId?, razorpayKeySecret?, emailAddress?,
                                                  emailAppPassword?, emailFromName?, notifications?, emails?}
    POST /api/superadmin/settings/test-razorpay/ {razorpayKeyId?, razorpayKeySecret?} -> checks the keys with Razorpay
    GET  /api/superadmin/public-settings/        (no login) values the patient / reception pages need
"""
import logging
import re

import razorpay
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import JWTAuthentication
from apps.accounts.permissions import IsSuperAdmin
from backend.platform_settings import EMAIL_TYPES, NOTIFICATION_TYPES, get_settings, update_settings

logger = logging.getLogger(__name__)
KEY_ID_RE = re.compile(r"^rzp_(test|live)_[A-Za-z0-9]{6,}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_FEE = 100000


def _mask(secret):
    return f"{'•' * 8}{secret[-4:]}" if secret else ""


def _mode(key_id):
    if key_id.startswith("rzp_live_"):
        return "live"
    if key_id.startswith("rzp_test_"):
        return "test"
    return "not set"


def _public(s):
    return {
        "bookingFee": s["bookingFee"],
        "razorpayKeyId": s["razorpayKeyId"],
        "razorpaySecretMasked": _mask(s["razorpayKeySecret"]),
        "razorpaySecretSet": bool(s["razorpayKeySecret"]),
        "razorpayMode": _mode(s["razorpayKeyId"]),
        "notifications": [{"key": k, "label": label, "enabled": s["notifications"].get(k, True)}
                          for k, label in NOTIFICATION_TYPES.items()],
        "emails": [{"key": k, "label": label, "enabled": s["emails"].get(k, True)} for k, label in EMAIL_TYPES.items()],
        "emailAddress": s["emailAddress"],
        "emailFromName": s["emailFromName"],
        "emailPasswordMasked": _mask(s["emailAppPassword"]),
        "emailPasswordSet": bool(s["emailAppPassword"]),
        "mailbox": {"configured": bool(s["emailAddress"] and s["emailAppPassword"]), "address": s["emailAddress"]},
        "updatedAt": s.get("updatedAt").isoformat() + "Z" if s.get("updatedAt") else None,
        "updatedBy": s.get("updatedBy"),
    }


class SettingsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        return Response({"status": "success", "settings": _public(get_settings(fresh=True))})

    def put(self, request):
        data, changes = request.data, {}
        if "bookingFee" in data:
            try:
                fee = int(str(data.get("bookingFee")).strip())
            except (TypeError, ValueError):
                return Response({"status": "error", "message": "Booking fee must be a whole number."}, status=400)
            if fee < 1 or fee > MAX_FEE:
                return Response({"status": "error", "message": f"Booking fee must be between ₹1 and ₹{MAX_FEE:,}."}, status=400)
            changes["bookingFee"] = fee
        if "razorpayKeyId" in data:
            key_id = str(data.get("razorpayKeyId") or "").strip()
            if key_id and not KEY_ID_RE.match(key_id):
                return Response({"status": "error", "message": "Razorpay Key ID looks wrong (it starts with rzp_test_ or rzp_live_)."}, status=400)
            changes["razorpayKeyId"] = key_id
        secret = str(data.get("razorpayKeySecret") or "").strip()
        if secret:  # empty = keep the saved secret
            if len(secret) < 10:
                return Response({"status": "error", "message": "Razorpay Key Secret looks too short."}, status=400)
            changes["razorpayKeySecret"] = secret
        if "emailAddress" in data:
            address = str(data.get("emailAddress") or "").strip().lower()
            if not EMAIL_RE.match(address):
                return Response({"status": "error", "message": "Enter a valid email address for the system mailbox."}, status=400)
            changes["emailAddress"] = address
        if "emailFromName" in data:
            name = str(data.get("emailFromName") or "").strip()
            if not name or len(name) > 60 or any(ch in name for ch in '<>"\n'):
                return Response({"status": "error", "message": "Sender name is required (max 60 characters, no < > or quotes)."}, status=400)
            changes["emailFromName"] = name
        app_password = "".join(str(data.get("emailAppPassword") or "").split())  # Gmail shows it with spaces
        if app_password:  # empty = keep the saved password
            if len(app_password) < 8:
                return Response({"status": "error", "message": "The App Password looks too short (Gmail gives 16 letters)."}, status=400)
            changes["emailAppPassword"] = app_password
        current = get_settings(fresh=True)
        for group, allowed in (("notifications", NOTIFICATION_TYPES), ("emails", EMAIL_TYPES)):
            if isinstance(data.get(group), dict):
                merged = dict(current[group])
                merged.update({k: bool(v) for k, v in data[group].items() if k in allowed})
                changes[group] = merged
        if not changes:
            return Response({"status": "error", "message": "Nothing to save."}, status=400)
        saved = update_settings(changes, getattr(request.user, "email", None))
        return Response({"status": "success", "message": "Settings saved.", "settings": _public(saved)})


class TestRazorpayView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        s = get_settings(fresh=True)
        key_id = str(request.data.get("razorpayKeyId") or s["razorpayKeyId"]).strip()
        secret = str(request.data.get("razorpayKeySecret") or s["razorpayKeySecret"]).strip()
        if not key_id or not secret:
            return Response({"status": "error", "message": "Enter the Key ID and Key Secret first."}, status=400)
        try:
            razorpay.Client(auth=(key_id, secret)).order.all({"count": 1})
        except Exception as exc:  # wrong keys -> Razorpay answers 401
            logger.info("Razorpay key test failed: %s", exc)
            return Response({"status": "error", "message": "Razorpay rejected these keys. Check the Key ID and Secret."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "success", "message": f"Keys work ({_mode(key_id)} mode)."})


class PublicSettingsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        s = get_settings()
        return Response({"status": "success", "bookingFee": s["bookingFee"],
                         "onlinePayments": bool(s["razorpayKeyId"] and s["razorpayKeySecret"])})
