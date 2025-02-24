"use client"
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { FiMenu, FiX, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "next-themes";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(""); // Store user email
  const [showDropdown, setShowDropdown] = useState(false); // Show/Hide dropdown
  const navigate = useNavigate(); // Redirect after logout

  useEffect(() => {
    setMounted(true);

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("user")); // Fetch stored user data
    if (user && user.email) {
      setIsAuthenticated(true);
      setUserEmail(user.email);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user"); // Remove user from storage
    setIsAuthenticated(false);
    setUserEmail("");
    navigate("/login"); // Redirect to login page
  };

  if (!mounted) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm fixed w-full z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link 
          to="/" 
          className="text-2xl font-bold text-green-600 dark:text-green-400"
        >
          EasyTreat
        </Link>

        <nav className={`${isMenuOpen ? "block" : "hidden"} md:block absolute md:relative top-full left-0 w-full md:w-auto bg-white dark:bg-gray-800 md:bg-transparent shadow-md md:shadow-none`}>
          <ul className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6 p-4 md:p-0">
            <li><Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Home</Link></li>
            <li><Link to="/services" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Services</Link></li>
            <li><Link to="/find-doctor" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Find a Doctor</Link></li>
            <li><Link to="/health-tips" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Health Tips</Link></li>
            <li><Link to="/emergency" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Emergency</Link></li>
            <li><Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Contact Us</Link></li>
          </ul>
        </nav>

        {/* Authentication & Theme Toggle */}
        <div className="flex items-center space-x-4 relative">
          {/* Show Login button if not authenticated */}
          {!isAuthenticated ? (
            <Button variant="outline" asChild>
              <Link to="/login">Log In</Link>
            </Button>
          ) : (
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center">
                <img
                  src="https://via.placeholder.com/40" // Replace with actual profile image
                  alt="Profile"
                  className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600"
                />
              </button>

              {/* Profile Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{userEmail}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-2 py-1 text-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-700 rounded"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
          >
            {theme === "dark" ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
          </button>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  );
}
