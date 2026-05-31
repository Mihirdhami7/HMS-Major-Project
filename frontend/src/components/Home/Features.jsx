import { useEffect, useRef } from "react"
import { Calendar, Hospital, User2Icon, CreditCard, BarChart3 } from "lucide-react"

const features = [
  { num: "01", icon: Calendar, title: "Appointments", desc: "Hassle-free booking, rescheduling, and automated reminders for patients and staff." },
  { num: "02", icon: Hospital, title: "Health Product Management", desc: "Manage hospital inventory, pharmacy stock, and medical supplies with real-time tracking." },
  { num: "03", icon: User2Icon, title: "User Management", desc: "Profile management, granular user roles, and permission controls for your entire team." },
  { num: "04", icon: CreditCard, title: "Billing & Payment", desc: "Integrated invoicing, payment processing, and insurance claims handling." },
  { num: "05", icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time insights on hospital performance, patient statistics, and financial reports." },
]

export default function Features() {
  const refs = useRef([])

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const i = Number(e.target.dataset.index)
          setTimeout(() => e.target.classList.add("opacity-100", "translate-y-0"), i * 80)
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    refs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-blue-100" id="services">
      <div className="container mx-auto px-4">
        <div className="text-center mb-2">
          <span className="inline-block bg-[#DAF8ED] text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full tracking-widest">
            WHAT WE OFFER
          </span>
        </div>
        <h2 className="text-3xl font-semibold text-center text-green-900 mt-3 mb-3">Core Features</h2>
        <p className="text-center text-gray-500 mb-12">Everything your hospital needs, in one intelligent platform.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              ref={(el) => (refs.current[i] = el)}
              data-index={i}
              className="bg-white border border-[#b2e8d2] rounded-2xl p-7 relative overflow-hidden
                         opacity-0 translate-y-8 transition-all duration-500 ease-out
                         hover:-translate-y-2 hover:border-[#1D9E75] hover:shadow-[0_12px_32px_#1D9E7520]
                         group cursor-default"
            >
              <span className="absolute top-5 right-5 text-5xl font-semibold text-[#0F6E56]/10 group-hover:text-[#0F6E56]/20 transition-colors">
                {f.num}
              </span>
              <div className="w-13 h-13 rounded-xl bg-[#DAF8ED] flex items-center justify-center mb-5 w-12 h-12
                              transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <f.icon className="w-6 h-6 text-[#0F6E56]" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}