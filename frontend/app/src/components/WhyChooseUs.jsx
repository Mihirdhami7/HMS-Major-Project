import { Shield, Brain, Cloud } from "lucide-react"

const reasons = [
  { icon: Shield, title: "Security & Compliance", description: "HIPAA/GDPR-compliant data security." },
  { icon: Brain, title: "AI-Powered Insights", description: "Smart recommendations for improved patient care." },
  { icon: Cloud, title: "Cloud-Based Solution", description: "Accessible anywhere with real-time data sync." },
]

export default function WhyChooseUs() {
  return (
    <section className="py-20 bg-[rgb(218,248,237)]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-green-900 mb-12">Why Choose Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reasons.map((reason, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md text-center">
              <reason.icon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{reason.title}</h3>
              <p className="text-gray-600">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

