from datetime import datetime, timedelta
from types import SimpleNamespace

import bcrypt
import jwt

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives

from rest_framework import generics, status, exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle

from backend.db import (
    client,
    users_collection, staff_collection, otp_collection, sessions_collection,
    generate_otp, clear_expired_otps
)
from backend import settings
from .serializers import (
    RegisterSerializer, VerifyEmailSerializer, LoginSerializer, LogoutSerializer, UserProfileSerializer
)
from .permissions import IsSameUser, IsSuperAdminOrIsSameHospitalAdmin
from .models import UserDocument, OTPDocument
from .authentication import JWTAuthentication


class RegisterUserAPIView(generics.CreateAPIView):
    """
    User registration endpoint
    POST /api/accounts/register/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = RegisterSerializer
    parser_classes = [MultiPartParser, FormParser]
            
    def create(self, request, *args, **kwargs):
        """Handle user registration with validation"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        email = data.get("email")
        userType = data.get("userType", "Patient")

        # Check if user already exists
        if users_collection.find_one({"email": email}):
            return Response({
                "status": "error",
                "errors": {"email": ["User with this email already exists"]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create base user data
            base_user = UserDocument.create_base_user(
                email=email,
                name=data.get("name"),
                password=data.get("password"),
                contactNo=data.get("contactNo"),
                userType=userType,
                gender=data.get("gender"),
                dateOfBirth=data.get("dateOfBirth"),
                photo=request.FILES.get('photo'),
                is_active=False
            )

            # Create user document based on type
            if userType == "Doctor":
                user_document = UserDocument.create_doctor(
                    base_data=base_user,
                    hospitalName=data.get("hospitalName"),
                    doctorQualification=data.get("doctorQualification"),
                    doctorSpecialization=data.get("doctorSpecialization"),
                    certificate=request.FILES.get('doctorCertificate')
                )
            elif userType == "Supplier":
                user_document = UserDocument.create_supplier(
                    base_data=base_user,
                    companyName=data.get("companyName"),
                    companyStartingDate=data.get("companyStartingDate"),
                    license_file=request.FILES.get('companyLicense')
                )
            elif userType == "Patient":
                user_document = UserDocument.create_patient(
                    base_user,
                    hospitalName=data.get("hospitalName")
                )
            elif userType == "Admin":
                user_document = UserDocument.create_admin(
                    base_user,
                    hospitalName=data.get("hospitalName")
                )
            else:
                return Response({
                    "status": "error",
                    "message": "Invalid user type"
                }, status=status.HTTP_400_BAD_REQUEST)

            otp_code = generate_otp()
            otp_document = OTPDocument.create(email=email, otp=otp_code, expiry_minutes=2)
            inserted_user_id = None

            # Use Mongo transaction when available; fallback to normal writes otherwise.
            try:
                with client.start_session() as mongo_session:
                    with mongo_session.start_transaction():
                        user_insert = users_collection.insert_one(user_document, session=mongo_session)
                        otp_collection.insert_one(otp_document, session=mongo_session)
                        inserted_user_id = user_insert.inserted_id
            except Exception:
                user_insert = users_collection.insert_one(user_document)
                otp_collection.insert_one(otp_document)
                inserted_user_id = user_insert.inserted_id

            # Verify insertion
            result = users_collection.find_one({"_id": inserted_user_id})
            if not result:
                raise exceptions.APIException("Failed to create user")

            try:
                self._send_otp_email(email, otp_code, data.get("name"))
            except Exception as e:
                # Rollback user creation if email fails
                users_collection.delete_one({"_id": inserted_user_id})
                otp_collection.delete_many({"email": email})
                return Response({
                    "status": "error",
                    "message": f"Failed to send verification email: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Prepare response (remove sensitive data)
            result.pop("hpassword", None)
            result.pop("password", None)
            result["_id"] = str(result["_id"])
            
            # Use serializer's to_representation to filter fields
            response_serializer = self.get_serializer(result)
            
            return Response({
                "status": "success",
                "message": "Registration successful. Please verify your email with the OTP sent.",
                "user": response_serializer.data
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _send_otp_email(self, email: str, otp: str, name: str = None):
        """Send OTP verification email"""
        if not settings.EMAIL_HOST_USER:
            raise Exception("EMAIL_HOST_USER not configured")
        
        display = name or email.split("@", 1)[0]
        text = f"Hello {display},\nYour OTP for HMS registration is: {otp}\n\nThis OTP will expire in 2 minutes."
        html = f"<p>Hello {display},</p><p>Your OTP for HMS registration is: <strong>{otp}</strong></p><p>This OTP will expire in 2 minutes.</p>"
        
        msg = EmailMultiAlternatives(
            subject="HMS - Email Verification OTP",
            body=text,
            from_email=settings.EMAIL_HOST_USER,
            to=[email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)













class VerifyEmailAPIView(generics.GenericAPIView):
    """
    Email verification endpoint
    POST /api/accounts/verify-email/
    """
    serializer_class = VerifyEmailSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data.get("email")
        otp = serializer.validated_data.get("otp")
        
        try:
            clear_expired_otps()
            otp_record = otp_collection.find_one({
                "email": email,
                "otp": otp,
                "verified": False
            })
            
            if not otp_record:
                return Response({
                    "status": "error",
                    "message": "Invalid OTP"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if datetime.utcnow() > otp_record["expires_at"]:
                otp_collection.delete_one({"_id": otp_record["_id"]})
                return Response({
                    "status": "error",
                    "message": "OTP has expired. Please request a new one"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Activate user account
            result = users_collection.update_one(
                {"email": email},
                {"$set": {
                    "is_active": True,
                    "activated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
            
            if result.modified_count == 0:
                return Response({
                    "status": "error",
                    "message": "User not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Delete used OTP
            otp_collection.delete_one({"_id": otp_record["_id"]})
            
            return Response({
                "status": "success",
                "message": "Email verified successfully. You can now login."
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)








class LoginAPIView(generics.CreateAPIView):
    """
    User login endpoint
    POST /api/accounts/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = LoginSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data.get("email")
        password = serializer.validated_data.get("password")
        category = serializer.validated_data.get("category")
        hospital_name = serializer.validated_data.get("hospitalName", "")
        
        try:
            # Lookup user similar to prior logic
            user = None
            if email == "21it402@bvmengineering.ac.in":
                user = users_collection.find_one({"email": email})
                if not user:
                    return Response({"status": "error", "message": "Invalid credentials for SuperAdmin"}, status=status.HTTP_401_UNAUTHORIZED)
                category = "superAdmin"  # For token payload
            else:
                if category == "Doctor":
                    staff_user = staff_collection.find_one({"email": email, "userType": "Doctor", "hospitalName": hospital_name})
                    if staff_user:
                        user = users_collection.find_one({"email": email})
                    else:
                        user = users_collection.find_one({"email": email, "userType": "Doctor", "hospitalName": hospital_name})
                elif category == "Supplier":
                    user = users_collection.find_one({"email": email, "userType": "Supplier"})
                else:
                    user = users_collection.find_one({"email": email, "userType": category, "hospitalName": hospital_name})

            if not user:
                return Response({"status": "error", "message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
            if not user.get("is_active", False):
                return Response({"status": "error", "message": "Account not activated"}, status=status.HTTP_403_FORBIDDEN)

            stored = user.get("hpassword", "")
            if not stored or not bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8")):
                return Response({"status": "error", "message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

            exp = datetime.utcnow() + timedelta(hours=4)
            payload = {
                "email": email,
                "userType": user.get("userType"),
                "hospitalName": user.get("hospitalName"),
                "exp": int(exp.timestamp())
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
            token_str = token if isinstance(token, str) else token.decode("utf-8")

            # Store session so we can invalidate on logout
            sessions_collection.insert_one({
                "token": token_str,
                "email": email,
                "userType": user.get("userType"),
                "hospitalName": user.get("hospitalName"),
                "expires_at": datetime.utcnow() + timedelta(hours=4),
                "created_at": datetime.utcnow()
            })

            return Response({
                "status": "success",
                "message": "Login successful",
                "userData": {
                    "userType": user.get("userType"),
                    "email": email,
                    "hospitalName": user.get("hospitalName"),
                    "name": user.get("name"),
                },
                "access": token_str
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LogoutAPIView(generics.CreateAPIView):
    """
    User logout endpoint
    POST /api/accounts/logout/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    serializer_class = LogoutSerializer

    def create(self, request, *args, **kwargs):
        # Read token from header and remove session document
        auth = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        token = None
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1].strip()
        if token:
            sessions_collection.delete_one({"token": token})
        return Response({"status": "success", "message": "Logout successful"}, status=status.HTTP_200_OK)









class GetUserProfileAPIView(generics.RetrieveAPIView):
    """
    Get user profile
    GET /api/accounts/profile/me/
    """
    permission_classes = [IsAuthenticated , IsSameUser]
    serializer_class = UserProfileSerializer
    authentication_classes = [JWTAuthentication]

    def get_object(self):
        userType = getattr(self.request.user, 'userType', None)
        email = getattr(self.request.user, 'email', None)
        
        # # Get authenticated user from JWT token
        # auth_user_email = getattr(self.request.user, 'email', None)
        
        # # Verify that authenticated user matches the requested profile
        # if auth_user_email != email:
        #     raise exceptions.PermissionDenied("You can only access your own profile")
        
        # Fetch user from database
        user_doc = users_collection.find_one({
            "email": email,
            "userType": userType.capitalize()
        })
        
        if not user_doc:
            raise exceptions.NotFound("User not found")
        
        # Convert ObjectId to string and remove sensitive data
        user_doc["_id"] = str(user_doc["_id"])
        user_doc.pop("hpassword", None)
        user_doc.pop("password", None)
        
        return user_doc
    
    def retrieve(self, request, *args, **kwargs):
        """Return all stored data for the user"""
        try:
            instance = self.get_object()
            
            # Return all data from database without filtering
            return Response({
                "status": "success",
                "user": instance
            }, status=status.HTTP_200_OK)
            
        except exceptions.PermissionDenied as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_403_FORBIDDEN)
            
        except exceptions.NotFound as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






class UpdateUserProfileAPIView(generics.UpdateAPIView):
    """
    Update user profile
    PUT/PATCH /api/accounts/profile/me/update/
    """
    serializer_class = UserProfileSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsSameUser]
    authentication_classes = [JWTAuthentication]

    def get_object(self):
        userType = getattr(self.request.user, 'userType', None)
        email = getattr(self.request.user, 'email', None)
        
        # # Get authenticated user email from JWT token
        # auth_user_email = getattr(self.request.user, 'email', None)
        
        # # Verify that authenticated user matches the requested profile
        # if auth_user_email != email:
        #     raise exceptions.PermissionDenied("You can only update your own profile")
        
        # Fetch user from database
        user_doc = users_collection.find_one({
            "email": email,
            "userType": userType.capitalize()
        })
        
        if not user_doc:
            raise exceptions.NotFound("User not found")
        
        return user_doc

    def update(self, request, *args, **kwargs):
        """Handle profile update with validation"""
        partial = kwargs.pop('partial', True)  # Allow partial updates
        instance = self.get_object()
        
        # Create serializer with current instance and update data
        serializer = self.get_serializer(
            instance, 
            data=request.data, 
            partial=partial,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Perform the update
            self.perform_update(serializer)
            
            # Fetch updated user from database
            email = getattr(request.user, 'email', None)
            userType = getattr(request.user, 'userType', None)
            
            updated_user = users_collection.find_one({
                "email": email,
                "userType": userType.capitalize()
            })
            
            if not updated_user:
                raise exceptions.NotFound("User not found after update")
            
            # Remove sensitive data
            updated_user["_id"] = str(updated_user["_id"])
            updated_user.pop("hpassword", None)
            updated_user.pop("password", None)
            
            # Return all updated data
            return Response({
                "status": "success",
                "message": "Profile updated successfully",
                "user": updated_user
            }, status=status.HTTP_200_OK)
            
        except exceptions.PermissionDenied as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_403_FORBIDDEN)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_update(self, serializer):
        """Perform the actual database update"""
        email = getattr(self.request.user, 'email', None)
        userType = getattr(self.request.user, 'userType', None)
        validated_data = serializer.validated_data
        
        # Build update dictionary (exclude read-only fields)
        update_data = {}
        
        # Common updatable fields
        updatable_fields = ['name', 'contactNo', 'gender', 'dateOfBirth', 'hospitalName']
        
        for field in updatable_fields:
            if field in validated_data:
                update_data[field] = validated_data[field]
        
        # Handle password update
        if 'password' in validated_data:
            new_password = validated_data['password']
            hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
            update_data['hpassword'] = hashed.decode("utf-8")
        
        # Handle photo upload
        if 'photo' in self.request.FILES:
            photo = self.request.FILES['photo']
            photo_name = default_storage.save(
                f"profile_photos/{email}/{photo.name}",
                ContentFile(photo.read())
            )
            update_data['photo'] = default_storage.url(photo_name)
        
        # Doctor-specific fields
        if userType.lower() == "doctor":
            doctor_fields = ['doctorQualification', 'doctorSpecialization']
            for field in doctor_fields:
                if field in validated_data:
                    update_data[field] = validated_data[field]
            
            # Handle doctor certificate upload
            if 'doctorCertificate' in self.request.FILES:
                certificate = self.request.FILES['doctorCertificate']
                cert_name = default_storage.save(
                    f"doctor_certificates/{email}/{certificate.name}",
                    ContentFile(certificate.read())
                )
                update_data['doctorCertificate'] = default_storage.url(cert_name)
        
        # Supplier-specific fields
        elif userType.lower() == "supplier":
            supplier_fields = ['companyName', 'companyStartingDate']
            for field in supplier_fields:
                if field in validated_data:
                    update_data[field] = validated_data[field]
            
            # Handle company license upload
            if 'companyLicense' in self.request.FILES:
                license_file = self.request.FILES['companyLicense']
                license_name = default_storage.save(
                    f"company_licenses/{email}/{license_file.name}",
                    ContentFile(license_file.read())
                )
                update_data['companyLicense'] = default_storage.url(license_name)
        
        # Add updated timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        # Update in users collection
        result = users_collection.update_one(
            {"email": email, "userType": userType.capitalize()},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise exceptions.NotFound("User not found")
        
        # Update in staff collection if doctor
        if userType.lower() == "doctor":
            staff_collection.update_one(
                {"email": email},
                {"$set": update_data}
            )








class GetCompanyNameAPIView(APIView):
    """
    Get supplier company name
    GET /api/accounts/get_company_name/<email>/
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOrIsSameHospitalAdmin]
    
    def get(self, request, email):
        """Get company name for supplier"""
        supplier = users_collection.find_one({"email": email, "userType": "Supplier"})
        if not supplier:
            return Response({"status": "error", "message": "Supplier not found"}, status=status.HTTP_404_NOT_FOUND)

        # Enforce object-level permission for the fetched supplier record.
        self.check_object_permissions(request, supplier)

        return Response({"status": "success", "companyName": supplier.get("companyName")}, status=status.HTTP_200_OK)

