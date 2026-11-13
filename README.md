# HMS-Major-Project# 🏥 Hospital Management System (HMS)

A full-featured Hospital Management System (HMS) designed to streamline healthcare operations. The system includes roles for Super Admin, Admin, Doctor, Patient, and Supplier, with functionalities like appointment booking, prescription management, medicine inventory, and supplier integration.

## 📌 Features

- 🔐 User Authentication (Doctor, Patient, Admin, Super Admin, Supplier)
- 🩺 Online and Offline Appointment Management
- 💊 Prescription Module with Department-Based Medicine List
- 📦 Inventory and Supply Chain Management
- 📁 Patient Report and History Tracking
- 🧾 Razorpay Integration for Payments
- 📷 QR Code Support for Patient/Prescription/Medicine Identification
- 📊 Super Admin Dashboard with Hospital Analytics

---

## 🛠️ Tech Stack

**Frontend**:  
- React.js  
- Tailwind CSS / Bootstrap  
- Axios  

**Backend**:  
- Django 5.x  
- pymongo (MongoDB driver for Python)  
- Django REST Framework  

**Database**:  
- MongoDB  

**Payment Integration**:  
- Razorpay  

## 📂 Project Structure

```bash
├── backend/
│   ├── manage.py
│   ├── hms/ (main Django project)
│   ├── api/ (custom apps for auth, appointment, etc.)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
