import { useState } from "react";
import { useLocation } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Define different doctor details based on specialization
const doctorDetails = {
  "General Physician": {
    bio: "Expert in diagnosing and treating common illnesses with a focus on overall health.",
    experience: "10 Years",
    fee: "$50",
  },
  "Cardiologist": {
    bio: "Specializes in heart diseases, offering expert consultation and advanced treatment options.",
    experience: "15 Years",
    fee: "$100",
  },
  "Orthopedic": {
    bio: "Experienced in treating bone and joint issues, including fractures and arthritis.",
    experience: "12 Years",
    fee: "$80",
  },
  "Dermatologist": {
    bio: "Expert in skincare and treating various skin conditions and allergies.",
    experience: "8 Years",
    fee: "$60",
  },
  "Neurologist": {
    bio: "Specialist in brain and nerve disorders, providing cutting-edge treatment plans.",
    experience: "14 Years",
    fee: "$120",
  },
};

const Book = () => {
  const location = useLocation();
  const { doctor } = location.state || {};
  const [activeTab, setActiveTab] = useState("appointments");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [healthIssues, setHealthIssues] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  if (!doctor) {
    return <p className="text-center text-red-500">No doctor selected.</p>;
  }
  // Time slots
  const timeSlots = [
    "10:00 am", "10:30 am", "11:00 am", "11:30 am", 
    "12:00 pm", "12:30 pm", "1:00 pm", "1:30 pm"
  ];

  // Fetch details based on the doctor's specialization
  const doctorInfo = doctorDetails[doctor.specialization] || {
    bio: "Detailed information is not available for this specialization.",
    experience: "Unknown",
    fee: "N/A",
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !healthIssues) {
      alert("Please fill in all details before booking.");
      return;
    }

    const appointmentData = {
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      date: selectedDate.toISOString().split("T")[0],
      time: selectedTime,
      healthIssues,
      status: "pending",
    };

    try {
      const response = await fetch("http://localhost:8000/api/appointments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentData),
      });
      if (response.ok) {
        alert("Appointment successfully booked.");
        setShowDialog(false);
      } else {
        alert("Failed to book appointment. Please try again.");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("An error occurred. Please try again later.");
    }
  };



  return (
    <div className="flex">
      <Slidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="patient" />
      <div className="p-6 font-[Manrope, sans-serif] w-full mt-8">
        <div className=" mx-auto bg-white p-6 rounded-lg shadow-md mt-8">
          <div className="flex items-center space-x-6">
            {/* Doctor's Image */}
            <img src={doctor.image} alt={doctor.name} className="w-32 h-32 object-cover rounded-lg" />
            <div>
              <h2 className="text-2xl font-semibold">
                {doctor.name} <span className="text-blue-500">✔</span>
              </h2>
              <p className="text-gray-600">
                MBBS - {doctor.specialization} | <span className="text-gray-500">{doctorInfo.experience}</span>
              </p>
              <p className="mt-2 text-gray-700">{doctorInfo.bio}</p>
              <p className="mt-2 font-bold">
                Appointment fee: <span className="text-blue-500">{doctorInfo.fee}</span>
              </p>
            </div>
          </div>
          <div> <slid></slid>
          </div>

          {/* Work Experience & Achievements Section */}
          <h3 className="mt-6 text-lg font-semibold">Work Experience & Achievements</h3>
          <div className="mt-2 p-4 bg-gray-100 rounded-lg">
            <p className="font-semibold">{doctor.experience}</p>
            <ul className="list-disc list-inside mt-2">
              {doctor.achievements && doctor.achievements.length > 0 ? (
                doctor.achievements.map((achievement, index) => (
                  <li key={index} className="text-gray-700">{achievement}</li>
                ))
              ) : (
                <li className="text-gray-500">No achievements listed.</li>
              )}
            </ul>
          </div>

          {/* Book Appointment Button */}
          <button 
            className="mt-6 w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            onClick={() => setShowDialog(true)} // <-- Add this onClick event
          >
  Book an Appointment
</button>

        </div>
      </div>
      {/* Booking Dialog */}
{showDialog && (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
    <div className="bg-white p-8 rounded-xl shadow-xl w-[500px]">
      <h2 className="text-2xl font-semibold text-center mb-4 text-blue-600">Book Appointment</h2>
      
      <div className="mb-4">
        <p className="text-lg"><strong>Doctor:</strong> {doctor.name} ({doctor.specialization})</p>
      </div>

      {/* Date Selection */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Select Date:</label>
        <DatePicker 
          selected={selectedDate} 
          onChange={(date) => setSelectedDate(date)} 
          className="border p-2 rounded-lg w-full text-center" 
          placeholderText="Select a date"
        />
      </div>

      {/* Time Slot Selection */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Select Time Slot:</label>
        <select 
          onChange={(e) => setSelectedTime(e.target.value)} 
          className="border p-2 rounded-lg w-full bg-gray-100"
        >
          <option value="">Select a time</option>
          {timeSlots.map((slot, index) => (
            <option key={index} value={slot}>{slot}</option>
          ))}
        </select>
      </div>

      {/* Health Issues */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Health Issues:</label>
        <textarea 
          className="border p-3 rounded-lg w-full bg-gray-100 resize-none" 
          rows="3"
          onChange={(e) => setHealthIssues(e.target.value)} 
          placeholder="Describe your health issue..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <button 
          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          onClick={() => setShowDialog(false)}
        >
          Cancel
        </button>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          onClick={handleBookAppointment}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}



    </div>
  );
};


export default Book;
