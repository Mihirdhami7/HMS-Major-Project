import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

const patientSay = [
  {
    name: "Dr. Sarah Johnson",
    role: "Cardiologist",
    text: "This HMS has revolutionized our hospital operations. It's intuitive and efficient.",
  },
  {
    name: "John Smith",
    role: "Hospital Administrator",
    text: "The analytics dashboard provides invaluable insights for decision-making.",
  },
  {
    name: "Emily Brown",
    role: "Patient",
    text: "Booking appointments and accessing my medical records has never been easier.",
  },
];

export default function PatientSay() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % patientSay.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + patientSay.length) % patientSay.length);
  };

  return (
    <section className="py-20 bg-[rgb(231,250,243)]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">What Our Users Say</h2>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-xl text-gray-600 mb-6">
              &quot;{patientSay[currentIndex].text}&quot;
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{patientSay[currentIndex].name}</p>
                <p className="text-gray-600">{patientSay[currentIndex].role}</p>
              </div>
              <div className=" flex space-x-2">
                <Button variant="outline" size="icon" onClick={prevTestimonial}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextTestimonial}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}