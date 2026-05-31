import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { FiMenu, FiX, FiMoon, FiSun, FiBell, FiUser, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // ── Theme toggle ──────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ── Logout handler ────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
      setShowDropdown(false);
    }
  };

  // ── Get profile link based on userType ────────────────────
  const getProfileLink = () => {
    if (!user?.userType) return "/profile";
    return `/${user.userType.toLowerCase()}/profile`;
  };

  // ── Close dropdowns on click outside ──────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Get avatar initials ───────────────────────────────────
  const getInitials = (email) => {
    if (!email) return "U";
    return email.slice(0, 2).toUpperCase();
  };

  // ── Current notifications (sample) ──────────────────────────
  const sampleNotifications = [
    { id: 1, message: "New appointment request", time: "5 min ago", unread: true },
    { id: 2, message: "Prescription updated", time: "1 hour ago", unread: true },
    { id: 3, message: "Reminder: Follow-up appointment", time: "2 hours ago", unread: false },
  ];

  const unreadCount = sampleNotifications.filter((n) => n.unread).length;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 fixed w-full z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

        {/* ── Logo ── */}
        <Link
          to="/"
          className="text-2xl font-bold text-green-600 dark:text-green-400 shrink-0"
        >
          EasyTreat
        </Link>

        {/* ── Center/Right Side ── */}
        <div className="flex items-center gap-3 ml-auto">

          {/* Notification Bell - Only show if logged in */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
              >
                <FiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-[11px] text-white flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {sampleNotifications.length > 0 ? (
                      sampleNotifications.map((notif) => (
                        <div key={notif.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <p className="text-sm text-gray-800 dark:text-gray-200">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Auth/Profile Section */}
          {isLoading ? (
            /* Loading state */
            <div className="animate-pulse flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
          ) : isAuthenticated ? (
            /* Logged In - Show Profile Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-semibold text-green-700 dark:text-green-300">
                  {user?.email?.slice(0, 2).toUpperCase() || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {user?.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.userType}
                  </p>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user?.email}
                    </p>
                    {user?.hospitalName && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {user.hospitalName}
                      </p>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {/* Profile */}
                    <Link
                      to={getProfileLink()}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <FiUser className="w-4 h-4" />
                      Profile
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      <FiLogOut className="w-4 h-4" />
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not Logged In - Show Login/Signup Buttons */
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <FiSun className="w-5 h-5 text-yellow-400" />
            ) : (
              <FiMoon className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <FiX className="w-5 h-5" />
            ) : (
              <FiMenu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && isAuthenticated && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
          <Link
            to={getProfileLink()}
            className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Profile
          </Link>
          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}