import { useState } from "react";
import Slidebar from "../../pages/Slidebar"; // Ensure correct path
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiPhoneCall } from "react-icons/fi";


const specializations = [
  "orthopedic",
  "cardiologist",
  "pediatricians",
  "neurologist",
  "General Physician",
];

const doctors = [
  { name: "Dr. Richard James", specialization: "General Physician", available: true, image: "/images/doctor-img01.png", experience: "8+ years in Internal Medicine", email: "wwqd@mail.com",
    achievements: [
      "Developed innovative diagnostic techniques",
      "Recognized for outstanding patient care in 2021",
      "Guest speaker at international medical conferences",
    ], },
  { name: "Dr. Emily Larson", specialization: "General Physician", available: true, image: "/images/doctor1.jpeg",experience: "10+ years in General Medicine",
    achievements: [
      "Awarded 'Best Physician' in 2020",
      "Published 15 research papers in medical journals",
      "Former Head of Internal Medicine at XYZ Hospital",
    ], },
  { name: "Dr. John Doe", specialization: "General Physician", available: true, image: "/images/doctor-img02.png" ,experience: "10+ years in General Medicine",
    achievements: [
      "Awarded 'Best Physician' in 2020",
      "Published 15 research papers in medical journals",
      "Former Head of Internal Medicine at XYZ Hospital",
    ],},
   { name: "Dr. Lisa Brown", specialization: "General Physician", available: true, image: "/images/doctor2.jpeg",experience: "10+ years in General Medicine",
    achievements: [
      "Awarded 'Best Physician' in 2020",
      "Published 15 research papers in medical journals",
      "Former Head of Internal Medicine at XYZ Hospital",
    ], },
  { name: "Dr. Michael Smith", specialization: "cardiologist", available: true, image: "/images/doctor-img03.png",experience: "10+ years in General Medicine",
    achievements: [
      "Awarded 'Best Physician' in 2020",
      "Published 15 research papers in medical journals",
      "Former Head of Internal Medicine at XYZ Hospital",
    ], },
  { name: "Dr. Olivia White", specialization: "cardiologist", available: true, image: "/images/doctor3.jpeg", experience: "8+ years in Internal Medicine",
    achievements: [
      "Developed innovative diagnostic techniques",
      "Recognized for outstanding patient care in 2021",
      "Guest speaker at international medical conferences",
    ],},
  { name: "Dr. Sophia Green", specialization: "cardiologist", available: true, image: "/images/doctor5.jpeg",experience: "12+ years in Obstetrics and Gynecology",
    achievements: [
      "Performed over 1,500 successful deliveries",
      "Pioneered a new technique for minimally invasive gynecological surgery",
      "Published 10+ research papers on women’s reproductive health",
      "Recipient of 'Best Gynecologist Award' in 2022",
    ], },
  { name: "Dr. James Wilson", specialization: "pediatricians", available: true, image: "/images/mdoctor1.jpeg",experience: "15+ years specializing in High-Risk Pregnancies",
    achievements: [
      "Head of Maternity and Childcare at XYZ Hospital",
      "Led a research team on PCOS treatments with global recognition",
      "Conducted over 500 successful C-section deliveries",
      "Featured in multiple women's health awareness campaigns",
    ], },
  { name: "Dr. Anna Roberts", specialization: "pediatricians", available: true, image: "/images/doctor6.jpeg", experience: "10+ years in Reproductive Endocrinology",
    achievements: [
      "Expert in infertility treatments with a 90% success rate",
      "Developed new IVF techniques improving conception chances",
      "Recognized by the National Fertility Association for excellence",
      "Speaker at international conferences on reproductive health",
    ], },
  { name: "Dr. William Clark", specialization: "pediatricians", available: true, image: "/images/mdoctor2.jpeg",  experience: "8+ years in Prenatal and Postnatal Care",
    achievements: [
      "Helped over 3,000 women through safe pregnancy journeys",
      "Developed community programs for maternal health awareness",
      "Published a book on 'Healthy Pregnancy and Childbirth'",
      "Awarded 'Best Young Gynecologist' in 2021",
    ], },
  { name: "Dr. Sarah Patel", specialization: "neurologist", available: true, image: "/images/fdoctor.jpg", experience: "8+ years in Internal Medicine",
    achievements: [
      "Developed innovative diagnostic techniques",
      "Recognized for outstanding patient care in 2021",
      "Guest speaker at international medical conferences",
    ], },
  { name: "Dr. Christopher Lee", specialization: "neurologist", available: true, image: "/images/mdoctor3.jpeg",experience: "10+ years in Cosmetic and Medical Dermatology",
    achievements: [
      "Successfully treated over 5,000 patients with skin disorders",
      "Developed an advanced acne treatment program with 95% success rate",
      "Regular guest expert on national skincare forums and health shows",
      "Published 20+ research papers on eczema and psoriasis",
    ], },
  { name: "Dr. Brian Adams", specialization: "neurologist", available: true, image: "/images/mdoctor4.jpeg", experience: "12+ years specializing in Skin Cancer Treatment",
    achievements: [
      "Pioneered a non-invasive melanoma detection technique",
      "Lead researcher in skin cancer prevention studies",
      "Awarded 'Best Dermatologist' in 2021 for outstanding contributions",
      "Consultant for major cosmetic brands on dermatological safety",
    ], },
  { name: "Dr. Amanda Cook", specialization: "orthopedic", available: true, image: "/images/doctor6.jpeg", experience: "8+ years in Anti-Aging and Aesthetic Dermatology",
    achievements: [
      "Performed over 2,000 successful laser and cosmetic treatments",
      "Developed a patented formula for natural skin rejuvenation",
      "Featured in top beauty magazines for expert skincare advice",
      "Speaker at international conferences on advanced dermatological procedures",
    ], },
  { name: "Dr. Matthew Scott", specialization: "orthopedic", available: true, image: "/images/mdoctor5.jpeg",  experience: "14+ years in Clinical Dermatology",
    achievements: [
      "Expert in treating rare genetic skin conditions",
      "Recipient of 'Excellence in Dermatology' award",
      "Trained over 50 dermatologists in advanced skin therapies",
      "Published a best-selling book on holistic skincare",
    ], },
  { name: "Dr. Ethan Taylor", specialization: "orthopedic", available: true, image: "/images/mdoctor6.jpeg", experience: "8+ years in Internal Medicine",
    achievements: [
      "Developed innovative diagnostic techniques",
      "Recognized for outstanding patient care in 2021",
      "Guest speaker at international medical conferences",
    ],},
  { name: "Dr. Isabella Young", specialization: "Pediatricians", available: true, image: "/images/fdoctor1.webp",experience: "15+ years in Neonatal and Pediatric Care",
    achievements: [
      "Successfully treated over 10,000 children for various illnesses",
      "Expert in managing premature births and infant development",
      "Co-authored a leading book on childhood nutrition",
      "Recipient of 'Best Pediatrician Award' in 2023",
    ], },
  { name: "Dr. Daniel King", specialization: "Pediatricians", available: true, image: "/images/mdoctor7.jpeg", experience: "12+ years in Pediatric Cardiology",
    achievements: [
      "Performed over 300 successful pediatric heart surgeries",
      "Pioneered a new non-invasive technique for congenital heart defects",
      "Invited speaker at international child healthcare summits",
      "Featured in medical journals for groundbreaking research",
    ], },
  { name: "Dr. Emma Hall", specialization: "orthopedic", available: true, image: "/images/doctor6.jpg",  experience: "10+ years in Child Immunology and Allergies",
    achievements: [
      "Developed a breakthrough vaccine protocol for child immunization",
      "Treated over 5,000 cases of childhood asthma and allergies",
      "Recognized by the National Pediatric Association for excellence",
      "Conducted extensive research on childhood autoimmune diseases",
    ], },
  { name: "Dr. Andrew Walker", specialization: "neurologist", available: true, image: "/images/mdoctor9.jpeg", experience: "14+ years specializing in Behavioral Pediatrics",
    achievements: [
      "Helped thousands of children with ADHD, autism, and developmental delays",
      "Developed a child-friendly approach to behavioral therapy",
      "Author of a best-selling parenting guide on child mental health",
      "Recipient of 'Excellence in Pediatric Care' award",
    ], },
];


// Sample Previous Appointments Data


function Appointment() {

  const [selectedSpecialization, setSelectedSpecialization] = useState("General Physician");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appointments");
  const handleDoctorClick = (doctor) => {
    navigate(`Book`, { state: { doctor } });
  };
  const previousAppointments = [
    { id: 1, doctorName: "Dr. John Doe", suggestion: "Continue medication", reportLink: "/reports/report1.pdf" },
    { id: 2, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
    { id: 3, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
    { id: 4, doctorName: "Dr. Emily Brown", suggestion: "Schedule follow-up", reportLink: "/reports/report2.pdf" },
  ];


  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />

      <div className="flex-1 p-8 overflow-y-auto mt-16">
        <h2 className="text-3xl font-bold flex items-center mb-6 text-blue-700">
          <FiCalendar className="mr-2 text-green-600" /> Doctor Appointments
        </h2>

        {/* Contact Admin Section */}
        <div className="w-full flex justify-between items-center border-b border-blue-200 pb-4 mb-6">
          <span className="text-lg font-semibold text-gray-700">contact Admin to book Appointments</span>
          <button
            className="px-4 py-2 flex items-center bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:from-blue-600 hover:to-green-600 transition-all"
            onClick={() => window.location.href = "tel:+1234567890"}
          >
            <FiPhoneCall className="mr-2" /> Call Admin
          </button>
        </div>

        {/* Department Selection */}
        <h2 className="text-2xl font-semibold mb-6">Browse through the doctors specialist.</h2>
        <div className="flex space-x-6 mb-6 mt-10 overflow-x-auto">
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialization(spec)}
              className={`px-4 py-2 rounded-lg border ${
                selectedSpecialization === spec ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {doctors
            .filter((doc) => doc.specialization === selectedSpecialization)
            .map((doc) => (
              <button 
                key={doc.name} 
                onClick={() => handleDoctorClick(doc)}
                className="border rounded-lg p-4 shadow-md text-center bg-green-98  transform transition duration-300 hover:-translate-y-2 hover:shadow-lg"
              >
                <img src={doc.image} alt={doc.name} className="w-full h-56 object-cover rounded-t-lg" />
                <div className="p-4">
                  <span className="text-green-500 font-semibold">● Available</span>
                  <p className="font-bold text-lg mt-2">{doc.name}</p>
                  <p className="text-gray-500">{doc.specialization}</p>
                </div>
              </button>
        
            ))}
        </div>

        {/* Previous Appointments Section */}
        <div className="mt-12 w-full bg-white p-6 rounded-lg shadow-lg border border-blue-100">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">Previous Appointments</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-green-50">
                  <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Name</th>
                  <th className="border border-blue-200 p-3 text-left text-gray-700">Doctor Suggestion</th>
                  <th className="border border-blue-200 p-3 text-left text-gray-700">Report</th>
                </tr>
              </thead>
              <tbody>
                {previousAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50">
                    <td className="border border-blue-200 p-3">{appointment.doctorName}</td>
                    <td className="border border-blue-200 p-3">{appointment.suggestion}</td>
                    <td className="border border-blue-200 p-3">
                      <a
                        href={appointment.reportLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-green-500 transition-colors"
                      >
                        Generate Report
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Appointment;