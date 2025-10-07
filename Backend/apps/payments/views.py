import razorpay
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

import datetime
from backend.db import payments_collection


# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=("rzp_test_vcajFSq04fkAki", "1z3ak928OOoeZehAR6rcgTxO"))  # Replace with your Razorpay credentials

@csrf_exempt
def create_payment(request):
    """Create Razorpay order for appointment booking"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            amount = data.get("amount")* 100
            patient_email = data.get("patientEmail")
            hospital_name = data.get("hospitalName")

            if not all([amount, patient_email, hospital_name]):
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            # Create Razorpay order
            order = razorpay_client.order.create({
                "amount": amount,  # Amount in rupees
                "currency": "INR",
                "payment_capture": 1,
            })

            return JsonResponse({
                "status": "success",
                "order_id": order["id"],
                "key": "rzp_test_vcajFSq04fkAki",  # Replace with your Razorpay key
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)


@csrf_exempt
def verify_payment(request):
    """Verify Razorpay payment and store details in MongoDB"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            payment_id = data.get("payment_id")
            order_id = data.get("order_id")
            patient_email = data.get("patientEmail")
            hospital_name = data.get("hospitalName")

            if not all([payment_id, order_id, patient_email, hospital_name]):
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            # Fetch payment details from Razorpay
            payment = razorpay_client.payment.fetch(payment_id)

            if payment["status"] == "captured":
                # Store payment details in MongoDB
                payment_data = {
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "amount": payment["amount"] / 100,  # Convert to rupees
                    "patient_email": patient_email,
                    "hospital_name": hospital_name,
                    "created_at": datetime.datetime.now(),
                }
                payments_collection.insert_one(payment_data)

                return JsonResponse({"status": "success", "message": "Payment verified and stored successfully"})
            else:
                return JsonResponse({"status": "error", "message": "Payment not captured"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)


@csrf_exempt
def create_payment_products(request):
    """Create Razorpay order for product purchase"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            amount = data.get("amount") * 100 
            company_name = data.get("companyName")
            hospital_name = data.get("hospitalName")
            product_name = data.get("product_name")
            order_id = data.get("order_id")

            if not all([amount, company_name, hospital_name, product_name, order_id]):
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            # Create Razorpay order
            order = razorpay_client.order.create({
                "amount": amount,
                "currency": "INR",
                "payment_capture": 1,
            })

            return JsonResponse({
                "status": "success",
                "order_id": order["id"],
                "key": "rzp_test_vcajFSq04fkAki",  # Replace with your Razorpay key
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)


@csrf_exempt
def verify_payment_products(request):
    """Verify Razorpay payment for product purchase and store details in MongoDB"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            payment_id = data.get("payment_id")
            order_id = data.get("order_id")
            company_name = data.get("companyName")
            hospital_name = data.get("hospitalName")
            product_name = data.get("product_name")
            quantity = data.get("quantity")
            amount = data.get("amount")

            if not all([payment_id, order_id, company_name, hospital_name, product_name, quantity, amount]):
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

            # Fetch payment details from Razorpay
            payment = razorpay_client.payment.fetch(payment_id)

            if payment["status"] == "captured":
                # Store payment details in MongoDB
                payment_data = {
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "amount": payment["amount"] / 100,  # Convert to rupees
                    "company_name": company_name,
                    "hospital_name": hospital_name,
                    "product_name": product_name,
                    "quantity": quantity,
                    "created_at": datetime.datetime.now(),
                }
                payments_collection.insert_one(payment_data)

                return JsonResponse({"status": "success", "message": "Payment verified and stored successfully"})
            else:
                return JsonResponse({"status": "error", "message": "Payment not captured"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)

