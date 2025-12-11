from datetime import datetime
from bson import ObjectId

from rest_framework import generics, status, exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.authentication import JWTAuthentication
from apps.accounts.permissions import IsPatientOrAdmin, IsDoctorOrAdmin, IsDoctor, IsAdmin, IsPatient, IsSameUser, IsPatientOrDoctor
from .serializers import (
    BookAppointmentSerializer,
    ApproveAppointmentSerializer,
    AppointmentSerializer,
    PrescriptionSerializer,
)
from .models import AppointmentDocument, PrescriptionDocument, NotificationDocument

from backend.db import (
    users_collection,
    appointments_collection,
    prescriptions_collection,
    notifications_collection,
    products_collection
)

# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# from django.core.mail import EmailMultiAlternatives
# import json
# from datetime import datetime
# from bson.objectid import ObjectId
# import backend.settings as settings

# # Import MongoDB collections from views.py
# from backend.db import (
#     users_collection,
#     appointments_collection,
#     temp_appointments_collection,
#     notifications_collection,
#     prescriptions_collection,
#     products_collection,
#     invoices_collection
# )
class BookAppointmentAPIView(generics.CreateAPIView):
    """
    Book a new appointment
    POST /api/appointments/book/
    
    Accessible by: Patient, Admin
    """
     
    authentication_classes = [JWTAuthentication]
    serializer_class = BookAppointmentSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        user_email = getattr(request.user, 'email', None)
        user_type = getattr(request.user, 'userType', None)
        
        try:
            # Verify patient exists
            patient = users_collection.find_one({
                "email": data['patientEmail']
            })
            
            if not patient:
                return Response({
                    "status": "error",
                    "message": "Patient not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify doctor exists
            doctor = users_collection.find_one({
                "email": data['doctorEmail'],
                "userType": "Doctor",
                "hospitalName": data['hospitalName']
            })
            
            if not doctor:
                return Response({
                    "status": "error",
                    "message": "Doctor not found in the specified hospital"
                }, status=status.HTTP_404_NOT_FOUND)
            
            
            # Check for duplicate appointment on same date/time
            existing = appointments_collection.find_one({
                "patient.email": data['patientEmail'],
                "doctor.email": data['doctorEmail'],
                "appointmentDate": data['appointmentDate'],
                "$or": [
                    {"requestedTime": data['appointmentTime']},
                    {"acceptedTime": data.get('appointmentTime')}
                ],
                "status": {"$in": ["pending", "approved"]}
            })
            
            if existing:
                return Response({
                    "status": "error",
                    "message": "You already have an appointment with this doctor at this time"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            
            # Create appointment document
            appointment_doc = AppointmentDocument.create(
                hospital_name=data['hospitalName'],
                department=data['department'],
                appointment_date=data['appointmentDate'],
                requested_time=data['appointmentTime'],
                patient_id=str(patient['_id']),
                patient_name=patient['name'],
                patient_email=patient['email'],
                patient_gender=patient.get('gender'),
                patient_dob=patient.get('dateOfBirth'),
                patient_contact=patient.get('contactNo'),
                doctor_id=str(doctor['_id']),
                doctor_name=doctor['name'],
                doctor_email=doctor['email'],
                doctor_gender=doctor.get('gender'),
                doctor_contact=doctor.get('contactNo'),
                doctor_specialization=doctor.get('doctorSpecialization'),
                symptoms=data.get('symptoms', ''),
                status='pending'  # Default status
            )
            
            # Modify based on user type
            if user_type == "Admin":
                # Admin booking - immediate approval
                appointment_doc['status'] = 'approved'
                appointment_doc['acceptedDate'] = data['appointmentDate']
                appointment_doc['acceptedTime'] = data['appointmentTime']
                appointment_doc['approvedBy'] = user_email
                appointment_doc['approvedAt'] = datetime.utcnow()
            
            # Insert into database
            result = appointments_collection.insert_one(appointment_doc)
            appointment_id = str(result.inserted_id)
            
            # Send notifications using helper function
            self._send_notifications(
                appointment_id=appointment_id,
                patient_email=patient['email'],
                patient_name=patient['name'],
                doctor_email=doctor['email'],
                doctor_name=doctor['name'],
                appointment_date=data['appointmentDate'],
                appointment_time=data['appointmentTime'],
                hospital_name=data['hospitalName'],
                is_admin_booking=(user_type == "Admin")
            )
            
            # Fetch created appointment
            created_appointment = appointments_collection.find_one({"_id": result.inserted_id})
            created_appointment['_id'] = appointment_id
            
            message = "Appointment confirmed successfully" if user_type == "Admin" else "Appointment booked successfully. Pending approval."
            
            return Response({
                "status": "success",
                "message": message,
                "appointment": AppointmentSerializer(created_appointment).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _send_notifications(
        self,
        appointment_id: str,
        patient_email: str,
        patient_name: str,
        doctor_email: str,
        doctor_name: str,
        appointment_date: str,
        appointment_time: str,
        hospital_name: str,
        is_admin_booking: bool = False
    ):
        """
        Helper function to send notifications and emails
        Centralized notification logic for reusability
        """
        try:
            if is_admin_booking:
                # Notify Patient
                patient_notification = NotificationDocument.create(
                    user_email=patient_email,
                    title="Appointment Confirmed",
                    message=f"Your appointment with Dr. {doctor_name} has been confirmed for {appointment_date} at {appointment_time}",
                    notification_type="appointment",
                    reference_id=appointment_id
                )
                notifications_collection.insert_one(patient_notification)
                
                # Notify Doctor
                doctor_notification = NotificationDocument.create(
                    user_email=doctor_email,
                    title="New Appointment Scheduled",
                    message=f"New appointment with {patient_name} scheduled for {appointment_date} at {appointment_time}",
                    notification_type="appointment",
                    reference_id=appointment_id
                )
                notifications_collection.insert_one(doctor_notification)
                
                # TODO: Send confirmation email to patient
                # self._send_email(
                #     to_email=patient_email,
                #     subject="Appointment Confirmed",
                #     message=f"Your appointment with Dr. {doctor_name} is confirmed for {appointment_date} at {appointment_time}"
                # )
                
                # TODO: Send notification email to doctor
                # self._send_email(
                #     to_email=doctor_email,
                #     subject="New Appointment Scheduled",
                #     message=f"New appointment with {patient_name} scheduled for {appointment_date} at {appointment_time}"
                # )
                
            else:
                # Notify Doctor
                doctor_notification = NotificationDocument.create(
                    user_email=doctor_email,
                    title="New Appointment Request",
                    message=f"New appointment request from {patient_name} for {appointment_date} at {appointment_time}",
                    notification_type="appointment",
                    reference_id=appointment_id
                )
                notifications_collection.insert_one(doctor_notification)
                
                # Notify Admin
                admin = users_collection.find_one({
                    "userType": "Admin",
                    "hospitalName": hospital_name
                })
                if admin:
                    admin_notification = NotificationDocument.create(
                        user_email=admin['email'],
                        title="New Appointment Request",
                        message=f"New appointment request from {patient_name} with Dr. {doctor_name}",
                        notification_type="appointment",
                        reference_id=appointment_id
                    )
                    notifications_collection.insert_one(admin_notification)
                
                # Notify Patient
                patient_notification = NotificationDocument.create(
                    user_email=patient_email,
                    title="Appointment Request Submitted",
                    message=f"Your appointment request with Dr. {doctor_name} for {appointment_date} at {appointment_time} is pending approval",
                    notification_type="appointment",
                    reference_id=appointment_id
                )
                notifications_collection.insert_one(patient_notification)
                
                # TODO: Send email to patient
                # self._send_email(
                #     to_email=patient_email,
                #     subject="Appointment Request Received",
                #     message=f"Your appointment request with Dr. {doctor_name} is pending approval"
                # )
                
                # TODO: Send email to doctor
                # self._send_email(
                #     to_email=doctor_email,
                #     subject="New Appointment Request",
                #     message=f"New appointment request from {patient_name} for {appointment_date} at {appointment_time}"
                # )
                
        except Exception as e:
            print(f"Notification error: {str(e)}")












class ApproveAppointmentAPIView(generics.UpdateAPIView):
    """
    Approve or reject a pending appointment
    PATCH /api/appointments/approve/
    Accessible by: Doctor, Admin
    """
    permission_classes = [IsAuthenticated, IsDoctorOrAdmin]
    authentication_classes = [JWTAuthentication]
    serializer_class = ApproveAppointmentSerializer
    
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        user_email = getattr(request.user, 'email', None)
        user_type = getattr(request.user, 'userType', None)
        
        try:
            # Fetch appointment
            appointment = appointments_collection.find_one({
                "_id": ObjectId(data['appointmentId'])
            })
            
            if not appointment:
                return Response({
                    "status": "error",
                    "message": "Appointment not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if appointment is pending
            if appointment['status'] != 'pending':
                return Response({
                    "status": "error",
                    "message": f"Appointment is already {appointment['status']}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify user has permission to approve this appointment
            if user_type == "Doctor" and appointment['doctor']['email'] != user_email:
                return Response({
                    "status": "error",
                    "message": "You can only approve your own appointments"
                }, status=status.HTTP_403_FORBIDDEN)
            
            if user_type == "Admin" and appointment['hospitalName'] != getattr(request.user, 'hospitalName', None):
                return Response({
                    "status": "error",
                    "message": "You can only approve appointments in your hospital"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Process action
            action = data['action']
            
            
            if action == 'approve':
                # Use confirmed date/time if provided, otherwise use requested
                accepted_time = data.get('confirmedTime') or appointment['requestedTime']
                accepted_date = data.get('confirmedDate') or appointment['appointmentDate']
                
                try:
                    original_date = appointment.get('appointmentDate')
                    if accepted_date == original_date and accepted_time == appointment.get('requestedTime'):
                        update_data = AppointmentDocument.approve(
                            accepted_date=accepted_date,
                            accepted_time=accepted_time,
                            approved_by=user_email
                        )
                        message = "Appointment approved successfully"
                    else:
                        delta_days = (datetime.strptime(accepted_date, "%Y-%m-%d") - datetime.strptime(original_date, "%Y-%m-%d")).days
                        if 0 < delta_days <= 7:
                            update_data = AppointmentDocument.approve(
                                accepted_date=accepted_date,
                                accepted_time=accepted_time,
                                approved_by=user_email
                            )
                            message = ("Doctor not available on the originally requested day. "
                                    "We rescheduled your appointment successfully within 7 days. "
                                    "If you cannot come on that day contact the hospital via portal or email.")
                        else:
                            reason = "Rescheduled date beyond 7 days; doctor not available. You may claim charging amount."
                            update_data = AppointmentDocument.reject(rejected_by=user_email, reason=reason)
                            message = ("Rescheduled date is beyond 7 days; doctor not available. "
                                    "The appointment has been rejected. You may claim the charging amount.")
                except Exception as parse_err:
                    return Response({
                        "status": "error",
                        "message": f"Date parsing error: {str(parse_err)}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # apply approval update
                appointments_collection.update_one({"_id": ObjectId(data["appointmentId"])}, {"$set": update_data})

                # Send notification depending on final status
                final_status = update_data.get('status')
                if final_status == 'approved':
                    notif = NotificationDocument.create(
                        user_email=appointment['patient']['email'],
                        title="Appointment Approved",
                        message=f"Your appointment with Dr. {appointment['doctor']['name']} has been approved for {update_data.get('acceptedDate')} at {update_data.get('acceptedTime')}",
                        notification_type="appointment",
                        reference_id=data['appointmentId']
                    )
                    notifications_collection.insert_one(notif)
                else:  # rejected due to >7 days
                    notif = NotificationDocument.create(
                        user_email=appointment['patient']['email'],
                        title="Appointment Rejected",
                        message=f"Your appointment with Dr. {appointment['doctor']['name']} has been rejected. Reason: {update_data.get('rejectionReason')}",
                        notification_type="appointment",
                        reference_id=data['appointmentId']
                    )
                    notifications_collection.insert_one(notif)
                
            else:  # explicit reject action
                reason = data.get('rejectionReason', 'Appointment rejected due to improper or insufficient information provided at booking. No charging amount will be processed.')
                update_data = AppointmentDocument.reject(rejected_by=user_email, reason=reason)

                # Update appointment
                appointments_collection.update_one(
                    {"_id": ObjectId(data['appointmentId'])},
                    {"$set": update_data}
                )

                # Notify patient
                notif = NotificationDocument.create(
                    user_email=appointment['patient']['email'],
                    title="Appointment Rejected",
                    message=f"Your appointment with Dr. {appointment['doctor']['name']} has been rejected. Reason: {reason}",
                    notification_type="appointment",
                    reference_id=data['appointmentId']
                )
                notifications_collection.insert_one(notif)

                message = "Appointment rejected"
            
            # Fetch updated appointment
            updated_appointment = appointments_collection.find_one({
                "_id": ObjectId(data['appointmentId'])
            })
            updated_appointment['_id'] = str(updated_appointment['_id'])
            
            return Response({
                "status": "success",
                "message": message,
                "appointment": AppointmentSerializer(updated_appointment).data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR )












class GetMyAppointmentsAPIView(generics.ListAPIView):
    """
    Get appointments for logged-in user (Patient or Doctor)
    GET /api/appointments/my/
    
    Query params:
    - status: filter by status (all, pending, approved, completed, rejected)
    
    """
    permission_classes = [IsAuthenticated, IsPatientOrDoctor]
    authentication_classes = [JWTAuthentication]
    serializer_class = AppointmentSerializer
    
    def list(self, request, *args, **kwargs):
        user_email = getattr(request.user, 'email', None)
        user_type = getattr(request.user, 'userType', None)
        
        try:
            # Build query based on user type
            if user_type == "Patient":
                query = {"patient.email": user_email}
            else:  # Doctor
                query = {"doctor.email": user_email}
            
            # Filter by status if provided
            status_filter = request.query_params.get('status', 'all')
            if status_filter and status_filter != 'all':
                query['status'] = status_filter
            
            # Fetch appointments
            appointments = list(appointments_collection.find(query).sort("appointmentDate", -1))
            
            # Convert ObjectId to string
            for apt in appointments:
                apt['_id'] = str(apt['_id'])
            
            return Response({
                "status": "success",
                "userType": user_type,
                "count": len(appointments),
                "appointments": [AppointmentSerializer(apt).data for apt in appointments]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)












class GetPendingAppointmentsAPIView(generics.ListAPIView):
    """
    Get all pending appointments for a hospital
    GET /api/appointments/pending/
    
    Accessible by: Admin only
    """
    permission_classes = [IsAuthenticated, IsDoctorOrAdmin]
    authentication_classes = [JWTAuthentication]
    serializer_class = AppointmentSerializer
    
    def list(self, request, *args, **kwargs):
        hospital_name = getattr(request.user, 'hospitalName', None)
        
        if not hospital_name:
            return Response({
                "status": "error",
                "message": "Hospital name not found in user profile"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Fetch only pending appointments for this hospital
            appointments = list(appointments_collection.find({
                "hospitalName": hospital_name,
                "status": "pending"
            }).sort("appointmentDate", 1))  # Sort by date ascending (oldest first)
            
            # Convert ObjectId to string
            for apt in appointments:
                apt['_id'] = str(apt['_id'])
            
            return Response({
                "status": "success",
                "hospitalName": hospital_name,
                "count": len(appointments),
                "appointments": [AppointmentSerializer(apt).data for apt in appointments]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
















class GetAllAppointmentsAPIView(generics.ListAPIView):
    """
    Get all appointments for admin's hospital (all statuses)
    GET /api/appointments/all/
    
    Query params:
    - status: filter by status (all, pending, approved, completed, rejected, cancelled)
    - date: filter by specific date (YYYY-MM-DD)
    - doctor: filter by doctor email
    
    Accessible by: Admin only
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]
    serializer_class = AppointmentSerializer
    
    def list(self, request, *args, **kwargs):
        hospital_name = getattr(request.user, 'hospitalName', None)
        
        if not hospital_name:
            return Response({
                "status": "error",
                "message": "Hospital name not found in user profile"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Build query
            query = {"hospitalName": hospital_name}
            
            # Filter by status if provided
            status_filter = request.query_params.get('status')
            if status_filter and status_filter != 'all':
                query['status'] = status_filter
            
            # Filter by date if provided
            date_filter = request.query_params.get('date')
            if date_filter:
                query['appointmentDate'] = date_filter
            
            # Filter by doctor if provided
            doctor_filter = request.query_params.get('doctor')
            if doctor_filter:
                query['doctor.email'] = doctor_filter
            
            # Fetch appointments
            appointments = list(appointments_collection.find(query).sort("appointmentDate", -1))
            
            # Convert ObjectId to string
            for apt in appointments:
                apt['_id'] = str(apt['_id'])
            
            return Response({
                "status": "success",
                "hospitalName": hospital_name,
                "filters": {
                    "status": status_filter or "all",
                    "date": date_filter,
                    "doctor": doctor_filter
                },
                "count": len(appointments),
                "appointments": [AppointmentSerializer(apt).data for apt in appointments]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)











class GetHospitalMedicinesAPIView(generics.ListAPIView):
    """
    Get available medicines in a hospital
    GET /api/appointments/medicines/<hospital_name>/
    
    Accessible by: Doctor, Admin
    """
    permission_classes = [IsAuthenticated, IsDoctorOrAdmin]
    authentication_classes = [JWTAuthentication]
    
    def list(self, request, *args, **kwargs):
        hospital_name = self.kwargs.get('hospital_name')
        
        try:
            medicines = list(products_collection.find({
                "hospitalName": hospital_name,
                "quantity": {"$gt": 0}
            }))
            
            # Convert ObjectId to string
            for med in medicines:
                med['_id'] = str(med['_id'])
            
            return Response({
                "status": "success",
                "count": len(medicines),
                "medicines": medicines
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# @csrf_exempt
# def get_hospital_medicines(request):
#     try:
#         data = json.loads(request.body)
#         hospital_name = data.get('hospitalName', '')
#         # department = data.get('department', '')
        
#         if not hospital_name:
#             return JsonResponse({'status': 'error', 'message': 'Hospital name is required'}, status=400)
        
#          # Find medicines for this hospital
#         query = {"Hospital Name": hospital_name, "Product Type": "Medicine"}
        
#         # Only fetch necessary fields for better performance
#         projection = {
#             "_id": 1,
#             "Product Name": 1,
#             "Stock": 1,
#             "Price (Per Unit/Strip)": 1
#         }
        
#         # Get medicines from MongoDB collection
#         medicines = list(products_collection.find(query, projection))

#         processed_medicines = []
#         for medicine in medicines:
#             medicine['_id'] = str(medicine['_id'])
#             # Ensure these fields exist with default values
#             if 'Product Name' not in medicine:
#                 medicine['Product Name'] = 'Unknown Medicine'
            
#             if 'Stock' not in medicine:
#                 medicine['Stock'] = 0
#             else:
#                 try:
#                     medicine['Stock'] = int(medicine['Stock'])
#                 except (ValueError, TypeError):
#                     medicine['Stock'] = 0
            
#             if 'Price (Per Unit/Strip)' in medicine:
#                 try:
#                     medicine['Price (Per Unit/Strip)'] = float(medicine['Price (Per Unit/Strip)'])
#                 except (ValueError, TypeError):
#                     medicine['Price (Per Unit/Strip)'] = 0.0
#             else:
#                 medicine['Price (Per Unit/Strip)'] = 0.0
                
#             processed_medicines.append(medicine)

        
#         return JsonResponse({
#             'status': 'success',
#             'medicines': processed_medicines

#         })
#     except Exception as e:
#         return JsonResponse({
#             'status': 'error',
#             'message': str(e)
#         }, status=500)






class CreatePrescriptionAPIView(generics.CreateAPIView):
    """
    Create prescription for an appointment
    POST /api/appointments/prescription/
    
    Accessible by: Doctor only
    """
    permission_classes = [IsAuthenticated, IsDoctor]
    authentication_classes = [JWTAuthentication]
    serializer_class = PrescriptionSerializer


    def _extract_person(self, appointment: dict, prefix: str) -> dict:
        """
        Robustly extract embedded patient/doctor info from appointment.
        Supports either nested dicts appointment['patient']/appointment['doctor']
        or flat fields like patientName/patientEmail/doctorName/doctorEmail, etc.
        """
        nested = appointment.get(prefix)
        if isinstance(nested, dict):
            return nested

        # fallback: try multiple top-level key variants
        mapping = {}
        if prefix == 'patient':
            mapping['patientId'] = appointment.get('patientId') or appointment.get('patient_id') or appointment.get('patientID')
            mapping['name'] = appointment.get('patientName') or appointment.get('patient_name') or appointment.get('patientFullName')
            mapping['email'] = appointment.get('patientEmail') or appointment.get('patient_email')
            mapping['age'] = appointment.get('patientAge') or appointment.get('patient_age') or appointment.get('age')
            mapping['gender'] = appointment.get('patientGender') or appointment.get('patient_gender')
            mapping['contactNo'] = appointment.get('patientContact') or appointment.get('patientContactNo') or appointment.get('patientPhone') or appointment.get('patient_phone')
            return mapping
        else:
            mapping['doctorId'] = appointment.get('doctorId') or appointment.get('doctor_id') or appointment.get('doctorID')
            mapping['name'] = appointment.get('doctorName') or appointment.get('doctor_name')
            mapping['email'] = appointment.get('doctorEmail') or appointment.get('doctor_email')
            mapping['specialization'] = appointment.get('doctorSpecialization') or appointment.get('doctor_specialization')
            mapping['contactNo'] = appointment.get('doctorContact') or appointment.get('doctor_contact')
            return mapping
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        user_email = getattr(request.user, 'email', None)
        
        try:
            # Verify appointment exists and belongs to this doctor
            appointment = appointments_collection.find_one({
                "_id": ObjectId(data['appointmentId'])
            })
            
            if not appointment:
                return Response({
                    "status": "error",
                    "message": "Appointment not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Extract doctor and patient records robustly
            doctor = self._extract_person(appointment, 'doctor')
            patient = self._extract_person(appointment, 'patient')
            
            # Permission checks: ensure authenticated doctor owns appointment
            doctor_email = (doctor.get('email') or '').lower()
            if doctor_email != (user_email or '').lower():
                return Response({"status": "error", "message": "You can only create prescriptions for your own appointments"}, status=status.HTTP_403_FORBIDDEN)

            if appointment['status'] != 'approved':
                return Response({
                    "status": "error",
                    "message": "Prescription can only be created for approved appointments"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if prescription already exists
            existing = prescriptions_collection.find_one({
                "appointmentId": data['appointmentId']
            })
            
            if existing:
                return Response({
                    "status": "error",
                    "message": "Prescription already exists for this appointment"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create prescription document
            prescription_doc = PrescriptionDocument.create(
                appointment_id=data['appointmentId'],
                patient_id=patient.get('patientId') or str(patient.get('_id')),
                patient_name=patient.get('name'),
                patient_email=patient.get('email'),
                patient_age=data.get('patientAge') or patient.get('age'),
                patient_gender=patient.get('gender'),
                patient_phone=data.get('patientPhone') or patient.get('contactNo'),
                patient_address=data.get('patientAddress'),
                doctor_id=doctor.get('doctorId') or str(doctor.get('_id')),
                doctor_name=doctor.get('name'),
                doctor_email=doctor.get('email'),
                hospital_name=appointment.get('hospitalName'),
                department=appointment.get('department'),
                vitals=data.get('vitals'),
                medicines=data['medicines'],
                suggestions=data.get('suggestions', ''),
                reports=data.get('reports')
            )
            
            # Insert prescription
            result = prescriptions_collection.insert_one(prescription_doc)
            prescription_id = str(result.inserted_id)
            
            # Mark appointment as completed
            appointments_collection.update_one(
                {"_id": ObjectId(data['appointmentId'])},
                {"$set": AppointmentDocument.complete()}
            )
            
            # Notify patient (use appointment/patient info, not payload)
            patient_email = patient.get('email') or appointment.get('patientEmail') or appointment.get('patient_email')
            doctor_name = doctor.get('name') or appointment.get('doctorName') or appointment.get('doctor_name')
            if patient_email:
                notification = NotificationDocument.create(
                    user_email=patient_email,
                    title="Prescription Created",
                    message=f"Dr. {doctor_name} has created a prescription for your appointment",
                    notification_type="prescription",
                    reference_id=prescription_id
                )
                notifications_collection.insert_one(notification)
            
            # Fetch created prescription
            prescription = prescriptions_collection.find_one({"_id": result.inserted_id})
            prescription['_id'] = prescription_id
            
            return Response({
                "status": "success",
                "message": "Prescription created successfully",
                "prescription": prescription
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# @csrf_exempt
# def save_prescription(request):
#     """Save prescription details for an appointment"""
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             patient_email = data.get('patientEmail')
#             doctor_email = data.get('doctorEmail')
#             appointment_id = data.get('appointmentId')

#             # Required validation
#             if not patient_email or not doctor_email:
#                 return JsonResponse({
#                     'status': 'error',
#                     'message': 'Patient email and doctor email are required'
#                 }, status=400)
            
#             if not appointment_id:
#                 return JsonResponse({'error': 'Appointment ID is required'}, status=400)
            
#             # Create prescription document
#             prescription = {
#                 'patientName': data.get('patientName'),
#                 'patientEmail': patient_email,
#                 'patientAge': data.get('patientAge'),
#                 'patientGender': data.get('patientGender'),
#                 'patientPhone': data.get('patientPhone'),
#                 'patientAddress': data.get('patientAddress'),
                
#                 'doctorName': data.get('doctorName'),
#                 'doctorEmail': doctor_email,
#                 'department': data.get('department'),
#                 'hospitalName': data.get('hospitalName'),
                
#                 'vitals': data.get('vitals', {}),
#                 'medicines': data.get('medicines', []),
#                 'suggestions': data.get('suggestions', ''),
                
#                 'reportType': data.get('reportType', 'none'),
#                 'reportValues': data.get('reportValues'),
                
#                 'appointmentId': appointment_id,  # May be null if not from appointment
#                 'created_at': datetime.now(),
#                 'status': 'active'  # Default status
#             }
#             # Save prescription
#             result = prescriptions_collection.insert_one(prescription)
            
#             # Update appointment status
#             if appointment_id:
#                 appointments_collection.update_one(
#                     {'_id': ObjectId(appointment_id)},
#                     {'$set': {'status': 'completed'}}
#                 )

#             # Send email notification to patient
#             try:
#                 message = f"""
#                 <html>
#                     <body>
#                         <h2>New Prescription Available</h2>
#                         <p>Dear {data.get('patientName')},</p>
#                         <p>Dr. {data.get('doctorName')} has created a prescription for you.</p>
#                         <p>You can view the details in your HMS account.</p>
#                         <p>Best regards,</p>
#                         <p>HMS Healthcare Team</p>
#                         <p><small>This is an automated message. Please do not reply.</small></p>
#                     </body>
#                 </html>
#                 """
                
#                 email_message = EmailMultiAlternatives(
#                     subject="HMS - New Prescription Available",
#                     body=message,
#                     from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
#                     to=[patient_email],
#                 )
#                 email_message.content_subtype = "html"
#                 email_message.send(fail_silently=True)
#             except Exception as e:
#                 print(f"Email notification error: {e}")
            
#             return JsonResponse({
#                 'success': True,
#                 'prescription_id': str(result.inserted_id),
#                 'message': 'Prescription saved successfully'
#             })
            
#         except Exception as e:
#             print(f"Error saving prescription: {e}")
#             return JsonResponse({'error': str(e)}, status=500)
    
#     return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

class GetPendingPrescriptionsAPIView(generics.ListAPIView):

    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]
    serializer_class = PrescriptionSerializer
    
    def list(self, request, *args, **kwargs):
        hospital_name = getattr(request.user, 'hospitalName', None)
        
        if not hospital_name:
            return Response({
                "status": "error",
                "message": "Hospital name not found in user profile"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Build query for pending prescriptions (no invoiceId)
            query = {
                "hospitalName": hospital_name,
                "invoiceId": None
            }
            
            # Filter by status if provided
            status_filter = request.query_params.get('status')
            if status_filter:
                query['status'] = status_filter
            
            # Filter by appointmentId if provided
            appointment_id = request.query_params.get('appointmentId')
            if appointment_id:
                query['appointmentId'] = appointment_id
            
            # Fetch pending prescriptions
            prescriptions = list(prescriptions_collection.find(query).sort("createdAt", -1))
            
            # Convert ObjectId to string
            for presc in prescriptions:
                presc['_id'] = str(presc['_id'])
            
            return Response({
                "status": "success",
                "hospitalName": hospital_name,
                "type": "pending",
                "count": len(prescriptions),
                "prescriptions": [PrescriptionSerializer(presc).data for presc in prescriptions]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetAllPrescriptionsAPIView(generics.ListAPIView):

    permission_classes = [IsAuthenticated, IsAdmin]
    authentication_classes = [JWTAuthentication]
    serializer_class = PrescriptionSerializer
    
    def list(self, request, *args, **kwargs):
        hospital_name = getattr(request.user, 'hospitalName', None)
        
        if not hospital_name:
            return Response({
                "status": "error",
                "message": "Hospital name not found in user profile"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Build base query
            query = {"hospitalName": hospital_name}
            
            # Filter by status if provided
            status_filter = request.query_params.get('status')
            if status_filter:
                query['status'] = status_filter
            
            # Filter by invoiceId if provided
            invoice_id = request.query_params.get('invoiceId')
            if invoice_id:
                query['invoiceId'] = invoice_id
            
            # Filter by doctor email if provided
            doctor_email = request.query_params.get('doctorEmail')
            if doctor_email:
                query['doctor.email'] = doctor_email
            
            # Filter by patient email if provided
            patient_email = request.query_params.get('patientEmail')
            if patient_email:
                query['patient.email'] = patient_email
            
            # Filter by date if provided
            date_filter = request.query_params.get('date')
            if date_filter:
                query['createdAt'] = {"$regex": date_filter}
            
            # Fetch all prescriptions
            prescriptions = list(prescriptions_collection.find(query).sort("createdAt", -1))
            
            # Convert ObjectId to string
            for presc in prescriptions:
                presc['_id'] = str(presc['_id'])
            
            return Response({
                "status": "success",
                "hospitalName": hospital_name,
                "filters": {
                    "status": status_filter,
                    "invoiceId": invoice_id,
                    "doctorEmail": doctor_email,
                    "patientEmail": patient_email,
                    "date": date_filter
                },
                "count": len(prescriptions),
                "prescriptions": [PrescriptionSerializer(presc).data for presc in prescriptions]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetMyPrescriptionsAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsPatientOrDoctor]
    authentication_classes = [JWTAuthentication]
    serializer_class = PrescriptionSerializer
    
    def list(self, request, *args, **kwargs):
        user_email = getattr(request.user, 'email', None)
        user_type = getattr(request.user, 'userType', None)
        
        try:
            query = {}
            
            if user_type == "Patient":
                # Patients see their own prescriptions
                query['patient.email'] = user_email
                
            elif user_type == "Doctor":
                # Doctors see prescriptions they created
                query['doctor.email'] = user_email
            else:
                return Response({
                    "status": "error",
                    "message": "Unauthorized user type"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Filter by status if provided
            status_filter = request.query_params.get('status')
            if status_filter:
                query['status'] = status_filter
            
            # Fetch prescriptions
            prescriptions = list(prescriptions_collection.find(query).sort("createdAt", -1))
            
            # Convert ObjectId to string
            for presc in prescriptions:
                presc['_id'] = str(presc['_id'])
            
            return Response({
                "status": "success",
                "userType": user_type,
                "userEmail": user_email,
                "count": len(prescriptions),
                "prescriptions": [PrescriptionSerializer(presc).data for presc in prescriptions]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# @csrf_exempt
# def get_prescriptions(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             hospital_name = data.get('hospitalName')
            
#             if not hospital_name:
#                 return JsonResponse({'error': 'Hospital name is required'}, status=400)
            
#             # Query prescriptions for the hospital
#             prescriptions = list(prescriptions_collection.find({'hospitalName': hospital_name, 'status': {'$ne': 'completed'}}))
            
#             # Process prescriptions
#             for prescription in prescriptions:
#                 prescription['_id'] = str(prescription['_id'])
#                 prescription['patientEmail'] = prescription.get('patientEmail', 'N/A')
#                 prescription['doctorEmail'] = prescription.get('doctorEmail', 'N/A')
#                 prescription['department'] = prescription.get('department', 'N/A')
#                 prescription['hospitalName'] = prescription.get('hospitalName', 'N/A')
#                 prescription['medicines'] = prescription.get('medicines', [])
#                 prescription['suggestions'] = prescription.get('suggestions', 'N/A')
#                 prescription['reportType'] = prescription.get('reportType', 'N/A')
#                 prescription['reportValues'] = prescription.get('reportValues', 'N/A')
#                 prescription['created_at'] = prescription.get('created_at', 'N/A')

#                 prescription['appointmentId'] = str(prescription.get('appointmentId', 'N/A'))  # Convert ObjectId to string
#                 prescription['patientName'] = prescription.get('patientName', 'N/A')
#                 prescription['patientAge'] = prescription.get('patientAge', 'N/A')
#                 prescription['patientGender'] = prescription.get('patientGender', 'N/A')
#                 prescription['patientPhone'] = prescription.get('patientPhone', 'N/A')
#                 prescription['patientAddress'] = prescription.get('patientAddress', 'N/A')

#                 prescription['vitals'] = prescription.get('vitals', {})  # Ensure vitals is a dict

            
#             return JsonResponse({
#                 'status': 'success',
#                 'prescriptions': prescriptions
#             })
            
#         except Exception as e:
#             return JsonResponse({'error': str(e)}, status=500)
    
#     return JsonResponse({'error': 'Method not allowed'}, status=405)
















# @csrf_exempt
# def generate_invoice(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
            
#             # Extract data
#             prescription_id = data.get('prescriptionId')
#             patient_name = data.get('patientName')
#             patient_email = data.get('patientEmail')
#             medicines = data.get('medicines', [])
#             total_amount = data.get('totalAmount')
#             hospital_name = data.get('hospitalName')
#             payment_id = data.get('paymentId')
            
#             # Create invoice document
#             invoice = {
#                 'prescriptionId': prescription_id,
#                 'patientName': patient_name,
#                 'patientEmail': patient_email,
#                 'medicines': medicines,
#                 'totalAmount': total_amount,
#                 'hospitalName': hospital_name,
#                 'paymentId': payment_id,
#                 'status': 'generated',
#                 'created_at': datetime.now()
#             }
            
#             # Save invoice to database
#             result = invoices_collection.insert_one(invoice)

#             prescriptions_collection.update_one(
#                 {'_id': ObjectId(prescription_id)},
#                 {'$set': {'status': 'completed'}}
#             )
            
            
#             # Update stock quantities
#             for medicine in medicines:
#                 products_collection.update_one(
#                     {'_id': ObjectId(medicine['_id'])},
#                     {'$inc': {'Stock': -medicine['quantity']}}
#                 )
            
#             # Send email notification
#             try:
#                 message = f"""
#                 <html>
#                     <body>
#                         <h2>Invoice Generated</h2>
#                         <p>Dear {patient_name},</p>
#                         <p>Your medicine invoice has been generated:</p>
#                         <ul>
#                             <li>Total Amount: ₹{total_amount}</li>
#                             <li>Hospital: {hospital_name}</li>
#                         </ul>
#                         <p>Please collect your medicines from the pharmacy.</p>
#                         <p>Best regards,</p>
#                         <p>HMS Healthcare Team</p>
#                     </body>
#                 </html>
#                 """
                
#                 email_message = EmailMultiAlternatives(
#                     subject="HMS - Medicine Invoice Generated",
#                     body=message,
#                     from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
#                     to=[patient_email]
#                 )
#                 email_message.content_subtype = "html"
#                 email_message.send(fail_silently=True)
#             except Exception as e:
#                 print(f"Email notification error: {e}")
            
#             return JsonResponse({
#                 'status': 'success',
#                 'invoice_id': str(result.inserted_id),
#                 'message': 'Invoice generated successfully'
#             })
            
#         except Exception as e:
#             print(f"Error generating invoice: {e}")
#             return JsonResponse({
#                 'status': 'error',
#                 'message': str(e)
#             }, status=500)
    
#     return JsonResponse({
#         'status': 'error',
#         'message': 'Method not allowed'
#     }, status=405)