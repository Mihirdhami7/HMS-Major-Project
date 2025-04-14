from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from bson.objectid import ObjectId

# Import MongoDB collections from a central location
from users.views import departments_collection, hospitals_collection, products_collection

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