import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { FiMenu, FiX, FiMoon, FiSun, FiBell, FiUser, FiLogOut, FiGrid } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications, timeAgo } from "../../hooks/useNotifications";
import { homeForRole } from "../../constants/roles";

export default function Header() {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const {
    items: notifications, unread: unreadCount, fresh, clearFresh,
    markRead, canAskPermission, askPermission,
  } = useNotifications(isAuthenticated ? token : null);
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


  // ── Notifications: auto-hide the "new notification" popup ──────────
  useEffect(() => {
    if (!fresh.length) return undefined;
    const t = setTimeout(clearFresh, 6000);
    return () => clearTimeout(t);
  }, [fresh, clearFresh]);

  // Where a notification should take the user
  const notificationTarget = (n) => {
    const home = homeForRole(user?.userType);
    if (n.type === "appointment") return home === "/admin" ? "/admin/newRegister" : `${home}/appointments`;
    return home;
  };

  const openNotification = (n) => {
    if (!n.read) markRead([n.id]);
    setShowNotifications(false);
    navigate(notificationTarget(n));
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 fixed w-full z-50 h-16">
      <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between">

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
                  <span className="absolute top-0 right-0 min-w-5 h-5 px-1 bg-red-500 rounded-full text-[11px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
                    {unreadCount > 0 && (
                      <button onClick={() => markRead()} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  {canAskPermission && (
                    <button
                      onClick={askPermission}
                      className="w-full px-4 py-2 text-left text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700"
                    >
                      🔔 Enable desktop alerts for new notifications
                    </button>
                  )}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => openNotification(notif)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex gap-3 ${
                            notif.read ? "" : "bg-blue-50/60 dark:bg-gray-700/60"
                          }`}
                        >
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notif.read ? "bg-transparent" : "bg-blue-500"}`} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{notif.title}</span>
                            <span className="block text-sm text-gray-600 dark:text-gray-300">{notif.message}</span>
                            <span className="block text-xs text-gray-400 mt-1">{timeAgo(notif.createdAt)}</span>
                          </span>
                        </button>
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
                  {(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {user?.name || user?.email?.split("@")[0]}
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
                    {/* Dashboard (role home) */}
                    <Link
                      to={homeForRole(user?.userType)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      <FiGrid className="w-4 h-4" />
                      Dashboard
                    </Link>
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

      {/* New notification popup (push-style) */}
      {fresh.length > 0 && (
        <div className="fixed top-20 right-4 z-[60] w-80 space-y-2">
          {fresh.slice(0, 3).map((n) => (
            <button
              key={n.id}
              onClick={() => {
                clearFresh();
                openNotification(n);
              }}
              className="w-full text-left bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-xl rounded-lg px-4 py-3"
            >
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">🔔 {n.title}</span>
              <span className="block text-xs text-gray-600 dark:text-gray-300 mt-0.5">{n.message}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile Menu */}
      {isMenuOpen && isAuthenticated && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
          <Link
            to={homeForRole(user?.userType)}
            className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
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