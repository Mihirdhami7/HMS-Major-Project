import { useEffect, useRef } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"

const doctors = [
  { name: "Dr. John Doe",    role: "Cardiologist",      days: "Mon to Sat", time: "9:00 to 13:00 / 14:00 to 18:00", initials: "JD" },
  { name: "Dr. Li Digan Morpie", role: "Dermatologist", days: "Friday & Wed", time: "9:00 to 13:00",               initials: "LM" },
  { name: "Dr. Sofia Name",  role: "Pediatrician",      days: "Fri to Sun", time: "9:00 to 13:00",                  initials: "SN" },
  { name: "Dr. Denis Michel", role: "Neurologist",      days: "Friday & Med", time: "9:00 to 13:00",                initials: "DM" },
]

const highlights = [
  "We combine all of below interdum libero aliquam. Lectus lobortis.",
  "There are only Vinen se atis blandit sit lectus interdum libero aliquam.",
  "In this care we can atis blandit sit lectus interdum libero aliquam.",
  "We Are combine ndit sit lectus interdum libero aliquam. Lectus lobortis.",
]

export default function Doctors() {
  const refs = useRef([])

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const i = Number(e.target.dataset.index)
          setTimeout(() => e.target.classList.add("opacity-100", "translate-y-0"), i * 100)
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.1 })
    refs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-blue-100" id="doctors">
      <div className="container mx-auto px-6">
        {/* Section label */}
        <div className="mb-2">
          <span className="text-[#0F6E56] text-sm font-semibold uppercase tracking-widest border-b-2 border-[#1D9E75] pb-1">Doctors</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-14 mt-8">
          {/* Left: text + highlights */}
          <div className="lg:w-2/5">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 leading-snug">
              We Have world class<br />
              <span className="text-[#0F6E56]">Care Experts</span>
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Venenatis blandit sit lectus interdum libero aliquam. Lectus lobortis quis viverra
              nec proin venenatis et, in ultrices. Sit non vitae, aliquam odio vitae sagittis
              viverra. Ut eget pellentesque venenatis, cursus nisl elit nisi.
            </p>
            <ul className="space-y-3 mb-8">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                  {h}
                </li>
              ))}
            </ul>
            <button className="flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white text-sm font-medium
                               px-6 py-3 rounded-xl transition-all duration-200 hover:gap-3">
              Explore Doctors <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: doctor cards grid */}
          <div className="lg:w-3/5 grid grid-cols-2 gap-4">
            {doctors.map((d, i) => (
              <div
                key={i}
                ref={el => (refs.current[i] = el)}
                data-index={i}
                className="bg-[#E7FAF3] border border-[#b2e8d2] rounded-2xl p-5
                           opacity-0 translate-y-6 transition-all duration-500 ease-out
                           hover:border-[#1D9E75] hover:shadow-[0_8px_24px_#1D9E7518] hover:-translate-y-0.5
                           group"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-[#DAF8ED] border-2 border-[#9FE1CB]
                                flex items-center justify-center mb-4 text-[#0F6E56] font-bold text-base
                                group-hover:scale-105 transition-transform duration-300">
                  {d.initials}
                </div>
                <p className="font-semibold text-gray-800 text-sm">{d.name}</p>
                <p className="text-xs text-[#1D9E75] mb-3">{d.role}</p>
                <div className="bg-[#0F6E56] text-white text-xs px-3 py-1.5 rounded-lg inline-block mb-1">
                  {d.days}
                </div>
                <p className="text-xs text-gray-500 mt-1">{d.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}