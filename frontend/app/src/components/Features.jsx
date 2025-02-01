import { Users, Calendar, Video, Hospital, CreditCard, BarChart3, Pill, Smartphone, AlertCircle } from "lucide-react"

const features = [
  { icon: Users, title: "User Management", description: "Securely manage doctors, patients, and hospital staff." },
  {
    icon: Calendar,
    title: "Appointment System",
    description: "Hassle-free appointment booking, rescheduling, and reminders.",
  },
  {
    icon: Video,
    title: "Video Consultation",
    description: "Telemedicine support for remote patient-doctor interactions.",
  },
  {
    icon: Hospital,
    title: "Healthcare Management",
    description: "Streamlined hospital operations, including patient records and treatment history.",
  },
  {
    icon: CreditCard,
    title: "Billing & Payment",
    description: "Integrated invoicing, payment processing, and insurance handling.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights for hospital performance, patient statistics, and financial reports.",
  },
  {
    icon: Pill,
    title: "Prescription Management",
    description: "Digitized prescriptions and automated medicine tracking.",
  },
  {
    icon: Smartphone,
    title: "Multi-Platform Access",
    description: "Mobile, tablet, and web support for doctors and patients.",
  },
  { icon: AlertCircle, title: "Emergency Support", description: "Quick emergency response with one-click alerts." },
]

export default function Features() {
  return (
    <section className="py-20 bg-white" id="services">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

