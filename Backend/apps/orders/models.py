from datetime import datetime
from typing import Optional, List, Dict, Any

class ProductDocument:
    """Product document schema and helper methods (MongoDB aligned)"""

    @staticmethod
    def create(
        product_name: str,
        product_type: str,
        price_per_strip: float,
        stock: int,
        supplier_company: str,
        hospital_name: str,
        is_approved: bool = False,
        *,
        department: Optional[str] = "",
        description: Optional[str] = "",
        expiry_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Create product document with auto status logic"""
        return {
            "product_name": product_name,
            "product_type": product_type,
            "price_per_strip": price_per_strip,
            "stock": stock,
            "supplier_company": supplier_company,
            "hospitalName": hospital_name,
            "department": department or "",
            "description": description or "",
            "status": ProductDocument._calculate_status(stock),
            "expiry_date": expiry_date,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_approved": is_approved or False,
            "approved_at": None,
            "approved_by": None,
        }

    @staticmethod
    def update(
        stock: Optional[int] = None,
        product_name: Optional[str] = None,
        product_type: Optional[str] = None,
        price_per_strip: Optional[float] = None,
        supplier_company: Optional[str] = None,
        hospital_name: Optional[str] = None,
        department: Optional[str] = None,
        description: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        is_approved: Optional[bool] = None,
        approved_by: Optional[str] = None,

    ) -> Dict[str, Any]:
        """Generate update data for product with auto status recalculation"""
        now = datetime.utcnow()
        data: Dict[str, Any] = {"updated_at": now}

        if product_name is not None:
            data["product_name"] = product_name
        if product_type is not None:
            data["product_type"] = product_type
        if price_per_strip is not None:
            data["price_per_strip"] = price_per_strip
        if supplier_company is not None:
            data["supplier_company"] = supplier_company
        if hospital_name is not None:
            data["hospitalName"] = hospital_name
        if department is not None:
            data["department"] = department
        if description is not None:
            data["description"] = description
        if expiry_date is not None:
            data["expiry_date"] = expiry_date
        if stock is not None:
            data["stock"] = stock
            data["status"] = ProductDocument._calculate_status(stock)
        if is_approved is not None:
            data["is_approved"] = is_approved
            if is_approved:
                data["approved_at"] = now
                data["approved_by"] = approved_by
            else:
                data["approved_at"] = None
                data["approved_by"] = None

        return data

    @staticmethod
    def _calculate_status(stock: int) -> str:
        if stock <= 0:
            return "Out of Stock"
        elif stock < 40:
            return "Low Stock"
        else:
            return "In Stock"

class OrderDocument:

    ORDER_STATUS = ("requested", "processing", "completed", "cancelled")

    @staticmethod
    def create(
        product_id: str,
        product_name: str,
        product_type: str,
        supplier_company: str,  
        hospital_name: str,
        quantity: int,
        price_per_strip: float,
        *,
        ordered_by: Optional[str] = None,
        department: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        notes: str = "",
        status: str = "requested",
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        total_price = quantity * price_per_strip

        if status not in OrderDocument.ORDER_STATUS:
            status = "requested"

        return {
            "order_date": now,           
            "product_id": product_id,
            "product_name": product_name,
            "product_type": product_type,
            "expiry_date": expiry_date,

            "hospitalName": hospital_name,
            "department": department,
            "supplier_company": supplier_company,
            "quantity_ordered": quantity,
            "quantity_fulfilled": 0,
            "price_per_strip": price_per_strip,
            "total_price": total_price,
            "status": status,
            "notes": notes,

            "ordered_by": ordered_by,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }

    @staticmethod
    def update(
        quantity_fulfilled: Optional[int] = None,
        status: Optional[str] = None,
        price_per_strip: Optional[float] = None,
        expiry_date: Optional[datetime] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        data: Dict[str, Any] = {"updated_at": now}

        if quantity_fulfilled is not None:
            data["quantity_fulfilled"] = quantity_fulfilled

        if price_per_strip is not None:
            data["price_per_strip"] = price_per_strip
        if expiry_date is not None:
            data["expiry_date"] = expiry_date

        if notes is not None:
            data["notes"] = notes

        if status is not None:
            if status in OrderDocument.ORDER_STATUS:
                data["status"] = status
                if status == "completed":
                    data["completed_at"] = now

        return data 