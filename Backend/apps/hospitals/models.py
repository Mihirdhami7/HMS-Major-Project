
from datetime import datetime
from typing import Optional, List, Dict, Any

class HospitalDocument:
    """Hospital document schema and helper methods"""
    
    @staticmethod
    def create(
        name: str,
        adminEmail: str,
        contactNo: str,
        description: Optional[str] = "",
        adminName: Optional[str] = "",
        address: Optional[str] = "",
    ) -> Dict[str, Any]:
        """Create hospital document"""
        return {
            "name": name,
            "description": description or "",
            "adminEmail": adminEmail,
            "adminName": adminName or "",
            "contactNo": contactNo,
            "address": address or "",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    
    @staticmethod
    def update(
        name: Optional[str] = None,
        description: Optional[str] = None,
        adminEmail: Optional[str] = None,
        adminName: Optional[str] = None,
        contactNo: Optional[str] = None,
        address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate update data for hospital"""
        now = datetime.utcnow()
        data: Dict[str, Any] = {"updatedAt": now}
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
        if adminEmail is not None:
            data["adminEmail"] = adminEmail
        if adminName is not None:
            data["adminName"] = adminName
        if contactNo is not None:
            data["contactNo"] = contactNo
        if address is not None:
            data["address"] = address
        return data


class DepartmentDocument:
    """Department document schema and helper methods"""

    @staticmethod
    def create(
        name: str,
        hospitalName: str,
        description: Optional[str] = "",
        head: Optional[str] = "",
        roles: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        return {
            "Department": name,
            "Description": description or "",
            "hospitalName": hospitalName,
            "Head of Department": head or "",
            "roles": roles or [],
            "Created Date": now,
            "updatedAt": now,
        }

    @staticmethod
    def update(
        name: Optional[str] = None,
        description: Optional[str] = None,
        head: Optional[str] = None,
        roles: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        data: Dict[str, Any] = {"updatedAt": now}
        if name is not None:
            data["Department"] = name
        if description is not None:
            data["Description"] = description
        if head is not None:
            data["Head of Department"] = head
        if roles is not None:
            data["roles"] = roles
        return data