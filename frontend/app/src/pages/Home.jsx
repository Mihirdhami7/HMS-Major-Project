import Hero from "../components/Hero"
import Features from "../components/Features"
import WhyChooseUs from "../components/WhyChooseUs"
import FindDoctor from "../components/Doctors/FindDoctor"
import PatientSay from "../components/PatientSay"
import VirtualTour from "../components/VirtualTour"
import HealthTips from "../components/HealthTips"
import ContactUs from "../components/ContactUs"
import EmergencyServices from "../components/EmergencyServices"

export default function Home() {
    console.log("Home component rendered");
    return (
    <div className="min-h-screen flex flex-col">
        <main className="flex-grow">
            <Hero />
            <Features />
            <WhyChooseUs />
            <FindDoctor />
            <VirtualTour />
            <HealthTips />
            <EmergencyServices />
            <PatientSay />
            <ContactUs />
        </main>
    </div>
    )
}


