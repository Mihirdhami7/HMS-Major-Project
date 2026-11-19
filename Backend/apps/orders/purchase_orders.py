"""
Purchase orders: hospital admin -> supplier stock orders, one order per supplier (batch of items).

Flow
  1. Admin builds a cart of approved hospital products and places it.
     The server groups the cart by supplier and creates ONE order per supplier.
     Prices come from the products (never from the browser).          status: requested
  2. Supplier fulfils the whole order: quantity (<= ordered), price and expiry per item.
     Items can be sent as 0 when not available; at least one item must be sent.  status: processing
     (Supplier may instead decline a requested order.)                 status: cancelled
  3. Admin pays the whole order once with Razorpay (category SUPPLIER_PURCHASE).
     On payment verification the server completes the order and ADDS the delivered
     stock to the hospital products.                                    status: completed

Old orders (one product per document, no "items") are read as one-item orders.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import status

from apps.appointments.models import NotificationDocument
from backend.db import (
    notifications_collection, orders_collection, payments_collection, products_collection, users_collection,
)

logger = logging.getLogger(__name__)

MAX_QTY = 100000
LOW_STOCK = 40
OPEN_STATUSES = ("requested", "processing")


class OrderError(Exception):
    def __init__(self, message, code=status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.code = code


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _oid(value):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None


def _iso(value):
    return value.isoformat() + "Z" if isinstance(value, datetime) else value


def _parse_date(value):
    """'YYYY-MM-DD' (or ISO datetime) -> datetime, None when empty/invalid."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d")
    except ValueError:
        return None


def order_number(doc):
    return doc.get("orderNumber") or f"PO-{str(doc['_id'])[-6:].upper()}"


def order_items(doc):
    """Items of a batch order, or the single product of an old order as one item."""
    if doc.get("items"):
        return doc["items"]
    return [{
        "product_id": doc.get("product_id"),
        "product_name": doc.get("product_name"),
        "product_type": doc.get("product_type"),
        "department": doc.get("department"),
        "quantity_ordered": int(doc.get("quantity_ordered") or 0),
        "quantity_fulfilled": int(doc.get("quantity_fulfilled") or 0),
        "price_per_strip": float(doc.get("price_per_strip") or 0),
        "expiry_date": doc.get("expiry_date"),
    }]


def order_totals(doc):
    items = order_items(doc)
    ordered_qty = sum(int(i.get("quantity_ordered") or 0) for i in items)
    fulfilled_qty = sum(int(i.get("quantity_fulfilled") or 0) for i in items)
    ordered_amount = sum(int(i.get("quantity_ordered") or 0) * float(i.get("price_per_strip") or 0) for i in items)
    fulfilled_amount = sum(int(i.get("quantity_fulfilled") or 0) * float(i.get("price_per_strip") or 0) for i in items)
    fulfilled = doc.get("status") in ("processing", "completed")
    return {
        "items": items,
        "ordered_qty": ordered_qty,
        "fulfilled_qty": fulfilled_qty,
        "ordered_amount": round(ordered_amount, 2),
        # what the hospital pays: delivered quantity once fulfilled, otherwise the estimate
        "amount": round(fulfilled_amount if fulfilled else ordered_amount, 2),
    }


def serialize_order(doc):
    t = order_totals(doc)
    items = [{
        "product_id": i.get("product_id"),
        "product_name": i.get("product_name"),
        "product_type": i.get("product_type"),
        "department": i.get("department"),
        "quantity_ordered": int(i.get("quantity_ordered") or 0),
        "quantity_fulfilled": int(i.get("quantity_fulfilled") or 0),
        "price_per_strip": float(i.get("price_per_strip") or 0),
        "expiry_date": _iso(i.get("expiry_date")),
    } for i in t["items"]]
    return {
        "_id": str(doc["_id"]),
        "orderNumber": order_number(doc),
        "hospitalName": doc.get("hospitalName"),
        "supplier_company": doc.get("supplier_company"),
        "status": doc.get("status") or "requested",
        "items": items,
        "item_count": len(items),
        "total_quantity_ordered": t["ordered_qty"],
        "total_quantity_fulfilled": t["fulfilled_qty"],
        "ordered_amount": t["ordered_amount"],
        "total_amount": t["amount"],
        "notes": doc.get("notes") or "",
        "fulfillment_notes": doc.get("fulfillment_notes") or "",
        "cancel_reason": doc.get("cancel_reason") or "",
        "ordered_by": doc.get("ordered_by"),
        "order_date": _iso(doc.get("order_date") or doc.get("created_at")),
        "fulfilled_at": _iso(doc.get("fulfilled_at")),
        "completed_at": _iso(doc.get("completed_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "payment": {
            "payment_id": doc.get("payment_id"),
            "method": doc.get("payment_method"),
            "amount": doc.get("paid_amount"),
            "paid_at": _iso(doc.get("paid_at")),
        } if doc.get("payment_id") else None,
    }


def list_orders(query):
    return [serialize_order(d) for d in orders_collection.find(query).sort("_id", -1)]


# ---------------------------------------------------------------- notifications

def _notify(email, title, message, ref):
    if email:
        notifications_collection.insert_one(NotificationDocument.create(
            user_email=email, title=title, message=message, notification_type="order", reference_id=ref))


def _notify_supplier(company, title, message, ref):
    for u in users_collection.find({"userType": "Supplier", "companyName": company}, {"email": 1}):
        _notify(u.get("email"), title, message, ref)


def _notify_hospital_admins(hospital, title, message, ref):
    for u in users_collection.find({"userType": "Admin", "hospitalName": hospital}, {"email": 1}):
        _notify(u.get("email"), title, message, ref)


# ---------------------------------------------------------------- 1. admin places the cart

def create_orders(hospital, items, notes, ordered_by):
    """items: [{product_id, quantity}] -> one order per supplier. Returns the created orders."""
    if not isinstance(items, list) or not items:
        raise OrderError("Add at least one product to the order.")
    by_supplier, seen = {}, set()
    for raw in items:
        pid = _oid((raw or {}).get("product_id"))
        try:
            qty = int((raw or {}).get("quantity"))
        except (TypeError, ValueError):
            qty = 0
        if not pid or qty <= 0 or qty > MAX_QTY:
            raise OrderError("Each product needs a valid id and a quantity of at least 1.")
        if pid in seen:
            raise OrderError("The same product is in the cart twice.")
        seen.add(pid)
        product = products_collection.find_one({"_id": pid, "hospitalName": hospital, "is_approved": True})
        if not product:
            raise OrderError("A selected product is not in this hospital's approved inventory.")
        company = product.get("supplier_company")
        if not company:
            raise OrderError(f"{product.get('product_name')} has no supplier.")
        price = float(product.get("price_per_strip") or 0)
        if price <= 0:
            raise OrderError(f"{product.get('product_name')} has no price.")
        by_supplier.setdefault(company, []).append({
            "product_id": str(pid),
            "product_name": product.get("product_name"),
            "product_type": product.get("product_type"),
            "department": product.get("department"),
            "quantity_ordered": qty,
            "quantity_fulfilled": 0,
            "price_per_strip": price,
            "expiry_date": None,
        })

    created = []
    now = _now()
    for company, lines in by_supplier.items():
        oid = ObjectId()
        doc = {
            "_id": oid,
            "orderNumber": f"PO-{now:%y%m%d}-{str(oid)[-4:].upper()}",
            "hospitalName": hospital,
            "supplier_company": company,
            "items": lines,
            "status": "requested",
            "notes": (notes or "")[:500],
            "ordered_by": ordered_by,
            "order_date": now,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }
        orders_collection.insert_one(doc)
        created.append(serialize_order(doc))
        _notify_supplier(company, "New Stock Order",
                         f"{hospital} ordered {len(lines)} product(s) ({doc['orderNumber']}).", str(oid))
    return created


# ---------------------------------------------------------------- 2. supplier fulfils / declines

def fulfil_order(order_id, company, payload):
    """payload: {items: [{product_id, quantity_fulfilled, price_per_strip, expiry_date}], notes}"""
    doc = orders_collection.find_one({"_id": _oid(order_id)}) if _oid(order_id) else None
    if not doc:
        raise OrderError("Order not found.", status.HTTP_404_NOT_FOUND)
    if doc.get("supplier_company") != company:
        raise OrderError("You can only fulfil your own orders.", status.HTTP_403_FORBIDDEN)
    if (doc.get("status") or "requested") != "requested":
        raise OrderError(f"This order is already {doc.get('status')}.")

    sent = {str((i or {}).get("product_id")): i for i in (payload.get("items") or [])}
    lines, total_sent = [], 0
    for item in order_items(doc):
        line = dict(item)
        src = sent.get(str(item.get("product_id")))
        if src is None:
            raise OrderError(f"Enter the quantity for {item.get('product_name')} (0 if not available).")
        try:
            qty = int(src.get("quantity_fulfilled") or 0)
            price = float(src.get("price_per_strip") or item.get("price_per_strip") or 0)
        except (TypeError, ValueError):
            raise OrderError(f"Invalid quantity or price for {item.get('product_name')}.")
        if qty < 0 or qty > int(item.get("quantity_ordered") or 0):
            raise OrderError(f"{item.get('product_name')}: send between 0 and {item.get('quantity_ordered')} strips.")
        if qty > 0:
            if price <= 0:
                raise OrderError(f"{item.get('product_name')}: price must be greater than 0.")
            expiry = _parse_date(src.get("expiry_date"))
            if not expiry:
                raise OrderError(f"{item.get('product_name')}: expiry date is required.")
            if expiry.date() <= _now().date():
                raise OrderError(f"{item.get('product_name')}: expiry date must be in the future.")
            line["expiry_date"] = expiry
        line["quantity_fulfilled"] = qty
        line["price_per_strip"] = price
        total_sent += qty
        lines.append(line)
    if total_sent <= 0:
        raise OrderError("Send at least one product, or decline the order.")

    now = _now()
    result = orders_collection.update_one({"_id": doc["_id"], "status": doc.get("status") or "requested"}, {"$set": {
        "items": lines,
        "status": "processing",
        "fulfillment_notes": (payload.get("notes") or "")[:500],
        "fulfilled_at": now,
        "updated_at": now,
    }})
    if result.modified_count == 0:
        raise OrderError("The order changed meanwhile. Refresh and try again.", status.HTTP_409_CONFLICT)
    doc = orders_collection.find_one({"_id": doc["_id"]})
    out = serialize_order(doc)
    _notify_hospital_admins(doc.get("hospitalName"), "Stock Order Fulfilled",
                            f"{company} fulfilled {out['orderNumber']}. Amount to pay: ₹{out['total_amount']:.0f}.",
                            str(doc["_id"]))
    return out


def cancel_order(order_id, user, role, company=None, reason=""):
    """Admin (own hospital) or supplier (own company) can cancel/decline a REQUESTED order."""
    doc = orders_collection.find_one({"_id": _oid(order_id)}) if _oid(order_id) else None
    if not doc:
        raise OrderError("Order not found.", status.HTTP_404_NOT_FOUND)
    if role == "supplier" and doc.get("supplier_company") != company:
        raise OrderError("You can only decline your own orders.", status.HTTP_403_FORBIDDEN)
    if role == "admin" and doc.get("hospitalName") != getattr(user, "hospitalName", None):
        raise OrderError("You can only cancel your hospital's orders.", status.HTTP_403_FORBIDDEN)
    if (doc.get("status") or "requested") != "requested":
        raise OrderError("Only orders that are not fulfilled yet can be cancelled.")
    now = _now()
    orders_collection.update_one({"_id": doc["_id"]}, {"$set": {
        "status": "cancelled", "cancelled_by": getattr(user, "email", None), "cancelled_by_role": role,
        "cancel_reason": (reason or "")[:300], "updated_at": now}})
    doc = orders_collection.find_one({"_id": doc["_id"]})
    out = serialize_order(doc)
    if role == "supplier":
        _notify_hospital_admins(doc.get("hospitalName"), "Stock Order Declined",
                                f"{doc.get('supplier_company')} declined {out['orderNumber']}.", str(doc["_id"]))
    else:
        _notify_supplier(doc.get("supplier_company"), "Stock Order Cancelled",
                         f"{doc.get('hospitalName')} cancelled {out['orderNumber']}.", str(doc["_id"]))
    return out


# ---------------------------------------------------------------- 3. payment -> completed + stock in

def payable_amount(doc):
    if doc.get("status") != "processing":
        raise OrderError("Only fulfilled orders can be paid." if doc.get("status") == "requested"
                         else f"This order is {doc.get('status')}.")
    amount = order_totals(doc)["amount"]
    if amount <= 0:
        raise OrderError("Nothing was delivered for this order.")
    return amount


def _add_stock(hospital, items):
    for item in items:
        qty = int(item.get("quantity_fulfilled") or 0)
        pid = _oid(item.get("product_id"))
        if qty <= 0 or not pid:
            continue
        update = {"$inc": {"stock": qty}, "$set": {"updated_at": _now()}}
        if item.get("expiry_date"):
            update["$set"]["expiry_date"] = item["expiry_date"]
        product = products_collection.find_one_and_update({"_id": pid, "hospitalName": hospital}, update,
                                                          return_document=True)
        if not product:
            logger.warning("Stock not added: product %s not found in %s", pid, hospital)
            continue
        stock = int(product.get("stock") or 0)
        label = "Out of Stock" if stock <= 0 else ("Low Stock" if stock < LOW_STOCK else "In Stock")
        products_collection.update_one({"_id": pid}, {"$set": {"status": label}})


def complete_purchase_order(order_id, payment):
    """Mark a fulfilled order paid + completed and add its stock. Safe to call twice."""
    doc = orders_collection.find_one({"_id": _oid(order_id)}) if _oid(order_id) else None
    if not doc:
        return None
    now = _now()
    claimed = orders_collection.update_one({"_id": doc["_id"], "status": "processing"}, {"$set": {
        "status": "completed",
        "completed_at": now,
        "updated_at": now,
        "payment_id": payment.get("razorpay_payment_id") or payment.get("payment_id"),
        "payment_method": payment.get("method") or "online",
        "paid_amount": payment.get("amount"),
        "paid_at": payment.get("paid_at") or now,
    }})
    doc = orders_collection.find_one({"_id": doc["_id"]})
    if claimed.modified_count:
        _add_stock(doc.get("hospitalName"), order_items(doc))
        num = order_number(doc)
        _notify_supplier(doc.get("supplier_company"), "Payment Received",
                         f"{doc.get('hospitalName')} paid ₹{float(payment.get('amount') or 0):.0f} for {num}.",
                         str(doc["_id"]))
        _notify_hospital_admins(doc.get("hospitalName"), "Stock Order Completed",
                                f"{num} is paid and the stock was added to your inventory.", str(doc["_id"]))
    return doc


def successful_payment_for(order_id):
    return payments_collection.find_one({"category": "SUPPLIER_PURCHASE", "purchase_order_id": str(order_id),
                                         "status": "SUCCESS"})


def reconcile_paid_orders(query):
    """Complete fulfilled orders whose payment already succeeded (e.g. older paid-but-stuck orders)."""
    ids = [str(d["_id"]) for d in orders_collection.find({**query, "status": "processing"}, {"_id": 1})]
    if not ids:
        return
    for pay in payments_collection.find({"category": "SUPPLIER_PURCHASE", "status": "SUCCESS",
                                         "purchase_order_id": {"$in": ids}}):
        complete_purchase_order(pay["purchase_order_id"], pay)
