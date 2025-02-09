"use client"

import { useState } from "react"
import Sidebar from "../../components/admin/Sidebar"
import DashboardStats from "../../components/admin/DashboardStats"
import AppointmentList from "../../components/admin/AppointmentList"
import AIInsights from "../../components/admin/AIInsights"
import PatientList from "../../components/admin/PatientList"
import DoctorList from "../../components/admin/DoctorList"
import Settings from "../../components/admin/Settings"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === "dashboard" && (
          <>
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Dashboard</h1>
            <DashboardStats />
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AppointmentList />
              <AIInsights />
            </div>
          </>
        )}
        {activeTab === "appointments" && <AppointmentList fullPage />}
        {activeTab === "patients" && <PatientList />}
        {activeTab === "doctors" && <DoctorList />}
        {activeTab === "settings" && <Settings />}
      </main>
    </div>
  )
}