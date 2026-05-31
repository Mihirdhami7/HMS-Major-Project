import Hero from "../../components/Home/Hero"
import Insights from "../../components/Home/insights"
import Features from "../../components/Home/Features"
import FindDoctor from "../../components/Home/FindDoctor"
import BookAppointment from "../../components/Home/BookAppointment"
import PatientSay from "../../components/Home/Testimonials"
import HealthTips from "../../components/Home/HealthTips"   
// import ContactUs from "../../components/Home/ContactUs"

export default function Home() {
    console.log("Home component rendered");
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
            {/* <ContactUs /> */}
        </main>
    </div>
    )
}


