import { useEffect, useRef, useState } from "react"
import { Users, Activity, UserCheck, Scissors } from "lucide-react"

const stats = [
  { icon: Users,     value: 23,   suffix: "+", label: "Pediatric Specialities" },
  { icon: Activity,  value: 7256, suffix: "+", label: "ER Visit in 2020" },
  { icon: UserCheck, value: 328,  suffix: "+", label: "Physicians On Staff" },
  { icon: Scissors,  value: 1694, suffix: "+", label: "Total Surgeries in 2020" },
]

function useCounter(target, active) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = Math.ceil(target / 60)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 20)
    return () => clearInterval(timer)
  }, [active, target])
  return count
}

function StatCard({ stat, active }) {
  const count = useCounter(stat.value, active)
  return (
    <div className="bg-white rounded-2xl border border-[#b2e8d2] p-6 flex flex-col items-center text-center
                    hover:shadow-[0_8px_24px_#1D9E7518] transition-all duration-300 hover:-translate-y-1">
      <div className="w-12 h-12 rounded-full bg-[#DAF8ED] flex items-center justify-center mb-3">
        <stat.icon className="w-6 h-6 text-[#0F6E56]" />
      </div>
      <p className="text-3xl font-bold text-[#0F6E56]">{count.toLocaleString()}{stat.suffix}</p>
      <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
    </div>
  )
}

export default function Insights() {
  const ref = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect() } }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="py-20 bg-[rgb(231,250,243)]" id="insights" ref={ref}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-10 items-center">
          {/* Left image card */}
          <div className="lg:w-2/5 w-full">
            <div className="relative rounded-2xl overflow-hidden bg-[#0F6E56] aspect-[4/3] flex items-end p-8">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=800&q=80')" }}
              />
              <div className="relative z-10">
                <p className="text-[#9FE1CB] text-sm font-medium mb-2">All of health Expert in Single</p>
                <p className="text-white text-4xl font-bold tracking-wide">COMBINATION</p>
              </div>
            </div>
          </div>
          {/* Right stats grid */}
          <div className="lg:w-3/5 w-full">
            <div className="mb-6">
              <span className="text-[#0F6E56] text-sm font-semibold uppercase tracking-widest border-b-2 border-[#1D9E75] pb-1">Insights</span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {stats.map((s, i) => <StatCard key={i} stat={s} active={active} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}