import Hero from "../../components/Home/Hero"
import Insights from "../../components/Home/Insights"
import Features from "../../components/Home/Features"
import FindDoctor from "../../components/Home/FindDoctor"
import BookAppointment from "../../components/Home/BookAppointment"
import PatientSay from "../../components/Home/Testimonials"
import HealthTips from "../../components/Home/HealthTips"   

export default function Home() {
    return (
    <div className="min-h-screen flex flex-col">
        <main className="flex-grow">
            <Hero />
            <Insights />
            <FindDoctor />
            <BookAppointment />
            <Features />
            <HealthTips />
            <PatientSay />
        </main>
    </div>
    )
}


