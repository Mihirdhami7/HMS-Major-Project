import { FiPhoneCall, FiAlertCircle, FiMapPin } from "react-icons/fi"
import { Button } from "../components/ui/button"

export default function EmergencyServices() {
  return (
    <section id="emergency" className="py-20 bg-red-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-red-600 mb-12">Emergency Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <FiPhoneCall className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Emergency Hotline</h3>
            <p className="text-gray-600 mb-4">Call our 24/7 emergency number for immediate assistance.</p>
            <Button className="bg-red-500 hover:bg-red-600">Call Now</Button>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Urgent Care</h3>
            <p className="text-gray-600 mb-4">For non-life-threatening emergencies, visit our urgent care center.</p>
            <Button className="bg-red-500 hover:bg-red-600">Find Nearest Center</Button>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <FiMapPin className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Emergency Room Locations</h3>
            <p className="text-gray-600 mb-4">Find the nearest emergency room in your area.</p>
            <Button className="bg-red-500 hover:bg-red-600">View Locations</Button>
          </div>
        </div>
      </div>
    </section>
  )
}

