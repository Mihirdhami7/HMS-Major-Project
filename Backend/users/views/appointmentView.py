from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import EmailMultiAlternatives
import json
from datetime import datetime
from bson.objectid import ObjectId

from pymongo import MongoClient
import backend.settings as settings

try:
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DATABASE]

    users_collection = db["users"]
    temp_appointments_collection = db["temp_appointments"]
    appointments_collection = db["appointments"]
    notifications_collection = db["notifications"]

    prescriptions_collection = db["prescriptions"]

    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}")

@csrf_exempt
def book_appointment(request):
    """Endpoint for patients to request appointments"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ["patientName", "patientEmail", "symptoms",
                            "department", "appointmentDate", "requestedTime", "doctorEmail", "doctorName"]

            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                return JsonResponse({
                    "status": "error",
                    "message": f"Missing required fields: {', '.join(missing_fields)}"
                }, status=400)
            
            # Validate appointment date (ensure it's not in the past)
            try:
                appointment_date = datetime.strptime(data["appointmentDate"], "%Y-%m-%d").date()
                current_date = datetime.now().date()
                
                if appointment_date < current_date:
                    return JsonResponse({
                        "status": "error",
                        "message": "Appointment date cannot be in the past"
                    }, status=400)
            except ValueError:
                return JsonResponse({
                    "status": "error",
                    "message": "Invalid date format. Use YYYY-MM-DD."
                }, status=400)

            appointment_request = {
                "patientId": data.get("patientId"),
                "patientName": data.get("patientName"),
                "patientEmail": data.get("patientEmail"),
                "department": data.get("department"),
                "appointmentDate": data.get("appointmentDate"),
                "requestedTime": data.get("requestedTime"),
                "symptoms": data.get("symptoms", "") or "",
                "doctorEmail": data.get("doctorEmail"),
                "doctorName": data.get("doctorName"),
                "status": "pending",
                "createdAt": datetime.now()
            }
            
            # Store in temporary collection pending admin approval
            result = temp_appointments_collection.insert_one(appointment_request)
            
            # Notify admin about the new appointment request
            admin_notification = {
                "userType": "admin",
                "title": "New Appointment Request",
                "message": f"New appointment request from {data.get('patientName')} for {data.get('department')}",
                "read": False,
                "createdAt": datetime.now()
            }
            notifications_collection.insert_one(admin_notification)
            
            return JsonResponse({
                "status": "success",
                "message": "Appointment request submitted successfully. You will be notified when it's approved.",
            }, status=201)
            
        except Exception as e:
            print(f"Error in book_appointment: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message":  f"Failed to book appointment: {str(e)}"
            }, status=500)
            
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def search_appointment(request):
    """Search appointments by ID or patient information"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            query = data.get("query")
            
            if not query:
                return JsonResponse({
                    "status": "error",
                    "message": "Search query is required"
                }, status=400)
            
            results = []
            
            # Try to search by appointment ID
            if ObjectId.is_valid(query):
                appointment = appointments_collection.find_one({"_id": ObjectId(query)})
                if appointment:
                    appointment["id"] = str(appointment["_id"])
                    del appointment["_id"]
                    results.append(appointment)

                # Search by ID in pending appointments
                pending = temp_appointments_collection.find_one({"_id": ObjectId(query)})
                if pending:
                    pending["id"] = str(pending["_id"])
                    del pending["_id"]
                    results.append(pending)
            
            # Search by patient email in both collections
            email_query = {"patientEmail": {"$regex": query, "$options": "i"}}
            
            # Get results from approved appointments collection
            approved_appointments = list(appointments_collection.find(email_query))
            for appointment in approved_appointments:
                appointment["id"] = str(appointment["_id"])
                del appointment["_id"]
                results.append(appointment)
            
            # Get results from pending appointments collection
            pending_appointments = list(temp_appointments_collection.find(email_query))
            for appointment in pending_appointments:
                appointment["id"] = str(appointment["_id"])
                del appointment["_id"]
                results.append(appointment)
            
            if results:
                return JsonResponse({
                    "status": "success",
                    "appointments": results
                })
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "No appointments found"
                }, status=404)
            
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def create_appointment(request):
    """Create a new appointment by admin"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            required_fields = ["patientEmail", "department", "appointmentDate", "appointmentTime"]
            
            # Validate required fields
            for field in required_fields:
                if not data.get(field):
                    return JsonResponse({
                        "status": "error",
                        "message": f"{field} is required"
                    }, status=400)
            
            # Get patient info
            patient = users_collection.find_one({"email": data["patientEmail"]})
            if not patient:
                return JsonResponse({
                    "status": "error",
                    "message": "Patient not found"
                }, status=404)
            
            # Get doctor info if provided
            doctor_email = data.get("doctorEmail")
            doctor_name = None
            if doctor_email:
                doctor = users_collection.find_one({"email": doctor_email})
                if doctor:
                    doctor_name = doctor.get("name")
            
            # Create new appointment directly in the appointments collection
            new_appointment = {
                "patientId": str(patient["_id"]),
                "patientName": patient.get("name", ""),
                "patientEmail": patient.get("email"),
                "department": data["department"],
                "appointmentDate": data["appointmentDate"],
                "confirmedDate": data["appointmentDate"],  # Direct assignment
                "requestedTime": data["appointmentTime"],
                "confirmedTime": data["appointmentTime"],  # Direct assignment
                "doctorEmail": doctor_email if doctor_email else None,
                "doctorName": doctor_name if doctor_name else None,
                "symptoms": data.get("symptoms", ""),
                "status": "approved",  # Admin-created appointments are automatically approved
                "createdAt": datetime.now(),
                "approvedAt": datetime.now(),
                "approvedBy": "admin",
                "createdBy": "admin"
            }
            
            # Insert the appointment
            result = appointments_collection.insert_one(new_appointment)
            
            # Create notification for the patient
            notification = {
                "userId": str(patient["_id"]),
                "title": "New Appointment Scheduled",
                "message": f"An appointment has been scheduled for you on {data['appointmentDate']} at {data['appointmentTime']}.",
                "read": False,
                "createdAt": datetime.now()
            }
            notifications_collection.insert_one(notification)
            
            # Send email notification
            try:
                send_email(
                    to_email=patient.get("email"),
                    subject="New Appointment Scheduled",
                    body=f"""
                    Hello {patient.get('name')},
                    
                    An appointment has been scheduled for you:
                    
                    Date: {data['appointmentDate']}
                    Time: {data['appointmentTime']}
                    Department: {data['department']}
                    
                    Please arrive 15 minutes before your scheduled time.
                    
                    Best regards,
                    The Healthcare Team
                    """
                )
            except Exception as e:
                print(f"Failed to send email notification: {e}")
            
            return JsonResponse({
                "status": "success",
                "message": "Appointment created successfully",
                "appointmentId": str(result.inserted_id)
            })
            
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def get_appointments(request, user_id):
    if request.method == "GET":
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return JsonResponse({"status": "error", "message": "User not found"}, status=404)

            query = {}
            if user["userType"] == "Admin":
                query = {}  # Fetch all appointments
            elif user["userType"] == "Doctor":
                query = {"doctorId": user_id, "status": "Approved"}
            elif user["userType"] == "Patient":
                query = {"patientId": user_id}

            appointments = list(appointments_collection.find(query))
            for appointment in appointments:
                appointment["_id"] = str(appointment["_id"])
                appointment["doctorId"] = str(appointment["doctorId"])
                appointment["patientId"] = str(appointment["patientId"])

            return JsonResponse({"status": "success", "appointments": appointments})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_pending_appointments(request):
    if request.method == "GET":
        try:
            appointments = temp_appointments_collection.find({"status": "pending"})

            appointment_list = []
            for appointment in appointments:
                # Convert MongoDB ObjectId to string
                appointment_obj = {
                    "id": str(appointment["_id"]),
                    "patientId": appointment.get("patientId", ""),
                    "patientName": appointment.get("patientName", ""),
                    "patientEmail": appointment.get("patientEmail", ""),

                    "department": appointment.get("department", ""),
                    "appointmentDate": appointment.get("appointmentDate", ""),
                    "requestedTime": appointment.get("requestedTime", ""),
                    "symptoms": appointment.get("symptoms", ""),
                    
                    "doctorEmail": appointment.get("doctorEmail", ""),
                    "doctorName": appointment.get("doctorName", ""),

                    "status": appointment.get("status", ""),
                    "createdAt": appointment.get("createdAt", "").isoformat() if appointment.get("createdAt") else ""
                }
                appointment_list.append(appointment_obj)

            return JsonResponse({"status": "success", "appointments": appointment_list})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def approve_appointment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            appointment_id = data.get("appointmentId")
            accept_patient_time = data.get("acceptPatientTime", True)
            accept_patient_date = data.get("acceptPatientDate", True)
            

            if not appointment_id:
                return JsonResponse({
                    "status": "error",
                    "message": "Appointment ID is required"
                }, status=400)
            
            # Find the pending appointment
            temp_appointment = temp_appointments_collection.find_one({"_id": ObjectId(appointment_id)})

            if not temp_appointment:
                return JsonResponse({"status": "error", "message": "Appointment not found"}, status=404)

            update_data = {
                "status": "approved",
                "approvedBy": "admin",
                "approvedAt": datetime.now()
            }

             
            # Track whether the appointment details were changed
            is_date_changed = False
            is_time_changed = False
            

            # Handle date assignment
            if accept_patient_date:
                # Keep the patient's requested date
                update_data["confirmedDate"] = temp_appointment.get("appointmentDate")
            else:
                # Use admin's provided date
                admin_date = data.get("dateSlot")
                if not admin_date:
                    return JsonResponse({
                        "status": "error",
                        "message": "Date slot is required when changing the appointment date"
                    }, status=400)
                update_data["confirmedDate"] = admin_date
                is_date_changed = True
            
            # Handle time slot assignment
            if accept_patient_time:
                # Keep the patient's requested time
                update_data["confirmedTime"] = temp_appointment.get("requestedTime")
            else:
                # Use admin's provided time
                admin_time = data.get("timeSlot")
                if not admin_time:
                    return JsonResponse({
                        "status": "error",
                        "message": "Time slot is required when changing the appointment time"
                    }, status=400)
                update_data["confirmedTime"] = admin_time
                is_time_changed = True
            
            # Copy the temp appointment data to appointments collection
            appointment_data = temp_appointment.copy()
            appointment_data.pop("_id", None)  # Remove the original ID

            appointment_data.update(update_data)

            result = appointments_collection.insert_one(appointment_data)

            if not result.inserted_id:
                return JsonResponse({
                    "status": "error",
                    "message": "Failed to create approved appointment"
                }, status=500)
                
            # Delete from temporary collection after approval
            temp_appointments_collection.delete_one({"_id": ObjectId(appointment_id)})

            # Get patient details for notification
            patient_id = temp_appointment.get("patientId")
            patient_email = temp_appointment.get("patientEmail")
            patient_name = temp_appointment.get("patientName")
            
            # The date to use in notifications (either original or admin-provided)
            display_date = update_data.get("confirmedDate", temp_appointment.get("appointmentDate"))
            display_time = update_data.get("confirmedTime", temp_appointment.get("requestedTime"))


            # Original requested date/time
            original_date = temp_appointment.get("appointmentDate")
            original_time = temp_appointment.get("requestedTime")
            # Create notification for the patient
            notification = {
                "userId": patient_id,
                "title": "Appointment Approved",
                "message": f"Your appointment for {display_date} at {display_time} has been approved.",
                "read": False,
                "createdAt": datetime.now()
            }
            notifications_collection.insert_one(notification)

            try:
                if not settings.EMAIL_HOST_USER:
                    raise ValueError("EMAIL_HOST_USER is not configured in settings.")
                
                if is_date_changed or is_time_changed:
                    appointment_body=f"""
                            Hello {patient_email},

                            Sorry your appointment has been rescheduled, please find the new details below:

                            Original Request:
                            Date: {original_date}
                            Time: {original_time}
                            
                            Approved Schedule:
                                Date: {display_date} {"(changed)" if is_date_changed else ""}
                                Time: {display_time} {"(changed)" if is_time_changed else ""}
                                Department: {temp_appointment.get('department')}
                                Doctor: {temp_appointment.get('doctorName')}

                                Please note the schedule changes and arrive 15 minutes before your scheduled time.
                                If this new schedule doesn't work for you, please contact us immediately.

                                Best regards,
                                The Healthcare Team
                            """
                    email_subject = "Appointment Approved with Schedule Change"


                else:
                    appointment_body = f"""
                        Hello {patient_name},

                        Good news! Your appointment request has been approved as requested.

                        Date: {display_date}
                        Time: {display_time}
                        Department: {temp_appointment.get('department')}
                        Doctor: {temp_appointment.get('doctorName')}

                        Please arrive 15 minutes before your scheduled time.

                        Best regards,
                        The Healthcare Team
                    """
                    email_subject = "Appointment Approved"

                # Send email
                email_message = EmailMultiAlternatives(
                    subject=email_subject,
                    body=appointment_body,
                    from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
                    to=[patient_email],
                )
                email_message.send(fail_silently=False)

                print(f"message sent successfully to {patient_email}")

            except Exception as e:
                print(f"Error sending email: {str(e)}")
                import traceback
                print(traceback.format_exc())
            
            return JsonResponse({
                "status": "success",
                "message": "Appointment approved successfully",
                "appointmentId": str(result.inserted_id)
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_doctor_appointments(request):
    """Get appointments for a doctor using their email"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            doctor_email = data.get("doctorEmail")
            
            if not doctor_email:
                return JsonResponse({
                    "status": "error",
                    "message": "Doctor email is required"
                }, status=400)
            
            # Find appointments for this doctor that have been approved
            appointments = list(appointments_collection.find({
                "doctorEmail": doctor_email,
                "status": "approved"
            }).sort("appointmentDate", -1))  # Sort by date, newest first
            
            # Format appointments for frontend
            formatted_appointments = []
            for appointment in appointments:
                appointment_obj = {
                    "id": str(appointment["_id"]),
                    "patientId": appointment.get("patientId", ""),
                    "patientName": appointment.get("patientName", ""),
                    "patientEmail": appointment.get("patientEmail", ""),
                    "department": appointment.get("department", ""),
                    "appointmentDate": appointment.get("confirmedDate", appointment.get("appointmentDate", "")),
                    "appointmentTime": appointment.get("confirmedTime", appointment.get("requestedTime", "")),
                    "symptoms": appointment.get("symptoms", ""),
                    "doctorName": appointment.get("doctorName", ""),
                    "status": appointment.get("status", ""),
                    "hasPrescription": appointment.get("hasPrescription", False),
                    "createdAt": appointment.get("createdAt", "").isoformat() if appointment.get("createdAt") else ""
                }
                formatted_appointments.append(appointment_obj)
            
            return JsonResponse({
                "status": "success", 
                "appointments": formatted_appointments
            })
            
        except Exception as e:
            print(f"Error fetching doctor appointments: {str(e)}")
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)
    
    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def save_prescription(request):
    """API endpoint to save prescription data from doctor"""
    if request.method == "POST":
        try:
            # Check if the request includes a file upload
            if request.content_type and 'multipart/form-data' in request.content_type:
                prescription_data_json = request.POST.get('prescriptionData')
                if not prescription_data_json:
                    return JsonResponse({
                        "status": "error", 
                        "message": "Missing prescription data"
                    }, status=400)
                
                # Parse JSON data
                prescription_data = json.loads(prescription_data_json)
                
                # Handle report file upload if present
                report_file = request.FILES.get('reportFile')
                if report_file:
                    # Create a unique filename with patient email and timestamp
                    file_path = f"reports/{prescription_data['patientEmail'].replace('@', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{report_file.name}"
                    # file_path = default_storage.save(file_path, ContentFile(report_file.read()))
                    # prescription_data['reportFilePath'] = default_storage.url(file_path)
            else:
                # Regular JSON data without file
                prescription_data = json.loads(request.body)
            
            # Convert datetime strings to datetime objects
            if 'createdAt' in prescription_data and isinstance(prescription_data['createdAt'], str):
                try:
                    prescription_data['createdAt'] = datetime.fromisoformat(prescription_data['createdAt'].replace('Z', '+00:00'))
                except ValueError:
                    prescription_data['createdAt'] = datetime.now()
            else:
                prescription_data['createdAt'] = datetime.now()
                
            prescription_data['lastUpdated'] = datetime.now()
            
            # Ensure proper format for MongoDB
            # Convert any ObjectId strings to ObjectId if needed
            if prescription_data.get('appointmentId') and isinstance(prescription_data['appointmentId'], str):
                try:
                    prescription_data['appointmentId'] = ObjectId(prescription_data['appointmentId'])
                except:
                    # If the conversion fails, keep it as string
                    pass

            # Insert prescription data into MongoDB
            result = prescriptions_collection.insert_one(prescription_data)
            
            if not result.inserted_id:
                return JsonResponse({
                    "status": "error",
                    "message": "Failed to save prescription data"
                }, status=500)
            
            # If we have a patient email, update their profile with prescription reference
            if prescription_data.get('patientEmail'):
                users_collection.update_one(
                    {"email": prescription_data['patientEmail'], "userType": "Patient"},
                    {"$push": {"prescriptions": str(result.inserted_id)}}
                )
                
            # Create notification for patient
            notification = {
                "userType": "patient",
                "email": prescription_data['patientEmail'],
                "title": "New Prescription",
                "message": f"Dr. {prescription_data.get('doctorName', 'Your doctor')} has created a new prescription for you.",
                "read": False,
                "createdAt": datetime.now()
            }
            
            notifications_collection.insert_one(notification)
            
            # Send email notification to patient
            try:
                send_email(
                    to_email=prescription_data['patientEmail'],
                    subject="New Prescription Available",
                    body=f"""
                    Hello {prescription_data.get('patientName', 'Patient')},
                    
                    Dr. {prescription_data.get('doctorName', 'Your doctor')} has created a new prescription for you.
                    
                    You can view your prescription in your patient portal.
                    
                    Best regards,
                    The Healthcare Team
                    """
                )
            except Exception as e:
                print(f"Failed to send prescription notification email: {e}")
                
            return JsonResponse({
                "status": "success",
                "message": "Prescription saved successfully",
                "prescriptionId": str(result.inserted_id)
            })
            
        except Exception as e:
            print(f"Error saving prescription: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return JsonResponse({
                "status": "error", 
                "message": f"Failed to save prescription: {str(e)}"
            }, status=500)
    
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)

# Helper function to convert ObjectIds to strings in a document
def convert_object_ids(document):
    if document and "_id" in document:
        document["_id"] = str(document["_id"])
    return document

@csrf_exempt
def get_prescriptions(request):
    """API endpoint to fetch prescriptions for pharmacy management"""
    if request.method == "GET":
        # Return all prescriptions
        try:
            prescriptions = list(prescriptions_collection.find().sort("createdAt", -1))
            # Convert ObjectId to string for JSON serialization
            for prescription in prescriptions:
                convert_object_ids(prescription)
                if "appointmentId" in prescription and isinstance(prescription["appointmentId"], ObjectId):
                    prescription["appointmentId"] = str(prescription["appointmentId"])
            
            return JsonResponse({
                "status": "success",
                "prescriptions": prescriptions
            })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": f"Error fetching prescriptions: {str(e)}"
            }, status=500)
    
    return JsonResponse({
        "status": "error",
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def update_appointment_status(request):
    """Update appointment status after prescription is created"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            appointment_id = data.get("appointmentId")
            has_prescription = data.get("hasPrescription", False)
            
            if not appointment_id:
                return JsonResponse({
                    "status": "error", 
                    "message": "Appointment ID is required"
                }, status=400)
            
            # Update appointment with prescription status
            result = appointments_collection.update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": {
                    "hasPrescription": has_prescription,
                    "updatedAt": datetime.now()
                }}
            )
            if result.modified_count > 0:
                return JsonResponse({
                    "status": "success", 
                    "message": "Appointment status updated successfully"
                })
            else:
                return JsonResponse({
                    "status": "error", 
                    "message": "Appointment not found or no changes made"
                }, status=404)
                
        except Exception as e:
            print(f"Error updating appointment status: {str(e)}")
            return JsonResponse({
                "status": "error", 
                "message": f"Failed to update appointment status: {str(e)}"
            }, status=500)
    
    return JsonResponse({
        "status": "error", 
        "message": "Method not allowed"
    }, status=405)

def send_email(to_email, subject, body):
    """Send email notifications"""
    try:
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=f'HMS Team <{settings.EMAIL_HOST_USER}>',
            to=[to_email],
        )
        email_message.send(fail_silently=False)
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False