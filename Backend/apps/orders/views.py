from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson.objectid import ObjectId

# Import MongoDB collections from a central location
from backend.db import departments_collection, hospitals_collection, products_collection, orders_collection, temp_products_collection

@csrf_exempt
def get_products(request,hospital_name):
    if request.method == "GET":
        try:
            products = list(products_collection.find({"Hospital Name": hospital_name},{"_id": 0}))
            if not products:
                return JsonResponse({"status": "error", "message": "No products found"}, status=404)

            return JsonResponse({"status": "success", "products": products})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def add_product(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ["Product Name", "Product Type", "Price (Per Unit/Strip)", "Stock", "Supplier Info", "Hospital Name"]
            for field in required_fields:
                if field not in data or not data[field]:
                    return JsonResponse({
                        "status": "error",
                        "message": f"Missing required field: {field}"
                    }, status=400)
            
            # Add created_at timestamp and set status to pending
            data["created_at"] = datetime.now()
            data["status"] = "pending" 
            
            # Add description if available
            if "description" in data:
                data["Description"] = data["description"]
                del data["description"] 

            if "Supplier Info" in data:
                data["Supplier Company"] = data["Supplier Info"]
                del data["Supplier Info"]
            
            # Insert the product into the temporary collection for admin approval
            result = temp_products_collection.insert_one(data)
            
            return JsonResponse({
                "status": "success",
                "message": "Product added successfully and waiting for admin approval",
                "product_id": str(result.inserted_id),  
            }, status=201)
            
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
def request_stock(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ["product_name", "product_type", "supplier", "hospital_name", "quantity"]
            for field in required_fields:
                if field not in data:
                    return JsonResponse({"status": "error", "message": f"Missing required field: {field}"}, status=400)
            

            # Add debug print
            print("Received request data:", data)
            print("Price value received:", data.get("price_per_strip"))
            # Create stock request record
            stock_request = {
                "product_name": data["product_name"],
                "productType": data["product_type"], 
                "supplier": data["supplier"],
                "hospital_name": data["hospital_name"],
                "quantity": data["quantity"],
                "price_per_strip": data.get("price_per_strip", 0),
                "status": "requested",
                "created_at": datetime.now()
            }
            
            # Insert into database
            result = orders_collection.insert_one(stock_request)
            
            return JsonResponse({
                "status": "success", 
                "message": "Stock request submitted successfully",
                "request_id": str(result.inserted_id)
            })
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)



@csrf_exempt
def get_new_products(request, hospital_name):
    """
    API endpoint to fetch pending new products from temp_products collection
    GET: Returns all pending products from temp_products collection for a specific hospital
    """
    if request.method == "GET":
        try:
            # Get all products with status "pending" from temp_products collection
            # and filter by hospital name if provided
            query = {"status": "pending"}
            
            # If hospital_name is not "All", add it to the query
            if hospital_name and hospital_name.lower() != "all":
                query["Hospital Name"] = hospital_name
            
            # Fetch the products
            temp_products = list(temp_products_collection.find(query))
            
            # Convert ObjectId to string for JSON serialization
            for product in temp_products:
                if "_id" in product:
                    product["_id"] = str(product["_id"])
                
                # Convert datetime objects to ISO format strings
                if "created_at" in product and isinstance(product["created_at"], datetime):
                    product["created_at"] = product["created_at"].isoformat()
                
                if "Expiry Date" in product and isinstance(product["Expiry Date"], datetime):
                    product["Expiry Date"] = product["Expiry Date"].isoformat()
            
            return JsonResponse({
                "status": "success",
                "message": "New products fetched successfully",
                "products": temp_products
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
def approve_new_product(request, product_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            status = data.get("status")
            hospital_name = data.get("hospital_name")
            
            if not status or not hospital_name:
                return JsonResponse({
                    "status": "error",
                    "message": "Status and hospital name are required"
                }, status=400)
            
            # Find the product in temp_products collection
            product = temp_products_collection.find_one({"_id": ObjectId(product_id)})
            
            if not product:
                return JsonResponse({
                    "status": "error",
                    "message": "Product not found"
                }, status=404)
            
            # Update the status in temp_products collection
            temp_products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": {"status": status}}
            )
            
            # If approved, add to main products collection
            if status == "approved":
                # Convert ObjectId to string before insertion
                product["_id"] = str(product["_id"])
                
                # Create a copy of the product for products collection
                product_copy = dict(product)
                
                # Remove the temp ID before insertion
                if "_id" in product_copy:
                    del product_copy["_id"]
                
                # Add or update approval information
                product_copy["approved_at"] = datetime.now()
                product_copy["approved_by_hospital"] = hospital_name
                
                # Insert into products collection
                result = products_collection.insert_one(product_copy)
                
                return JsonResponse({
                    "status": "success",
                    "message": "Product approved and added to inventory",
                    "product_id": str(result.inserted_id)
                })
            
            return JsonResponse({
                "status": "success",
                "message": f"Product status updated to {status}"
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
def get_stocks_requests_by_supplier(request, companyName):
    if request.method == "GET":
        try:
            if not companyName:
                return JsonResponse({"status": "error", "message": "company name is required"}, status=400)
            
            # Find all stock requests for this hospital
            requests = list(orders_collection.find({"supplier": companyName}))  
            
            # Convert ObjectId to string for JSON serialization
            for request_item in requests:
                if "_id" in request_item:
                    request_item["_id"] = str(request_item["_id"])

            if not requests:
                return JsonResponse({"status": "error", "message": "No requests found"}, status=404)
            
            return JsonResponse({"status": "success", "requests": requests})
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)


@csrf_exempt
def get_stocks_requests_by_hospital(request, hospitalName):
    if request.method == "GET":
        try:
            if not hospitalName:
                return JsonResponse({"status": "error", "message": "company name is required"}, status=400)
            
            # Find all stock requests for this hospital
            requests = list(orders_collection.find({"hospital_name": hospitalName}))  
            
            # Convert ObjectId to string for JSON serialization
            for request_item in requests:
                if "_id" in request_item:
                    request_item["_id"] = str(request_item["_id"])

            if not requests:
                return JsonResponse({"status": "error", "message": "No requests found"}, status=404)
            
            return JsonResponse({"status": "success", "requests": requests})
            
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def get_supplier_products(request, companyName):
    """
    API endpoint to fetch all products for a specific supplier
    GET: Returns all products associated with the supplier
    """
    if request.method == "GET":
        try:
            # Find products by supplier name
            # Look in both "Supplier Info" field (for newer products) and "supplier" field (for older products)
            products = list(products_collection.find({"Supplier Company": companyName}))
            
            # Convert ObjectId to string for JSON serialization
            for product in products:
                if "_id" in product:
                    product["_id"] = str(product["_id"])
                    product["description"] = product.get("Description", "No description available")
            
            # Check if we found any products
            if products:
                return JsonResponse({
                    "status": "success",
                    "products": products,
                    "count": len(products)
                })
            else:
                return JsonResponse({
                    "status": "success",
                    "products": [],
                    "count": 0,
                    "message": f"No products found for company: {companyName}"
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
def fulfill_request(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            request_id = data.get('request_id')
            hospital_name = data.get('hospital_name')
            quantity_fulfilled = int(data.get('quantity_fulfilled', 0))
            notes = data.get('notes', '')
            price_per_strip = float(data.get('price_per_strip', 0))
            expiry_date = data.get('expiry_date', None)
            
            if not request_id or not hospital_name or quantity_fulfilled <= 0:
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)
            
            total_price = quantity_fulfilled * price_per_strip
            stock_request = orders_collection.find_one({"_id": ObjectId(request_id)})

            if not stock_request:
                return JsonResponse({"status": "error", "message": "Stock request not found"}, status=404)
            
            # Create update data
            update_data = {

                "quantity_fulfilled": quantity_fulfilled,
                "expiry_date": expiry_date,
                "fulfillment_notes": notes,
                "total_price": total_price,
                "status": "processing",
                "updated_at": datetime.now()
            }
            
            # Update the request with fulfillment details
            update_result = orders_collection.update_one(
                {"_id": ObjectId(request_id), "hospital_name": hospital_name},
                {"$set": update_data}
            )

            return JsonResponse({
                "status": "success", 
                "message": f"Request fulfilled successfully {update_result}",
                "request_id": request_id,
                "hospital": hospital_name,
                "total_price": total_price
            })
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
        



@csrf_exempt
def complete_order(request, order_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            order_id = order_id
            hospital_name = data.get('hospital_name')
            payment_id = data.get('payment_id')
            
            if not order_id or not hospital_name or not payment_id:
                return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)
            
            # Update the request to mark it as completed
            update_result = orders_collection.update_one(
                {"_id": ObjectId(order_id), "hospital_name": hospital_name},
                {"$set": {"status": "completed"}}
            )

            if update_result.modified_count == 0:
                return JsonResponse({"status": "error", "message": "Request not found or already completed"}, status=404)

            return JsonResponse({
                "status": "success", 
                "message": f"Request marked as completed",
                "hospital": hospital_name
            })
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)