from datetime import datetime
from typing import Optional, List, Dict, Any
class AppointmentDocument:
    """Appointment document schema and helper methods"""
    
    @staticmethod
    def create(
        hospital_name: str,
        department: str,
        appointment_date: str,
        requested_time: str,

        # Patient Details (embedded)
        patient_id: str,
        patient_name: str,
        patient_email: str,
        
        doctor_id: str,
        doctor_name: str,
        doctor_email: str,

        patient_gender: Optional[str] = None,
        patient_dob: Optional[str] = None,
        patient_contact: Optional[str] = None,
        # Doctor Details (embedded)
        doctor_gender: Optional[str] = None,
        doctor_contact: Optional[str] = None,
        doctor_specialization: Optional[str] = None,
        symptoms: str = "",
        status: str = "pending"
    ) -> Dict[str, Any]:
        """Create appointment document"""
        return {
            # Appointment Basic Info
            "hospitalName": hospital_name,
            "department": department,
            "appointmentDate": appointment_date,
            "requestedTime": requested_time,
            "acceptedDate": None,
            "acceptedTime": None,
            
            # Patient Information (Embedded)
            "patient": {
                "patientId": patient_id,
                "name": patient_name,
                "email": patient_email,
                "gender": patient_gender,
                "dateOfBirth": patient_dob,
                "contactNo": patient_contact
            },
            
            # Doctor Information (Embedded)
            "doctor": {
                "doctorId": doctor_id,
                "name": doctor_name,
                "email": doctor_email,
                "gender": doctor_gender,
                "contactNo": doctor_contact,
                "specialization": doctor_specialization
            },
            
            # Medical Details
            "symptoms": symptoms,
            
            # Payment Information (Array for multiple payments)
            "payments": [],
            
            # Status & Metadata
            "status": status,
            "approvedBy": None,
            "rejectedBy": None,
            "rejectionReason": None,
            
            # Timestamps
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "approvedAt": None,
            "completedAt": None,
            "rejectedAt": None
        }
    
    @staticmethod
    def approve(
        accepted_date: Optional[str] = None,
        accepted_time: Optional[str] = None,
        approved_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update fields when appointment is approved"""
        update_data = {
            "status": "approved",
            "approvedBy": approved_by,
            "approvedAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        if accepted_date:
            update_data["acceptedDate"] = accepted_date
        if accepted_time:
            update_data["acceptedTime"] = accepted_time
            
        return update_data
    
    @staticmethod
    def reject(rejected_by: Optional[str] = None, reason: Optional[str] = None) -> Dict[str, Any]:
        """Update fields when appointment is rejected"""
        return {
            "status": "rejected",
            "rejectedBy": rejected_by,
            "rejectionReason": reason,
            "rejectedAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    
    @staticmethod
    def complete() -> Dict[str, Any]:
        """Mark appointment as completed"""
        return {
            "status": "completed",
            "completedAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    
    @staticmethod
    def cancel(cancelled_by: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Cancel appointment"""
        return {
            "status": "cancelled",
            "cancelledBy": cancelled_by,
            "cancellationReason": reason,
            "cancelledAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    
    @staticmethod
    def add_payment(
        payment_id: str,
        amount: float,
        payment_type: str = "consultation",
        status: str = "completed"
    ) -> Dict[str, Any]:
        """Create payment entry to be added to payments array"""
        return {
            "paymentId": payment_id,
            "amount": amount,
            "paymentType": payment_type,
            "paymentDate": datetime.utcnow(),
            "status": status
        }


class PrescriptionDocument:
    """Prescription document schema and helper methods"""
    
    @staticmethod
    def create(
        appointment_id: str,
        
        # Patient Details
        patient_id: str,
        patient_name: str,
        patient_email: str,
        doctor_id: str,
        doctor_name: str,
        doctor_email: str,

        # Hospital Info
        hospital_name: str,
        department: str,
        
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        patient_phone: Optional[str] = None,
        patient_address: Optional[str] = None,
        
        
        # Medical Data
        vitals: Optional[Dict[str, Any]] = None,
        medicines: Optional[List[Dict[str, Any]]] = None,
        suggestions: str = "",

        reports: Optional[Dict[str, Any]] = None

    ) -> Dict[str, Any]:
        """Create prescription document"""
        return {
            "appointmentId": appointment_id,
            
            "patient": {
                "patientId": patient_id,
                "name": patient_name,
                "email": patient_email,
                "age": patient_age,
                "gender": patient_gender,
                "phone": patient_phone,
                "address": patient_address
            },
            
            "doctor": {
                "doctorId": doctor_id,
                "name": doctor_name,
                "email": doctor_email
            },
            
            "hospitalName": hospital_name,
            "department": department,
            
            "vitals": vitals or {
                "bloodPressure": None,
                "heartRate": None,
                "temperature": None,
                "weight": None,
                "height": None,
                "oxygenLevel": None
            },
            
            "medicines": medicines or [],
            "suggestions": suggestions,
            
            "reports": reports or {
                "reportType": "none",
                "reportValues": None
            },
            "invoiceId": None,
            
            "status": "active",
            
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "invoicedAt": None
        }
    
    @staticmethod
    def mark_invoiced(invoice_id: str) -> Dict[str, Any]:
        """Mark prescription as invoiced"""
        return {
            "status": "invoiced",
            "invoiceId": invoice_id,
            "invoicedAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    @staticmethod
    def complete() -> Dict[str, Any]:
        """Mark prescription as completed"""
        return {
            "status": "completed",
            "updatedAt": datetime.utcnow()
        }


class NotificationDocument:
    """Notification document schema"""
    
    @staticmethod
    def create(
        user_email: str,
        title: str,
        message: str,
        notification_type: str = "general",
        reference_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create notification document"""
        return {
            "userEmail": user_email,
            "title": title,
            "message": message,
            "type": notification_type,
            "referenceId": reference_id,
            "read": False,
            "createdAt": datetime.utcnow()
        }


# class MedicineDocument:
#     """Medicine entry in prescription"""
    
#     @staticmethod
#     def create(
#         medicine_id: str,
#         name: str,
#         dosage: str,
#         duration: str,
#         quantity: int,
#         instructions: str = "",
#         price: float = 0.0
#     ) -> Dict[str, Any]:
#         """Create medicine entry for prescription"""
#         return {
#             "medicineId": medicine_id,
#             "name": name,
#             "dosage": dosage,
#             "duration": duration,
#             "quantity": quantity,
#             "instructions": instructions,
#             "price": price
#         }