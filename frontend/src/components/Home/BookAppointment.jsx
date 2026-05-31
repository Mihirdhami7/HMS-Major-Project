import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Phone, ArrowRight } from "lucide-react"

export default function BookAppointment() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: "", phone: "", department: "", date: "" })

  const departments = ["Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics", "Dental"]

  return (
    <section className="py-20 bg-[rgb(218,248,237)]" id="book-appointment">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: form */}
          <div className="lg:w-3/5 w-full">
            <div className="bg-white rounded-2xl border border-[#b2e8d2] p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="Call Name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700
                               focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Cost"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700
                               focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Department</label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700
                               focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Appointment Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700
                               focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/login")}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 hover:bg-[#085041] text-white font-medium text-sm
                             py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Book Now <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4 text-[#1D9E75]" />
                  <span>Or Contact Emergency</span>
                  <span className="font-semibold text-[#0F6E56]">16247</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: CTA text */}
          <div className="lg:w-2/5">
            <p className="text-[#0F6E56] text-sm font-semibold mb-2">Let us Serve You</p>
            <h2 className="text-3xl font-bold text-gray-800 leading-snug mb-4">
              Make An Appointment<br />
              <span className="text-blue-900">Within Second</span>
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              You can now book doctor and call it to your doctor by hand and fits only. Venenatis blandit sit lectus interdum libero aliquam.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}