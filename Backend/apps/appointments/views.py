from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import EmailMultiAlternatives
import json
from datetime import datetime
from bson.objectid import ObjectId
import backend.settings as settings

# Import MongoDB collections from views.py
from backend.db import (
    users_collection,
    appointments_collection,
    temp_appointments_collection,
    notifications_collection,
    prescriptions_collection,
    products_collection,
    invoices_collection
)

@csrf_exempt
def book_appointment(request):
    """Book a new appointment (creates temporary appointment pending approval)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            appointment_id = data.get('appointmentId')
            patientName = data.get('patientName')
            patientEmail = data.get('patientEmail')
            department = data.get('department')
            appointmentDate = data.get('appointmentDate')
            requestedTime = data.get('requestedTime')
            symptoms = data.get('symptoms', '')
            doctorEmail = data.get('doctorEmail')
            doctorName = data.get('doctorName')
            hospitalName = data.get('hospitalName')
            paymentId = data.get('paymentId')
            
            
            # Validate required fields
            if not all([patientEmail, doctorEmail, appointmentDate, requestedTime, department, hospitalName, paymentId]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            
        
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
                'hospitalName': hospitalName,
                'paymentId': paymentId,
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
                'status': 'success',
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
            appointment_id = data.get('appointmentId')
            if not appointment_id:
                return JsonResponse({'error': 'Appointment ID is required'}, status=400)
            
            patient_name = data.get('patientName')
            patient_email = data.get('patientEmail')
            doctor_email = data.get('doctorEmail')
            doctor_name = data.get('doctorName')
            hospital_name = data.get('hospitalName')
            department = data.get('department')

            appointment_date = data.get('appointmentDate')
            appointment_time = data.get('appointmentTime')
            dateSlot = data.get('dateSlot')
            timeSlot = data.get('timeSlot')
            status = data.get('status')
            symptoms = data.get('symptoms', '')


            if not patient_name or not patient_email or not doctor_email:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            if status == 'approve':
                
                if(dateSlot != None and timeSlot != None):
                    confrim_date = dateSlot
                    confrim_time = timeSlot
                    message = f"""
                    <html>
                        <body>
                            <h2>Your Appointment Confirmation is done , but the time slot has been reschuled due to certain circumstances</h2>
                            <p>Dear {patient_name},</p>
                            <p>Your appointment has been confirmed with the following details:</p>
                            <ul>

                                <li><strong>Doctor:</strong> Dr. {doctor_name}</li>
                                <li><strong>Department:</strong> {department}</li>
                                <li><strong>Date:</strong> {confrim_date}</li>
                                <li><strong>Time:</strong> {confrim_time}</li>
                                <li><strong>Hospital:</strong> {hospital_name}</li>
                            </ul>
                            <p>Please arrive 15 minutes before your appointment time.</p>
                            <p>If you have any questions, feel free to contact us.</p>
                            <p>Best regards,</p>
                            <p>HMS Healthcare Team</p>
                            <p><small>This is an automated message. Please do not reply.</small></p>
                            <p><small>&copy; {datetime.now().year} {hospital_name}. All rights reserved.</small></p>

                        </body>
                    </html> 
                    """

                    # Send email
                    email_message = EmailMultiAlternatives(
                        subject="HMS - apointment Confirmation",
                        body=message,
                        from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                        to=[patient_email],
                    )
                    email_message.send(fail_silently=False)

                    print(f"appointment approved for {patient_email}")

                else:

                    confrim_date = appointment_date
                    confrim_time = appointment_time
                    message = f"""
                    <html>
                        <body>
                            <h2>Congratulations, Your Appointment Confirmation is approved with your scheduled time and date. </h2>
                            <p>Dear {patient_name},</p>
                            <p>Your appointment has been confirmed with the following details:</p>
                            <ul>

                                <li><strong>Doctor:</strong> Dr. {doctor_name}</li>
                                <li><strong>Department:</strong> {department}</li>
                                <li><strong>Date:</strong> {confrim_date}</li>
                                <li><strong>Time:</strong> {confrim_time}</li>
                                <li><strong>Hospital:</strong> {hospital_name}</li>
                            </ul>
                            <p>Please arrive 15 minutes before your appointment time.</p>
                            <p>If you have any questions, feel free to contact us.</p>
                            <p>Best regards,</p>
                            <p>HMS Healthcare Team</p>
                            <p><small>This is an automated message. Please do not reply.</small></p>
                            <p><small>&copy; {datetime.now().year} {hospital_name}. All rights reserved.</small></p>

                        </body>
                    </html> 
                    """

                    # Send email
                    email_message = EmailMultiAlternatives(
                        subject="HMS - apointment Confirmation",
                        body=message,
                        from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                        to=[patient_email],
                    )
                    email_message.send(fail_silently=False)

                    print(f"appointment approved for {patient_email}")
    
                
                
                # Create appointment in the main collection
                appointment = {
                    'patientEmail': patient_email,
                    'patientName': patient_name,
                    'doctorEmail': doctor_email,
                    'doctorName': doctor_name,
                    'department': department,
                    'appointmentDate': confrim_date,
                    'confirmedTime': confrim_time,
                    'requestedTime': appointment_time,
                    'requestedDate': appointment_date,
                    'symptoms': symptoms,
                    'hospitalName': hospital_name,
                    'status': status,
                    'approved_at': datetime.now()
                }
                
                # Insert the approved appointment
                result = appointments_collection.insert_one(appointment)
                temp_appointments_collection.delete_one({'_id': ObjectId(appointment_id)})
                # Create notifications
                patient_notification = {
                    'userEmail': patient_email,
                    'title': 'Appointment Confirmed',
                    'message': f'Your appointment on {appointment_date} at {appointment_time} with Dr. {doctor_name} has been confirmed.',
                    'read': False,
                    'created_at': datetime.now()
                }
                
               
            elif status == 'reject':
                
                # Create notification for patient about rejection
                message = f"""
                    <html>
                        <body>
                            <h2>Your Appointment has been rejected, beacuse your information seems to be not proper according to your selected department and doctor </h2>
                         
                            <p>If you have any questions, feel free to contact us.</p>
                            <p>Best regards,</p>
                            <p>HMS Healthcare Team</p>
                            <p><small>This is an automated message. Please do not reply.</small></p>
                            <p><small>&copy; {datetime.now().year} {hospital_name}. All rights reserved.</small></p>

                        </body>
                    </html> 
                    """

                    # Send email
                email_message = EmailMultiAlternatives(
                        subject="HMS - apointment Confirmation",
                        body=message,
                        from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                        to=[patient_email],
                    )
                email_message.send(fail_silently=False)

                print(f"appointment approved for {patient_email}")
    


                rejection_notification = {
                    'userEmail': patient_email,
                    'title': 'Appointment Request Rejected',
                    'message': f'Your appointment request has been rejected.',
                    'read': False,
                    'created_at': datetime.now()
                }
                
                notifications_collection.insert_one(rejection_notification)
            
                        
                    
                
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid action. Use "approve" or "reject"'}, status=400)
                
            # Delete from temporary appointments collection in both cases
            temp_appointments_collection.delete_one({'_id': ObjectId(appointment_id)})
            
            return JsonResponse({
                'status': 'success',
                'message': message
            })
            
        except Exception as e:
            print(f"Error processing appointment: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    
    return JsonResponse({'status': 'error', 'message': 'Only POST method is allowed'}, status=405)




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
            hospital_name = request.GET.get('hospitalName')
            if not hospital_name:
                return JsonResponse({'error': 'Hospital name is required'}, status=400)
            
            # Get today's date in YYYY-MM-DD format
            today = datetime.now().strftime('%Y-%m-%d')
             # Get all pending appointments with appointment date >= today
            query = {
                "hospitalName": hospital_name,
                "appointmentDate": {"$gte": today}  # Greater than or equal to today's date
            }
            
            # Get all pending appointments
            appointments = list(temp_appointments_collection.find(query))
            
            result = []
            # Process appointments
            for appointment in appointments:
                appointment['_id'] = str(appointment['_id'])                
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
            patient_email = data.get("email")
            hospital_name = data.get("hospitalName")
            
            if not patient_email or not hospital_name:
                return JsonResponse({"status": "error", "message": "Email and hospital name are required"}, status=400)
            
            # Search for appointments in both collections
            approved_appointments = list(appointments_collection.find({
                "patientEmail": patient_email,
                "hospitalName": hospital_name
            }))
            
            pending_appointments = list(temp_appointments_collection.find({
                "patientEmail": patient_email,
                "hospitalName": hospital_name
            }))
            
            # Convert ObjectIds to strings for JSON serialization
            for appt in approved_appointments:
                appt["_id"] = str(appt["_id"])
                appt["status"] = appt.get("status", "approve")  # Ensure status field exists
            
            for appt in pending_appointments:
                appt["_id"] = str(appt["_id"])
                appt["status"] = "pending"  # Mark all temp appointments as pending
            
            # Combine results
            all_appointments = approved_appointments + pending_appointments
            
            if all_appointments:
                return JsonResponse({
                    "status": "success", 
                    "appointments": all_appointments
                })
            
            return JsonResponse({"status": "error", "message": "No appointments found for this email"}, status=404)
        
        except Exception as e:
            print(f"Error in search_appointment: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)



@csrf_exempt
def create_appointment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            
            # Validate required fields
            required_fields = ["patientEmail", "department", "appointmentDate", "appointmentTime", "doctorEmail", "symptoms", "hospitalName"]
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
                "hospitalName": data.get["hospitalName"],
                "doctorEmail": data["doctorEmail"],
                "doctorName": data.get("doctorName", ""),  # Default if not provided
                "status": "approve",  
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
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            hospital_name = data.get('hospitalName')
            
            if not email:
                return JsonResponse({'error': 'Doctor ID is required'}, status=400)
            
            
            query = {
                'doctorEmail': email,
               
            }
            
            # Add hospital filter if available
            if hospital_name:
                query['hospitalName'] = hospital_name
            
            # Get all appointments for this doctor
            appointments = list(appointments_collection.find(query))
            for appointment in appointments:
                appointment['_id'] = str(appointment['_id'])

            return JsonResponse({
                'appointments': appointments,
                'count': len(appointments),
                'status': 'success'
            })
            
        except Exception as e:
            print(f"Error retrieving doctor appointments: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only GET method is allowed'}, status=405)


@csrf_exempt
def get_hospital_medicines(request):
    try:
        data = json.loads(request.body)
        hospital_name = data.get('hospitalName', '')
        # department = data.get('department', '')
        
        if not hospital_name:
            return JsonResponse({'status': 'error', 'message': 'Hospital name is required'}, status=400)
        
         # Find medicines for this hospital
        query = {"Hospital Name": hospital_name, "Product Type": "Medicine"}
        
        # Only fetch necessary fields for better performance
        projection = {
            "_id": 1,
            "Product Name": 1,
            "Stock": 1,
            "Price (Per Unit/Strip)": 1
        }
        
        # Get medicines from MongoDB collection
        medicines = list(products_collection.find(query, projection))

        processed_medicines = []
        for medicine in medicines:
            medicine['_id'] = str(medicine['_id'])
            # Ensure these fields exist with default values
            if 'Product Name' not in medicine:
                medicine['Product Name'] = 'Unknown Medicine'
            
            if 'Stock' not in medicine:
                medicine['Stock'] = 0
            else:
                try:
                    medicine['Stock'] = int(medicine['Stock'])
                except (ValueError, TypeError):
                    medicine['Stock'] = 0
            
            if 'Price (Per Unit/Strip)' in medicine:
                try:
                    medicine['Price (Per Unit/Strip)'] = float(medicine['Price (Per Unit/Strip)'])
                except (ValueError, TypeError):
                    medicine['Price (Per Unit/Strip)'] = 0.0
            else:
                medicine['Price (Per Unit/Strip)'] = 0.0
                
            processed_medicines.append(medicine)

        
        return JsonResponse({
            'status': 'success',
            'medicines': processed_medicines

        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)










@csrf_exempt
def save_prescription(request):
    """Save prescription details for an appointment"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            patient_email = data.get('patientEmail')
            doctor_email = data.get('doctorEmail')
            appointment_id = data.get('appointmentId')

            # Required validation
            if not patient_email or not doctor_email:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Patient email and doctor email are required'
                }, status=400)
            
            if not appointment_id:
                return JsonResponse({'error': 'Appointment ID is required'}, status=400)
            
            # Create prescription document
            prescription = {
                'patientName': data.get('patientName'),
                'patientEmail': patient_email,
                'patientAge': data.get('patientAge'),
                'patientGender': data.get('patientGender'),
                'patientPhone': data.get('patientPhone'),
                'patientAddress': data.get('patientAddress'),
                
                'doctorName': data.get('doctorName'),
                'doctorEmail': doctor_email,
                'department': data.get('department'),
                'hospitalName': data.get('hospitalName'),
                
                'vitals': data.get('vitals', {}),
                'medicines': data.get('medicines', []),
                'suggestions': data.get('suggestions', ''),
                
                'reportType': data.get('reportType', 'none'),
                'reportValues': data.get('reportValues'),
                
                'appointmentId': appointment_id,  # May be null if not from appointment
                'created_at': datetime.now(),
                'status': 'active'  # Default status
            }
            # Save prescription
            result = prescriptions_collection.insert_one(prescription)
            
            # Update appointment status
            if appointment_id:
                appointments_collection.update_one(
                    {'_id': ObjectId(appointment_id)},
                    {'$set': {'status': 'completed'}}
                )

            # Send email notification to patient
            try:
                message = f"""
                <html>
                    <body>
                        <h2>New Prescription Available</h2>
                        <p>Dear {data.get('patientName')},</p>
                        <p>Dr. {data.get('doctorName')} has created a prescription for you.</p>
                        <p>You can view the details in your HMS account.</p>
                        <p>Best regards,</p>
                        <p>HMS Healthcare Team</p>
                        <p><small>This is an automated message. Please do not reply.</small></p>
                    </body>
                </html>
                """
                
                email_message = EmailMultiAlternatives(
                    subject="HMS - New Prescription Available",
                    body=message,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[patient_email],
                )
                email_message.content_subtype = "html"
                email_message.send(fail_silently=True)
            except Exception as e:
                print(f"Email notification error: {e}")
            
            return JsonResponse({
                'success': True,
                'prescription_id': str(result.inserted_id),
                'message': 'Prescription saved successfully'
            })
            
        except Exception as e:
            print(f"Error saving prescription: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

@csrf_exempt
def get_prescriptions(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            hospital_name = data.get('hospitalName')
            
            if not hospital_name:
                return JsonResponse({'error': 'Hospital name is required'}, status=400)
            
            # Query prescriptions for the hospital
            prescriptions = list(prescriptions_collection.find({'hospitalName': hospital_name, 'status': {'$ne': 'completed'}}))
            
            # Process prescriptions
            for prescription in prescriptions:
                prescription['_id'] = str(prescription['_id'])
                prescription['patientEmail'] = prescription.get('patientEmail', 'N/A')
                prescription['doctorEmail'] = prescription.get('doctorEmail', 'N/A')
                prescription['department'] = prescription.get('department', 'N/A')
                prescription['hospitalName'] = prescription.get('hospitalName', 'N/A')
                prescription['medicines'] = prescription.get('medicines', [])
                prescription['suggestions'] = prescription.get('suggestions', 'N/A')
                prescription['reportType'] = prescription.get('reportType', 'N/A')
                prescription['reportValues'] = prescription.get('reportValues', 'N/A')
                prescription['created_at'] = prescription.get('created_at', 'N/A')

                prescription['appointmentId'] = str(prescription.get('appointmentId', 'N/A'))  # Convert ObjectId to string
                prescription['patientName'] = prescription.get('patientName', 'N/A')
                prescription['patientAge'] = prescription.get('patientAge', 'N/A')
                prescription['patientGender'] = prescription.get('patientGender', 'N/A')
                prescription['patientPhone'] = prescription.get('patientPhone', 'N/A')
                prescription['patientAddress'] = prescription.get('patientAddress', 'N/A')

                prescription['vitals'] = prescription.get('vitals', {})  # Ensure vitals is a dict

            
            return JsonResponse({
                'status': 'success',
                'prescriptions': prescriptions
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def generate_invoice(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract data
            prescription_id = data.get('prescriptionId')
            patient_name = data.get('patientName')
            patient_email = data.get('patientEmail')
            medicines = data.get('medicines', [])
            total_amount = data.get('totalAmount')
            hospital_name = data.get('hospitalName')
            payment_id = data.get('paymentId')
            
            # Create invoice document
            invoice = {
                'prescriptionId': prescription_id,
                'patientName': patient_name,
                'patientEmail': patient_email,
                'medicines': medicines,
                'totalAmount': total_amount,
                'hospitalName': hospital_name,
                'paymentId': payment_id,
                'status': 'generated',
                'created_at': datetime.now()
            }
            
            # Save invoice to database
            result = invoices_collection.insert_one(invoice)

            prescriptions_collection.update_one(
                {'_id': ObjectId(prescription_id)},
                {'$set': {'status': 'completed'}}
            )
            
            
            # Update stock quantities
            for medicine in medicines:
                products_collection.update_one(
                    {'_id': ObjectId(medicine['_id'])},
                    {'$inc': {'Stock': -medicine['quantity']}}
                )
            
            # Send email notification
            try:
                message = f"""
                <html>
                    <body>
                        <h2>Invoice Generated</h2>
                        <p>Dear {patient_name},</p>
                        <p>Your medicine invoice has been generated:</p>
                        <ul>
                            <li>Total Amount: ₹{total_amount}</li>
                            <li>Hospital: {hospital_name}</li>
                        </ul>
                        <p>Please collect your medicines from the pharmacy.</p>
                        <p>Best regards,</p>
                        <p>HMS Healthcare Team</p>
                    </body>
                </html>
                """
                
                email_message = EmailMultiAlternatives(
                    subject="HMS - Medicine Invoice Generated",
                    body=message,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[patient_email]
                )
                email_message.content_subtype = "html"
                email_message.send(fail_silently=True)
            except Exception as e:
                print(f"Email notification error: {e}")
            
            return JsonResponse({
                'status': 'success',
                'invoice_id': str(result.inserted_id),
                'message': 'Invoice generated successfully'
            })
            
        except Exception as e:
            print(f"Error generating invoice: {e}")
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)