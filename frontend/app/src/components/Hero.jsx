import { Button } from "./ui/button";
import HeroImage from "../assets/images/Hero-doctor.png";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiActivity, FiBarChart2, FiUsers, FiClock, FiCheckCircle } from "react-icons/fi";

export default function Hero() {
  const [scrollY, setScrollY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [activeStats, setActiveStats] = useState(null);
  const navigate = useNavigate();
  
  // Check if user is logged in as patient
  const isLoggedIn = sessionStorage.getItem("session_Id") ? true : false;
  const userType = sessionStorage.getItem("userType");
  const isPatient = userType === "Patient";

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBookAppointment = () => {
    if (isLoggedIn && isPatient) {
      navigate("/patient/book-appointment");
    } else {
      navigate("/login");
    }
  };

  // Advanced analytics data 
  const analyticsData = [
    { 
      id: 2, 
      icon: <FiBarChart2 className="text-green-600" size={28} />,
      title: "Operational Efficiency", 
      value: "42%", 
      color: "green",
      description: "Increase in treatment efficiency using our predictive analytics and patient flow optimization"
    },
    { 
      id: 4, 
      icon: <FiClock className="text-amber-600" size={28} />,
      title: "Waiting Time", 
      value: "-68%", 
      color: "amber",
      description: "Reduction in patient waiting times through AI-powered scheduling optimization"
    },
    { 
      id: 5, 
      icon: <FiCheckCircle className="text-indigo-600" size={28} />,
      title: "Digital Prescriptions", 
      value: "99.9%", 
      color: "indigo",
      description: "Accuracy in medication delivery with our advanced pharmacological verification system"
    }
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Blob elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.div 
          className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-400 opacity-10 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-400 opacity-10 blur-3xl"
          animate={{
            x: [0, -20, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Content container */}
      <div className="container mx-auto px-8 md:px-16 z-10 flex flex-col lg:flex-row items-center justify-between py-12 relative">
        {/* Left side - Text content with enhanced interactivity */}
        <motion.div 
          className="lg:w-2/5 text-gray-800 mb-12 lg:mb-0 text-center lg:text-left lg:pr-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="mt-24 text-3xl md:text-5xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              Advanced 
            </motion.span>
            {" "}
            <motion.span 
              className="text-blue-600 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
            >
              Healthcare Analytics
              <motion.div 
                className="absolute h-2 w-full bg-green-300/40 bottom-1 -z-10 left-0"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 0.8 }}
              />
            </motion.span>
            {" "}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 1 }}
            >
              Powering Better Care
            </motion.span>
          </motion.h1>
          
          <motion.p
            className="text-lg md:text-xl mb-8 text-gray-600 max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Our platform transforms healthcare delivery with real-time insights, predictive diagnostics, and personalized treatment pathways that improve patient outcomes by up to 42%.
          </motion.p>
          
          <motion.div
            className="flex flex-wrap gap-6 justify-center lg:justify-start mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-10 py-7 text-lg font-medium rounded-xl shadow-md hover:shadow-xl transition-all"
                onClick={handleBookAppointment}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {isHovered ? (
                  isLoggedIn && isPatient ? "Book Now →" : "Login to Book →"
                ) : (
                  "Book Appointment"
                )}
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg"
                variant="outline"
                className="bg-white/80 text-blue-600 border-blue-200 hover:bg-blue-50 px-10 py-7 text-lg font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
                onClick={() => navigate("/about")}
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Interactive Advanced Analytics Stats */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Healthcare Analytics Impact</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {analyticsData.map((stat, index) => (
                <motion.div
                  key={stat.id}
                  className={`bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm cursor-pointer border-l-4 ${activeStats === stat.id ? `border-${stat.color}-500` : 'border-transparent'}`}
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.2)",
                  }}
                  onClick={() => setActiveStats(activeStats === stat.id ? null : stat.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {stat.icon}
                    <p className={`font-bold text-2xl text-${stat.color}-600`}>{stat.value}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{stat.title}</p>
                  
                  {activeStats === stat.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs text-gray-600"
                    >
                      {stat.description}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
        
        {/* Right side - Doctor image and analytics overlays */}
        <motion.div 
          className="lg:w-3/5 relative flex justify-end pl-5 lg:pl-20"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Analytics graphics overlays */}
          <motion.div 
            className="absolute top-10 right-10 bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-lg z-10 hidden md:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <p className="text-sm font-medium">Patient Recovery</p>
            </div>
            <div className="h-10 mt-2 flex items-end">
              <motion.div 
                className="w-6 bg-green-500 rounded-t-sm mx-0.5"
                initial={{ height: 0 }}
                animate={{ height: "60%" }}
                transition={{ delay: 1.4, duration: 1 }}
              />
              <motion.div 
                className="w-6 bg-green-500 rounded-t-sm mx-0.5"
                initial={{ height: 0 }}
                animate={{ height: "75%" }}
                transition={{ delay: 1.5, duration: 1 }}
              />
              <motion.div 
                className="w-6 bg-green-500 rounded-t-sm mx-0.5"
                initial={{ height: 0 }}
                animate={{ height: "65%" }}
                transition={{ delay: 1.6, duration: 1 }}
              />
              <motion.div 
                className="w-6 bg-green-500 rounded-t-sm mx-0.5"
                initial={{ height: 0 }}
                animate={{ height: "90%" }}
                transition={{ delay: 1.7, duration: 1 }}
              />
              <motion.div 
                className="w-6 bg-green-500 rounded-t-sm mx-0.5"
                initial={{ height: 0 }}
                animate={{ height: "80%" }}
                transition={{ delay: 1.8, duration: 1 }}
              />
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute top-1/3 left-0 bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-lg z-10 hidden md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <p className="text-sm font-medium text-blue-800">Waiting Time Reduction</p>
            <div className="flex items-center mt-1">
              <div className="text-sm font-bold text-blue-600">-68%</div>
              <motion.div 
                className="h-2 bg-blue-500 ml-2 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: "70%" }}
                transition={{ delay: 2, duration: 1.2 }}
              />
            </div>
          </motion.div>
          
          <motion.img
            src={HeroImage}
            alt="Doctor with advanced healthcare analytics"
            className="w-full max-w-8xl object-contain h-auto relative z-5"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Floating data dots */}
          <motion.div 
            className="absolute w-4 h-4 rounded-full bg-blue-500 top-1/4 right-1/4 hidden md:block"
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              boxShadow: ["0 0 0 0 rgba(59, 130, 246, 0.6)", "0 0 0 10px rgba(59, 130, 246, 0)", "0 0 0 0 rgba(59, 130, 246, 0)"]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              delay: 1
            }}
          />
          
          <motion.div 
            className="absolute w-3 h-3 rounded-full bg-green-500 bottom-1/3 right-1/3 hidden md:block"
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0.6)", "0 0 0 10px rgba(34, 197, 94, 0)", "0 0 0 0 rgba(34, 197, 94, 0)"]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 4,
              delay: 2
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}