import { useState } from "react"
import { motion } from "framer-motion"

const tourSpots = [
  {
    id: 1,
    name: "Reception",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
  },
  {
    id: 2,
    name: "Emergency Room",
    image:
      "https://images.unsplash.com/photo-1519494080410-f9aa76cb4283?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
  },
  {
    id: 3,
    name: "Operating Theater",
    image:
      "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  },
]

export default function VirtualTour() {
  const [currentSpot, setCurrentSpot] = useState(tourSpots[0])

  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">Virtual Hospital Tour</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <motion.div
            className="w-full md:w-2/3 rounded-lg overflow-hidden shadow-lg"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src={currentSpot.image || "/placeholder.svg"}
              alt={currentSpot.name}
              className="w-full h-[400px] object-cover"
            />
          </motion.div>
          <div className="w-full md:w-1/3">
            <h3 className="text-2xl font-semibold mb-4">{currentSpot.name}</h3>
            <div className="space-y-4">
              {tourSpots.map((spot) => (
                <motion.button
                  key={spot.id}
                  className={`w-full p-4 text-left rounded-lg transition-colors ${
                    spot.id === currentSpot.id ? "bg-blue-500 text-white" : "bg-white hover:bg-blue-100"
                  }`}
                  onClick={() => setCurrentSpot(spot)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {spot.name}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

