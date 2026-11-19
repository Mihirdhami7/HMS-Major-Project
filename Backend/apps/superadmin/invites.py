"""
Account invitations: accounts created by someone else have no password — hospital admins and
suppliers (created by the super admin) and patients (registered at a hospital's reception).
The person gets an email link to set their own password, then logs in normally.

    create_invite(user_id)            -> link (the token is stored only as a SHA-256 hash, 3 days)
    send_invite_email(user, link)     -> True / False (False when the mailbox is not configured)

Public endpoints (no login):
    GET  /api/accounts/set-password/?token=...      -> who the link is for (name, email, role)
    POST /api/accounts/set-password/  {token, password}
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta

import bcrypt
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.db import users_collection
from backend.platform_settings import mail_configured

logger = logging.getLogger(__name__)
INVITE_DAYS = 3
ROLE_LABEL = {"Admin": "hospital admin", "Supplier": "supplier", "Patient": "patient"}


def _hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_invite(user_id):
    token = secrets.token_urlsafe(32)
    users_collection.update_one({"_id": user_id}, {"$set": {
        "inviteTokenHash": _hash(token),
        "inviteExpiresAt": datetime.utcnow() + timedelta(days=INVITE_DAYS),
        "invitedAt": datetime.utcnow(),
    }})
    return f"{settings.FRONTEND_URL}/set-password?token={token}"


def send_invite_email(user, link):
    if not mail_configured():
        return False
    name = user.get("name") or user["email"].split("@", 1)[0]
    role = ROLE_LABEL.get(user.get("userType"), "user")
    where = f" for {user['hospitalName']}" if user.get("hospitalName") else (
        f" for {user['companyName']}" if user.get("companyName") else "")
    text = (f"Hello {name},\n\nYou have been added to EasyTreat as {role}{where}.\n"
            f"Set your password here (valid {INVITE_DAYS} days):\n{link}\n\n"
            "After that, log in with your email and the new password.")
    html = (f"<p>Hello {name},</p><p>You have been added to <b>EasyTreat</b> as {role}{where}.</p>"
            f"<p><a href=\"{link}\" style=\"background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;"
            f"text-decoration:none\">Set your password</a></p>"
            f"<p>The link is valid for {INVITE_DAYS} days. After that, log in with your email and the new password.</p>")
    try:
        msg = EmailMultiAlternatives("EasyTreat - set your password", text, settings.DEFAULT_FROM_EMAIL, [user["email"]])
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception as exc:  # the link is still shown to the super admin to share by hand
        logger.warning("Invite email to %s failed: %s", user.get("email"), exc)
        return False


def invite_user(user):
    """Create the link, email it, and return {inviteLink, emailSent}."""
    link = create_invite(user["_id"])
    return {"inviteLink": link, "emailSent": send_invite_email(user, link)}


def _user_for_token(token):
    if not token:
        return None
    return users_collection.find_one({"inviteTokenHash": _hash(token), "inviteExpiresAt": {"$gt": datetime.utcnow()}})


class SetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        user = _user_for_token(request.query_params.get("token"))
        if not user:
            return Response({"status": "error", "message": "This link is invalid or has expired. Ask the super admin for a new one."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "success", "name": user.get("name"), "email": user.get("email"),
                         "role": ROLE_LABEL.get(user.get("userType"), "user"),
                         "hospitalName": user.get("hospitalName"), "companyName": user.get("companyName")})

    def post(self, request):
        user = _user_for_token(request.data.get("token"))
        if not user:
            return Response({"status": "error", "message": "This link is invalid or has expired. Ask the super admin for a new one."},
                            status=status.HTTP_400_BAD_REQUEST)
        password = str(request.data.get("password") or "")
        if len(password) < 6 or password.isdigit():
            return Response({"status": "error", "message": "Use at least 6 characters, not only numbers."},
                            status=status.HTTP_400_BAD_REQUEST)
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        users_collection.update_one({"_id": user["_id"]}, {
            "$set": {"hpassword": hashed, "is_active": True, "updated_at": datetime.utcnow(),
                     "passwordSetAt": datetime.utcnow()},
            "$unset": {"inviteTokenHash": "", "inviteExpiresAt": ""},
        })
        return Response({"status": "success", "message": "Password set. You can log in now.",
                         "email": user.get("email"), "userType": user.get("userType"),
                         "hospitalName": user.get("hospitalName")})
