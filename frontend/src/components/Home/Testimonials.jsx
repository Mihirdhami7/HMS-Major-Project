import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"

const testimonials = [
  { text: "This HMS has revolutionized our hospital operations. It's intuitive, efficient, and the support team is outstanding.", name: "Dr. Sarah Johnson", role: "Cardiologist", initials: "SJ", rating: 5, color: "from-blue-400 to-blue-600" },
  { text: "The analytics dashboard provides invaluable insights for decision-making. We reduced admin overhead by 40% in the first quarter.", name: "John Smith", role: "Hospital Administrator", initials: "JS", rating: 5, color: "from-purple-400 to-purple-600" },
  { text: "Booking appointments and accessing my medical records has never been easier. I feel more in control of my health.", name: "Emily Brown", role: "Patient", initials: "EB", rating: 4, color: "from-pink-400 to-pink-600" },
  { text: "The system's reliability and user-friendly interface have significantly improved our patient satisfaction scores.", name: "Dr. Michael Chen", role: "Chief Medical Officer", initials: "MC", rating: 5, color: "from-green-400 to-green-600" },
  { text: "Managing multiple departments has never been simpler. The integration features save us countless hours monthly.", name: "Lisa Anderson", role: "Operations Manager", initials: "LA", rating: 5, color: "from-orange-400 to-orange-600" },
  { text: "From scheduling to billing, everything works seamlessly. Our staff loves using this platform daily.", name: "James Wilson", role: "Hospital Director", initials: "JW", rating: 4, color: "from-red-400 to-red-600" },
]

const StarRating = ({ rating }) => (
  <div className="flex gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))}
  </div>
)

const TestimonialCard = ({ testimonial }) => (
  <div className="bg-white border border-[#b2e8d2] rounded-2xl p-8 hover:shadow-xl hover:border-[#0F6E56] transition-all duration-300 h-full flex flex-col">
    {/* Quote Mark */}
    <span className="text-5xl text-[#DAF8ED] font-serif leading-none pointer-events-none select-none mb-3">"</span>
    
    {/* Testimonial Text */}
    <p className="text-sm text-gray-700 leading-relaxed mb-6 flex-grow">
      {testimonial.text}
    </p>

    {/* Star Rating */}
    <div className="mb-6">
      <StarRating rating={testimonial.rating} />
    </div>

    {/* User Info */}
    <div className="flex items-center gap-3 pt-4 border-t border-[#9FE1CB]">
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} 
                      flex items-center justify-center text-white font-bold text-sm
                      shadow-md flex-shrink-0`}>
        {testimonial.initials}
      </div>
      
      {/* Name & Role */}
      <div className="min-w-0">
        <p className="font-semibold text-sm text-gray-800 truncate">{testimonial.name}</p>
        <p className="text-xs text-gray-500 truncate">{testimonial.role}</p>
      </div>
    </div>
  </div>
)

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const cardsPerView = 3
  const totalCards = testimonials.length
  const maxScroll = Math.max(0, totalCards - cardsPerView)
  const canScrollNext = current < maxScroll
  const canScrollPrev = current > 0

  const handleNext = () => {
    if (!isTransitioning && canScrollNext) {
      setIsTransitioning(true)
      setCurrent((prev) => Math.min(prev + 1, maxScroll))
      setTimeout(() => setIsTransitioning(false), 500)
    }
  }

  const handlePrev = () => {
    if (!isTransitioning && canScrollPrev) {
      setIsTransitioning(true)
      setCurrent((prev) => Math.max(prev - 1, 0))
      setTimeout(() => setIsTransitioning(false), 500)
    }
  }

  const getVisibleCards = () => {
    const visible = []
    for (let i = 0; i < cardsPerView; i++) {
      const index = current + i
      if (index < totalCards) {
        visible.push({
          testimonial: testimonials[index],
          index: index,
        })
      }
    }
    return visible
  }

  const visibleCards = getVisibleCards()
  const totalSets = Math.ceil(totalCards / cardsPerView)
  const currentSet = Math.floor(current / cardsPerView)

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-blue-100" id="testimonials">
      <div className="container mx-auto px-4">
        <div className="text-center mb-2">
          <span className="inline-block bg-[#DAF8ED] text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full tracking-widest">
            TRUSTED BY USERS
          </span>
        </div>
        <h2 className="text-3xl font-semibold text-center text-green-900 mt-3 mb-3">What Our Users Say</h2>
        <p className="text-center text-gray-500 mb-12">Real feedback from doctors, administrators, and patients.</p>

        <div className="max-w-7xl mx-auto">
          {/* Carousel Section */}
          <div className="relative flex items-center justify-center gap-4">
            {/* Left Navigation Button */}
            <button
              onClick={handlePrev}
              disabled={isTransitioning || !canScrollPrev}
              className="absolute left-0 z-20 w-12 h-12 rounded-full border-2 border-[#0F6E56] 
                         flex items-center justify-center hover:bg-[#0F6E56] hover:text-white 
                         transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group">
              <ChevronLeft className="w-6 h-6 text-[#0F6E56] group-hover:text-white transition-colors" />
            </button>

            {/* Cards Container */}
            <div className="w-full px-20">
              <div className={`grid grid-cols-3 gap-6 transition-all duration-500 ease-out`}
                style={{
                  opacity: isTransitioning ? 0.7 : 1,
                }}>
                {visibleCards.length === cardsPerView ? (
                  visibleCards.map((card) => (
                    <div key={card.index} className="h-full">
                      <TestimonialCard testimonial={card.testimonial} />
                    </div>
                  ))
                ) : (
                  visibleCards.map((card) => (
                    <div key={card.index} className="h-full">
                      <TestimonialCard testimonial={card.testimonial} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Navigation Button */}
            <button
              onClick={handleNext}
              disabled={isTransitioning || !canScrollNext}
              className="absolute right-0 z-20 w-12 h-12 rounded-full border-2 border-[#0F6E56] 
                         flex items-center justify-center hover:bg-[#0F6E56] hover:text-white 
                         transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group">
              <ChevronRight className="w-6 h-6 text-[#0F6E56] group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalSets }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (!isTransitioning && i !== currentSet) {
                    setIsTransitioning(true)
                    setCurrent(Math.min(i * cardsPerView, maxScroll))
                    setTimeout(() => setIsTransitioning(false), 500)
                  }
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === currentSet
                    ? "w-5 h-2.5 bg-[#0F6E56]"
                    : "w-2.5 h-2.5 bg-[#9FE1CB] hover:bg-[#1D9E75] cursor-pointer"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}