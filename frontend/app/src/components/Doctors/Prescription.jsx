import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Slidebar from "../../pages/Slidebar";
import { FiDownload } from "react-icons/fi";

function Prescription() {
    const location = useLocation();
    const appointment = location.state?.appointment; // Retrieve appointment data

    if (!appointment) {
        return <div className="text-center text-red-500 text-xl">No Appointment Data Found</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <Slidebar userType="doctor" /> {/* Ensure Sidebar is included here */}

            {/* Main Content */}
            <div className="flex flex-col flex-1 p-8">
                <h2 className="text-3xl font-bold mb-4">Prescription for {appointment.patientName}</h2>
                <p className="text-gray-600 mb-6">Disease: {appointment.disease}</p>

                {/* Prescription Form */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Medicines</h3>
                    <div className="flex space-x-4 mb-3">
                        <input type="text" placeholder="Medicine Name" className="border p-2 rounded w-1/3" />
                        <input type="text" placeholder="Dosage" className="border p-2 rounded w-1/3" />
                        <input type="text" placeholder="Frequency" className="border p-2 rounded w-1/3" />
                    </div>

                    <h3 className="text-xl font-semibold mt-6 mb-2">Tests to be Done</h3>
                    <textarea placeholder="Enter tests required..." className="border p-2 rounded w-full" rows="2"></textarea>

                    <h3 className="text-xl font-semibold mt-6 mb-2">Other Instructions</h3>
                    <textarea placeholder="Diet, exercise, other advice..." className="border p-2 rounded w-full" rows="3"></textarea>

                    {/* Buttons */}
                    <div className="mt-6 flex space-x-4">
                        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center">
                            <FiDownload className="mr-2" /> Download PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Prescription;
