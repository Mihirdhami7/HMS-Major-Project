from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import EmailMultiAlternatives
import json
from datetime import datetime
from bson.objectid import ObjectId
import backend.settings as settings

# Import MongoDB collections from views.py
from users.views import (
    users_collection,
    appointments_collection,
    temp_appointments_collection,
    notifications_collection,
    prescriptions_collection,
)

@csrf_exempt
def book_appointment(request):
    """Book a new appointment (creates temporary appointment pending approval)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Extract appointment data
            patientName = data.get('patientName')
            patientEmail = data.get('patientEmail')
            department = data.get('department')
            appointmentDate = data.get('appointmentDate')
            requestedTime = data.get('requestedTime')
            symptoms = data.get('symptoms', '')
            doctorEmail = data.get('doctorEmail')
            doctorName = data.get('doctorName')
            
            # Validate required fields
            if not all([patientEmail, doctorEmail, appointmentDate, requestedTime]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            
            # # Check if patient exists
            # patient = users_collection.find_one({'email': patientEmail, 'user_type': 'patient'})
            # if not patient:
            #     return JsonResponse({'error': 'Patient not found'}, status=404)
            
            # # Check if doctor exists
            # doctor = users_collection.find_one({'email': doctorEmail, 'user_type': 'doctor'})
            # if not doctor:
            #     return JsonResponse({'error': 'Doctor not found'}, status=404)
            
            # Create appointment object
            appointment = {
                #'patient_id': patient['_id'],
                'patientName': patientName,
                'patientEmail': patientEmail,
                'department': department,
                'appointmentDate': appointmentDate,
                'requestedTime': requestedTime,
                'symptoms': symptoms,
                'doctorEmail': doctorEmail,
                'doctorName': doctorName,
                'status': 'pending',
                'create_at': datetime.now()
            }
            
            # Insert into temporary appointments
            result = temp_appointments_collection.insert_one(appointment)
            
            # Create notification for doctor
            notification = {
                'doctor_id': doctorEmail,
                'user_type': 'doctor',
                'title': f'New Appointment Request',
                'message': f'New appointment request from {patientName} for {appointmentDate} at {requestedTime}.',
                'read': False,
                'created_at': datetime.now()
            }
            notifications_collection.insert_one(notification)
            
            if doctorEmail:
                message = f"""
                Dear {doctorName},
                
                You have received a new appointment request:
                
                Patient: {patientName}
                Date: {appointmentDate}
                Time: {requestedTime}
                Symptoms: {symptoms}
                
                Please log in to approve or reject this appointment.
                
                Regards,
                HMS Healthcare
                """
                email_message = EmailMultiAlternatives(
                subject = "'New Appointment Request'", 
                body  = message, 
                from_email= f'HMS Team<{settings.EMAIL_HOST_USER}>',
                to=[doctorEmail]
                )
                email_message.send(fail_silently=False)

                print(f"Request sent successfully to {doctorEmail}")
            
            return JsonResponse({
                'success': True,
                'appointment_id': str(result.inserted_id),
                'message': 'Appointment request submitted successfully'
            })
            
        except Exception as e:
            print(f"Error booking appointment: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

@csrf_exempt
def approve_appointment(request):
    """Approve or reject a pending appointment"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            appointment_id = data.get('appointment_id')
            action = data.get('action')  # 'approve' or 'reject'
            
            if not appointment_id or not action:
                return JsonResponse({'error': 'Missing appointment ID or action'}, status=400)
            
            # Find temporary appointment
            temp_appointment = temp_appointments_collection.find_one({'_id': ObjectId(appointment_id)})
            if not temp_appointment:
                return JsonResponse({'error': 'Appointment not found'}, status=404)
            
            patient_id = temp_appointment['patient_id']
            doctor_id = temp_appointment['doctor_id']
            
            # Get patient and doctor details
            patient = users_collection.find_one({'_id': patient_id})
            doctor = users_collection.find_one({'_id': doctor_id})
            
            if action == 'approve':
                # Move to confirmed appointments
                appointment = temp_appointment.copy()
                appointment['status'] = 'confirmed'
                appointments_collection.insert_one(appointment)
                
                # Create notification for patient
                notification = {
                    'user_id': patient_id,
                    'title': 'Appointment Confirmed',
                    'message': f'Your appointment on {temp_appointment["date"]} at {temp_appointment["time"]} with Dr. {doctor["full_name"]} has been confirmed.',
                    'read': False,
                    'created_at': datetime.now()
                }
                notifications_collection.insert_one(notification)
                
                # Send email to patient
                if patient.get('email'):
                    subject = 'Appointment Confirmed'
                    body = f"""
                    Dear {patient.get('full_name')},
                    
                    Your appointment has been confirmed:
                    
                    Doctor: {doctor.get('full_name')}
                    Date: {temp_appointment.get('date')}
                    Time: {temp_appointment.get('time')}
                    
                    Please arrive 15 minutes before your scheduled time.
                    
                    Regards,
                    HMS Healthcare
                    """
                    
                
                message = 'Appointment approved successfully'
            
            elif action == 'reject':
                # Create notification for patient
                notification = {
                    'user_id': patient_id,
                    'title': 'Appointment Rejected',
                    'message': f'Your appointment request on {temp_appointment["date"]} at {temp_appointment["time"]} with Dr. {doctor["full_name"]} has been rejected.',
                    'read': False,
                    'created_at': datetime.now()
                }
                notifications_collection.insert_one(notification)
                
                # Send email to patient
                if patient.get('email'):
                    subject = 'Appointment Request Rejected'
                    body = f"""
                    Dear {patient.get('full_name')},
                    
                    Your appointment request has been rejected:
                    
                    Doctor: {doctor.get('full_name')}
                    Date: {temp_appointment.get('date')}
                    Time: {temp_appointment.get('time')}
                    
                    Please contact the hospital for more information or to schedule a different time.
                    
                    Regards,
                    HMS Healthcare
                    """
                    
                
                message = 'Appointment rejected successfully'
            
            else:
                return JsonResponse({'error': 'Invalid action. Use "approve" or "reject"'}, status=400)
            
            # Delete from temporary appointments
            temp_appointments_collection.delete_one({'_id': ObjectId(appointment_id)})
            
            return JsonResponse({
                'success': True,
                'message': message
            })
            
        except Exception as e:
            print(f"Error processing appointment approval: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

@csrf_exempt
def get_appointments(request, user_id):
    """Get all appointments for a specific user (either patient or doctor)"""
    if request.method == 'GET':
        try:
            # Find user
            user = users_collection.find_one({'_id': ObjectId(user_id)})
            if not user:
                return JsonResponse({'error': 'User not found'}, status=404)
            
            # Query field depends on user type
            if user['user_type'] == 'patient':
                query_field = 'patient_id'
            elif user['user_type'] == 'doctor':
                query_field = 'doctor_id'
            else:
                return JsonResponse({'error': 'Invalid user type'}, status=400)
            
            # Get confirmed appointments
            appointments = list(appointments_collection.find({query_field: ObjectId(user_id)}))
            
            # Get pending appointments
            pending = list(temp_appointments_collection.find({query_field: ObjectId(user_id)}))
            
            # Add doctor/patient details to appointments
            for appointment in appointments + pending:
                # Convert ObjectId to string for JSON serialization
                appointment['_id'] = str(appointment['_id'])
                
                # Add patient details
                patient = users_collection.find_one({'_id': appointment['patient_id']})
                if patient:
                    appointment['patient'] = {
                        'id': str(patient['_id']),
                        'name': patient.get('full_name', 'Unknown'),
                        'email': patient.get('email', 'N/A'),
                        'contact': patient.get('contact', 'N/A')
                    }
                
                # Add doctor details
                doctor = users_collection.find_one({'_id': appointment['doctor_id']})
                if doctor:
                    appointment['doctor'] = {
                        'id': str(doctor['_id']),
                        'name': doctor.get('full_name', 'Unknown'),
                        'email': doctor.get('email', 'N/A'),
                        'specialization': doctor.get('specialization', 'N/A')
                    }
                
                # Convert ObjectIds
                appointment['patient_id'] = str(appointment['patient_id'])
                appointment['doctor_id'] = str(appointment['doctor_id'])
            
            return JsonResponse({
                'confirmed': appointments,
                'pending': pending
            })
            
        except Exception as e:
            print(f"Error retrieving appointments: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only GET method is allowed'}, status=405)

@csrf_exempt
def get_pending_appointments(request):
    """Get all pending appointments (for admin or hospital staff)"""
    if request.method == 'GET':
        try:
            # Get all pending appointments
            appointments = list(temp_appointments_collection.find())
            
            result = []
            # Process appointments
            for appointment in appointments:
                appointment['_id'] = str(appointment['_id'])
                del appointment['_id'] 

                
                result.append(appointment)
            
            return JsonResponse({
                "status": "success",
                'appointments': result
            })
            
        except Exception as e:
            print(f"Error retrieving pending appointments: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only GET method is allowed'}, status=405)

@csrf_exempt
def search_appointment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            search_query = data.get("query", "").strip()
            
            if not search_query:
                return JsonResponse({"status": "error", "message": "Search query is required"}, status=400)
            
            # Search for approved appointments by patient email
            appointments = list(appointments_collection.find({"patientEmail": search_query, "status": "approved"}))
            
            if appointments:
                for appt in appointments:
                    appt["_id"] = str(appt["_id"])  # Convert ObjectId to string
                return JsonResponse({"status": "success", "appointments": appointments})
            
            return JsonResponse({"status": "error", "message": "No approved appointments found"}, status=404)
        
        except json.JSONDecodeError:
            return JsonResponse({"status": "error", "message": "Invalid JSON data"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)




@csrf_exempt
def create_appointment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ["patientEmail", "department", "appointmentDate", "appointmentTime", "doctorEmail", "symptoms"]
            if not all(field in data and data[field] for field in required_fields):
                return JsonResponse({"status": "error", "message": "All fields are required"}, status=400)
            
            
            # Prepare appointment data
            appointment_data = {
                "patientName": data.get("patientName", "undefined"),  # Default if not provided
                "patientEmail": data["patientEmail"],
                "department": data["department"],
                "appointmentDate": data["appointmentDate"],
                "requestedTime": data["appointmentTime"],  # Change key to match requestedTime
                "symptoms": data["symptoms"],
                "doctorEmail": data["doctorEmail"],
                "doctorName": data.get("doctorName", ""),  # Default if not provided
                "status": "pending",  # Default status
                "createdAt": datetime.now()
            }
            
            # Insert into MongoDB
            result = appointments_collection.insert_one(appointment_data)

            
            # For doctor
            doctor_notification = {
                'email': data["doctorEmail"],
                'title': 'New Appointment Scheduled',
                'message': f'An appointment has been scheduled with you.',
                'appointment_id': str(result.inserted_id),  
                'read': False,
                'created_at': datetime.now()
            }
            notifications_collection.insert_one(doctor_notification)
            
            # Send email notifications
            if data.get('email'):
                subject = 'Appointment Scheduled'
                body = f"""
                Dear {data.get('patientName')},
                
                An appointment has been scheduled for you:
                
                Doctor: {data.get('doctorName')}
                Date: {data.get('appointmentDate')}
                Time: {data.get('appointmentTime')} 
                Purpose: {data.get('symptoms')}
                
                Please arrive 15 minutes before your scheduled time.
                
                Regards,
                HMS Healthcare
                """
            
            return JsonResponse({"status": "success", "message": "Appointment created successfully!", "appointmentId": str(result.inserted_id)})
        
        except json.JSONDecodeError:
            return JsonResponse({"status": "error", "message": "Invalid JSON data"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)


@csrf_exempt
def get_doctor_appointments(request):
    """Get appointments for a specific doctor on a specific date"""
    if request.method == 'GET':
        try:
            doctor_id = request.GET.get('doctor_id')
            date = request.GET.get('date')
            
            if not doctor_id:
                return JsonResponse({'error': 'Doctor ID is required'}, status=400)
            
            query = {'doctor_id': ObjectId(doctor_id)}
            if date:
                query['date'] = date
            
            # Get confirmed appointments
            confirmed = list(appointments_collection.find(query))
            
            # Get pending appointments
            pending = list(temp_appointments_collection.find(query))
            
            # Process appointments
            all_appointments = []
            for appointment in confirmed + pending:
                # Convert ObjectIds to strings
                appointment['_id'] = str(appointment['_id'])
                appointment['patient_id'] = str(appointment['patient_id'])
                appointment['doctor_id'] = str(appointment['doctor_id'])
                
                # Add patient details
                patient = users_collection.find_one({'_id': ObjectId(appointment['patient_id'])})
                if patient:
                    appointment['patient'] = {
                        'name': patient.get('full_name', 'Unknown'),
                        'contact': patient.get('contact', 'N/A')
                    }
                
                all_appointments.append(appointment)
            
            return JsonResponse({
                'appointments': all_appointments,
                'count': len(all_appointments)
            })
            
        except Exception as e:
            print(f"Error retrieving doctor appointments: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only GET method is allowed'}, status=405)

@csrf_exempt
def save_prescription(request):
    """Save prescription details for an appointment"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            appointment_id = data.get('appointment_id')
            diagnosis = data.get('diagnosis')
            medications = data.get('medications', [])
            instructions = data.get('instructions')
            next_visit = data.get('next_visit')
            
            if not appointment_id:
                return JsonResponse({'error': 'Appointment ID is required'}, status=400)
            
            # Find the appointment
            appointment = appointments_collection.find_one({'_id': ObjectId(appointment_id)})
            if not appointment:
                return JsonResponse({'error': 'Appointment not found'}, status=404)
            
            # Create prescription
            prescription = {
                'appointment_id': ObjectId(appointment_id),
                'patient_id': appointment['patient_id'],
                'doctor_id': appointment['doctor_id'],
                'diagnosis': diagnosis,
                'medications': medications,
                'instructions': instructions,
                'next_visit': next_visit,
                'created_at': datetime.now(),
                'issued_date': datetime.now().strftime('%Y-%m-%d')
            }
            
            # Save prescription
            result = prescriptions_collection.insert_one(prescription)
            
            # Update appointment status
            appointments_collection.update_one(
                {'_id': ObjectId(appointment_id)},
                {'$set': {'status': 'completed'}}
            )
            
            # Get patient details for notification
            patient = users_collection.find_one({'_id': appointment['patient_id']})
            if patient:
                # Create notification
                notification = {
                    'user_id': appointment['patient_id'],
                    'title': 'New Prescription Available',
                    'message': 'Your doctor has issued a new prescription. Please check the details in your prescription section.',
                    'read': False,
                    'created_at': datetime.now()
                }
                notifications_collection.insert_one(notification)
                
                # Send email notification
                if patient.get('email'):
                    subject = 'New Prescription Available'
                    body = f"""
                    Dear {patient.get('full_name')},
                    
                    Your doctor has issued a new prescription after your recent appointment.
                    
                    Please log in to the system to view your prescription details.
                    
                    Diagnosis: {diagnosis}
                    
                    Regards,
                    HMS Healthcare
                    """
            
            return JsonResponse({
                'success': True,
                'prescription_id': str(result.inserted_id),
                'message': 'Prescription saved successfully'
            })
            
        except Exception as e:
            print(f"Error saving prescription: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

# @csrf_exempt
# def get_prescriptions(request):
#     """Get prescriptions for a patient or by appointment"""
#     if request.method == 'GET':
#         try:
#             patient_id = request.GET.get('patient_id')
#             appointment_id = request.GET.get('appointment_id')
            
#             if not patient_id and not appointment_id:
#                 return JsonResponse({'error': 'Patient ID or appointment ID is required'}, status=400)
            
#             if patient_id:
#                 query = {'patient_id': ObjectId(patient_id)}
#             else:
#                 query = {'appointment_id': ObjectId(appointment_id)}
            
#             prescriptions = list(# filepath: d:\HMS Major Project\backend\users\appointmentView.py
