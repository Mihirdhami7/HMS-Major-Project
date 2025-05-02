import { useState } from 'react';
import Slidebar from "../../pages/Slidebar";

const Disease = () => {
  const [activeTab, setActiveTab] = useState("disease");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const diseases = {
    orthopedic: [
      {
        name: "Osteoarthritis",
        description: "A degenerative joint disease that occurs when the protective cartilage that cushions the ends of bones wears down over time.",
        image: "/images/ostho.jpg",
        symptoms: [
          "Joint pain and stiffness",
          "Reduced range of motion",
          "Swelling",
          "Bone spurs",
          "Grating sensation"
        ]
      },
      {
        name: "Rheumatoid Arthritis",
        description: "An autoimmune disorder that causes inflammation of the joints, leading to painful swelling that can eventually result in bone erosion and joint deformity.",
        image: "/images/rh.jpg",
        symptoms: [
          "Tender, warm, swollen joints",
          "Joint stiffness worse in mornings",
          "Fatigue and fever",
          "Loss of appetite",
          "Symmetric joint involvement"
        ]
      }
    ],
    cardiology: [
      {
        name: "Coronary Artery Disease",
        description: "A condition where the major blood vessels that supply your heart become damaged or diseased, often due to cholesterol-containing deposits.",
        image: "/images/heart.jpg",
        symptoms: [
          "Chest pain (angina)",
          "Shortness of breath",
          "Heart attack",
          "Fatigue",
          "Irregular heartbeat"
        ]
      },
      {
        name: "Hypertension",
        description: "A common condition where the long-term force of blood against artery walls is high enough to cause health problems.",
        image: "/images/hyper.jpg",
        symptoms: [
          "Headaches",
          "Shortness of breath",
          "Nosebleeds",
          "Dizziness",
          "Chest pain"
        ]
      }
    ],
    neurology: [
      {
        name: "Alzheimer's Disease",
        description: "A progressive disorder that causes brain cells to degenerate and die, leading to a continuous decline in thinking, behavioral and social skills.",
        image: "/images/al.jpg",
        symptoms: [
          "Memory loss",
          "Difficulty planning or problem solving",
          "Confusion with time or place",
          "Changes in mood and personality",
          "Poor judgment"
        ]
      },
      {
        name: "Parkinson's Disease",
        description: "A progressive nervous system disorder that affects movement, often including tremors.",
        image: "/images/parkinson.jpeg.jpg",
        symptoms: [
          "Tremor",
          "Slowed movement",
          "Rigid muscles",
          "Impaired posture and balance",
          "Loss of automatic movements"
        ]
      }
    ],
    pediatric: [
      {
        name: "Asthma",
        description: "A condition in which airways narrow and swell and produce extra mucus, making breathing difficult.",
        image: "/images/asthma.jpeg.jpg",
        symptoms: [
          "Shortness of breath",
          "Chest tightness or pain",
          "Wheezing",
          "Coughing",
          "Difficulty sleeping"
        ]
      },
      {
        name: "Type 1 Diabetes",
        description: "A chronic condition in which the pancreas produces little or no insulin, leading to increased blood sugar levels.",
        image: "/images/type1.jpeg.jpg",
        symptoms: [
          "Increased thirst",
          "Frequent urination",
          "Extreme hunger",
          "Unintended weight loss",
          "Fatigue and weakness"
        ]
      }
    ],
    general: [
      {
        name: "Common Cold",
        description: "A viral infection of your nose and throat (upper respiratory tract).",
        image: "/images/common-cold.jpg",
        symptoms: [
          "Runny or stuffy nose",
          "Sore throat",
          "Cough",
          "Congestion",
          "Mild headache"
        ]
      },
      {
        name: "Influenza (Flu)",
        description: "A viral infection that attacks your respiratory system — your nose, throat, and lungs.",
        image: "/images/flu.jpg",
        symptoms: [
          "Fever",
          "Chills",
          "Muscle aches",
          "Cough",
          "Fatigue"
        ]
      },
      {
        name: "Migraine",
        description: "A headache of varying intensity, often accompanied by nausea and sensitivity to light and sound.",
        image: "/images/migraine.jpg",
        symptoms: [
          "Throbbing pain",
          "Nausea",
          "Sensitivity to light",
          "Sensitivity to sound",
          "Blurred vision"
        ]
      },
      {
        name: "Allergies",
        description: "A condition in which the immune system reacts abnormally to a foreign substance.",
        image: "/images/allergies.jpg",
        symptoms: [
          "Sneezing",
          "Runny nose",
          "Itchy eyes",
          "Skin rash",
          "Swelling"
        ]
      },
      {
        name: "Food Poisoning",
        description: "An illness caused by eating contaminated food.",
        image: "/images/food-poisoning.jpg",
        symptoms: [
          "Nausea",
          "Vomiting",
          "Diarrhea",
          "Abdominal pain",
          "Fever"
        ]
      },
      {
        name: "Acne",
        description: "A skin condition that occurs when hair follicles become plugged with oil and dead skin cells.",
        image: "/images/acne.jpg",
        symptoms: [
          "Pimples",
          "Blackheads",
          "Whiteheads",
          "Oily skin",
          "Scarring"
        ]
      }
    ]
  };

  const getAllDiseases = () => {
    return Object.values(diseases).flat();
  };

  const getDisplayedDiseases = () => {
    if (selectedDepartment === "all") {
      return getAllDiseases();
    }
    return diseases[selectedDepartment] || [];
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar userType="patient" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 p-8 overflow-auto mt-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center text-blue-700">
          
          Common Diseases & Conditions
        </h2>

         {/* Department Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto py-2">
          {Object.keys(diseases).map((department) => (
            <button
              key={department}
              onClick={() => setSelectedDepartment(department)}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
                selectedDepartment === department
                  ? "bg-blue-500 text-white border-blue-600 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {department.charAt(0).toUpperCase() + department.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setSelectedDepartment("all")}
            className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${
              selectedDepartment === "all"
                ? "bg-blue-500 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Departments
          </button>
        </div>

        {/* Disease Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getDisplayedDiseases().map((disease, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 border border-blue-100 hover:border-green-200">
              {/* Disease Image */}
              <div className="h-48 bg-gradient-to-r from-blue-100 to-green-100">
                <img
                  src={disease.image}
                  alt={disease.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x200?text=Disease+Image";
                  }}
                />
              </div>

              {/* Disease Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-blue-700">{disease.name}</h3>
                <p className="text-gray-600 mb-4">{disease.description}</p>

                {/* Symptoms */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-700">Common Symptoms:</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {disease.symptoms.map((symptom, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Disease;
