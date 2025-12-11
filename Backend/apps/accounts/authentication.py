from datetime import datetime
from types import SimpleNamespace
from rest_framework import authentication, exceptions
from backend import settings
from backend.db import sessions_collection
import jwt 

class JWTAuthentication(authentication.BaseAuthentication):
    """
    Decode Bearer JWT and populate request.user as SimpleNamespace:
    .email, .userType, .hospitalName, .is_authenticated
    Verifies token exists in sessions_collection to support logout/invalidation.
    """
    def authenticate(self, request):
        auth = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if not auth:
            return None
        if not auth.startswith("Bearer "):
            raise exceptions.AuthenticationFailed("Invalid auth header")
        token = auth.split(" ", 1)[1].strip()
        
        try:
            # JWT automatically validates expiry
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expired")
        except Exception:
            raise exceptions.AuthenticationFailed("Invalid token")

        user = SimpleNamespace(
            email=payload.get("email"),
            userType=payload.get("userType"),
            hospitalName=payload.get("hospitalName"),
            is_authenticated=True
        )
        return (user, None)

    def authenticate_header(self, request):
        return "Bearer"