import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Search } from "lucide-react"

const doctors = [
  {
    name: "Dr. John Doe",
    specialization: "Cardiologist",
    experience: "15 years",
    image: "/assets/doctor-img01.png?height=200&width=200",
  },
  {
    name: "Dr. Jane Smith",
    specialization: "Neurologist",
    experience: "12 years",
    image: "/assets/doctor-img02.png?height=200&width=200",
  },
  {
    name: "Dr. Mike Johnson",
    specialization: "Pediatrician",
    experience: "10 years",
    image: "/assets/doctor-img03.png?height=200&width=200",
  },
]

export default function FindDoctor() {
  return (
    <section className="py-20 bg-[rgb(215,244,252)]" id="find-doctor">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Find a Doctor</h2>
        <div className="max-w-md mx-auto mb-12">
          <div className="flex">
            <Input type="text" placeholder="Search by name or specialization" className="rounded-r-none" />
            <Button className="bg-[rgb(3,12,9)] rounded-l-none">
              <Search className="text-[rgb(255,255,255)] w-4 h-4 mr-2" />
              <p className="text-[rgb(255,255,255)]">Search</p>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doctor, index) => (
            <div key={index} className="bg-[rgb(218,248,237)] p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <img
                src={"/assets/doctor-img01.png"}
                alt={doctor.name}
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-center mb-2">{doctor.name}</h3>
              <p className="text-gray-600 text-center mb-2">{doctor.specialization}</p>
              <p className="text-gray-600 text-center mb-4">{doctor.experience} experience</p>
              <Button className="bg-[rgb(94,105,230)] text-[rgb(255,255,255)] w-full">Book Consultation</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

