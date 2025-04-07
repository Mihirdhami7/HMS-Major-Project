# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# import json
# from datetime import datetime
# from bson.objectid import ObjectId

# # Import MongoDB collections from a central location
# from users.views import departments_collection, hospitals_collection, products_collection

# @csrf_exempt
# def get_products(request):
#     if request.method == "GET":
#         try:

#             # Get query parameters (if any)
#             hospital_name = request.GET.get('hospitalName')
#             department_id = request.GET.get('departmentId')

#             # Build the query filter
#             query_filter = {}
#             if hospital_name:
#                 query_filter['hospitalId'] = ObjectId(hospital_name)
#             if department_id:
#                 query_filter['departmentId'] = ObjectId(department_id)

#             products = list(products_collection.find({}))

#             for product in products:
#                 "id": str(product["_id"]),
#                 "name": product.get("name", ""),
#                 "description": product.get("description", ""),
#                 "price": product.get("price", 0),
#                 "quantity": product.get("quantity", 0),
#                 "hospitalId": str(product.get("hospitalId", "")),
#                 "departmentId": str(product.get("departmentId", "")),
#                 "createdAt": product.get("createdAt", ""),
#                 "updatedAt": product.get("updatedAt", "")

#             return JsonResponse({"status": "success", "products": products})

#         except Exception as e:
#             return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
#     return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)