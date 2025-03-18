
import { useParams } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";

const doctorsData = {
  orthopedic: [
    { id: 1, name: "Dr. John Doe", specialty: "Orthopedic", experience: "10 years", image: "/images/doctor1.jpg", price: "1000 BDT", slots: ["8:30 am - 9:30 am", "10:00 am - 11:00 am"] },
    { id: 2, name: "Dr. Jane Smith", specialty: "Orthopedic", experience: "8 years", image: "/images/doctor2.jpg", price: "1200 BDT", slots: ["9:00 am - 10:00 am", "1:00 pm - 2:00 pm"] },
  ],
  dental: [
    { id: 3, name: "Dr. Emily Brown", specialty: "Dental", experience: "5 years", image: "/images/doctor3.jpg", price: "800 BDT", slots: ["10:30 am - 11:30 am", "2:00 pm - 3:00 pm"] },
    { id: 4, name: "Dr. Michael Green", specialty: "Dental", experience: "7 years", image: "/images/doctor4.jpg", price: "1100 BDT", slots: ["11:00 am - 12:00 pm", "4:00 pm - 5:00 pm"] },
  ],
};

function DoctorDetails() {
  const { specialty, id } = useParams();
  const doctor = doctorsData[specialty]?.find((doc) => doc.id.toString() === id);

  if (!doctor) return <div className="text-center text-xl mt-10">Doctor not found</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      <Slidebar activeTab="appointments" setActiveTab={() => {}} userType="patient" />

      <div className="flex-1 p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center">
          <img src={doctor.image} alt={doctor.name} className="w-32 h-32 rounded-full mb-4 md:mb-0 md:mr-6" />
          <div>
            <h2 className="text-2xl font-bold">{doctor.name}</h2>
            <p className="text-blue-500 text-lg">{doctor.specialty}</p>
            <p className="text-gray-600">Experience: {doctor.experience}</p>
          </div>
        </div>

        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg mt-6">
          <h3 className="text-xl font-semibold mb-2">About {doctor.name}</h3>
          <p className="text-gray-700">
            Lorem ipsum is simply dummy text of the printing and typesetting industry. It has been the industry's standard dummy text.
          </p>
        </div>

        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg mt-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">Ticket Price</h3>
            <p className="text-blue-600 text-lg font-bold">{doctor.price}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Available Time Slots</h3>
            <ul className="text-gray-700">
              {doctor.slots.map((slot, index) => (
                <li key={index}>🕒 {slot}</li>
              ))}
            </ul>
          </div>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Book Appointment</button>
        </div>
      </div>
    </div>
  );
}

export default DoctorDetails;
