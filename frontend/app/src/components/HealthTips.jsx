import { useState } from "react"
import { FiHeart, FiActivity, FiCoffee } from "react-icons/fi"
import { motion } from "framer-motion"

const tips = [
  {
    icon: FiHeart,
    title: "Heart Health",
    content: "Regular exercise and a balanced diet can significantly improve your heart health.",
  },
  {
    icon: FiActivity,
    title: "Stay Active",
    content: "Aim for at least 30 minutes of moderate physical activity every day.",
  },
  {
    icon: FiCoffee,
    title: "Mindful Eating",
    content: "Pay attention to what and when you eat. Avoid distractions during meals.",
  },
]

export default function HealthTips() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section id="health-tips" className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Daily Health Tips</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              className={`bg-white p-6 rounded-lg shadow-md cursor-pointer ${
                activeIndex === index ? "border-2 border-blue-500" : ""
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveIndex(index)}
            >
              <tip.icon className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{tip.title}</h3>
              {activeIndex === index && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-gray-600"
                >
                  {tip.content}
                </motion.p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

