"use client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { FiMenu, FiX, FiMoon, FiSun, FiBell, FiUser, FiLogOut } from "react-icons/fi";

export default function Header() {
  const [userType, setUserType] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  const navigate = useNavigate();

  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Fetch session details
  useEffect(() => {
    const checkSession = async () => {
      const sessionID = sessionStorage.getItem("session_Id");
      if (!sessionID) {
        setIsLoggedIn(false);
        return;
      }
      
      try {
        console.log("Header: Checking session...");
        const response = await fetch("http://127.0.0.1:8000/api/accounts/check_session/", {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": sessionID,
          },
        });

        console.log("Header: Session response status:", response.status);
        
        if (!response.ok) {
            console.log("Header: Session invalid, logging out...");
            clearSessionState();
            return;
          }

        const data = await response.json();
        if (data.status === "success" && data.userData) {;
          setUserEmail(data.userData.email);
          setUserType(data.userData.userType);
          setIsLoggedIn(true);
          console.log("Header: Session valid, user:", data.userData.email);
        } else {
          console.log("Header: Session invalid, logging out...");
          clearSessionState();
        }

        
      } catch (error) {
        console.error("Header: Session check failed:", error);
        if (!userEmail) {
          clearSessionState();
        }
      }
    };

    checkSession();
  }, []);

  const clearSessionState = () => {
    sessionStorage.removeItem("session_Id");
    sessionStorage.removeItem("userType");
    sessionStorage.removeItem("email");
    setUserEmail(null);
    setUserType(null);
    setIsLoggedIn(false);
    navigate("/login");
  };

  // Logout function
  const handleLogout = async () => {
    try {
      console.log("Header: Logging out...");
      await fetch("http://127.0.0.1:8000/api/accounts/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": sessionStorage.getItem("session_Id")
        }
      });
      console.log("Header: Logout request sent");
    } catch (err) {
      console.error("Header: Logout failed:", err);
    } finally {
      clearSessionState();
    }
  };

  // Sample notifications (Replace with real backend notifications)
  const sampleNotifications = [
    { id: 1, message: "New appointment request", time: "5 min ago" },
    { id: 2, message: "Prescription updated", time: "1 hour ago" },
    { id: 3, message: "Reminder: Follow-up appointment", time: "2 hours ago" },
  ];

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setShowNotifications(false);
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm fixed w-full z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-green-600 dark:text-green-400">
          EasyTreat
        </Link>

        {/* Navigation Menu */}
        <nav
          className={`${isMenuOpen ? "block" : "hidden"} md:block absolute md:relative top-full left-0 w-full md:w-auto bg-white dark:bg-gray-800 md:bg-transparent shadow-md md:shadow-none`}
        >
          {/* <ul className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6 p-4 md:p-0">
            {[
              { path: "/", label: "Home" },
              { path: "/services", label: "Services" },
              { path: "/find-doctor", label: "Find a Doctor" },
              { path: "/health-tips", label: "Health Tips" },
              { path: "/emergency", label: "Emergency" },
              { path: "/contact", label: "Contact Us" },
            ].map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul> */}
        </nav>

        {/* Authentication & Theme Toggle */}
        <div className="flex items-center space-x-4 relative dropdown-container">
          {isLoggedIn ? (
            <Button variant="outline" asChild>
              <Link to="/login">Log In</Link>
            </Button>
          ) : (
            <>
              {/* Notifications */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowDropdown(false);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                >
                  <FiBell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  {sampleNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {sampleNotifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {sampleNotifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiUser className="text-gray-600 dark:text-gray-300" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{userEmail}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userType}</div>
                  </div>
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                    <Link to={`/${userType?.toLowerCase()}/profile`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowDropdown(false)}>
                      <FiUser className="inline-block mr-2" /> Profile
                    </Link>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={handleLogout}
                    >
                      <FiLogOut className="inline-block mr-2" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Toggle theme">
            {theme === "dark" ? <FiSun className="w-5 h-5 text-yellow-500" /> : <FiMoon className="w-5 h-5 text-gray-600" />}
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