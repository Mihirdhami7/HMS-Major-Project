import { FiUsers, FiUserCheck, FiCalendar, FiTrendingUp } from "react-icons/fi"

const stats = [
  { icon: FiUsers, label: "Total Patients", value: "1,234" },
  { icon: FiUserCheck, label: "Doctors", value: "56" },
  { icon: FiCalendar, label: "Appointments", value: "289" },
  { icon: FiTrendingUp, label: "Revenue", value: "$52,489" },
]

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <stat.icon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{stat.value}</h3>
            <p className="text-gray-600">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

