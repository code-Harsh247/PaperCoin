"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from 'next/navigation'
import {
  Menu,
  Bell,
  Settings,
  Search,
  LogOut,
  Menu as MenuIcon,
  Home,
  BarChart2,
  Wallet,
  History,
  Heart,
  HelpCircle,
  TrendingUp,
  Users,
} from "lucide-react";

export default function Navbar({ user, activeTab, setActiveTab }) {
  const router = useRouter()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    setIsNotificationsOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    try {
      // if (signOut) {
      await signOut(); // Call the sign-out function
      router.push("/"); // Redirect to the home page
      // }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const mobileMenu = document.getElementById("mobile-menu");
      if (
        mobileMenu &&
        !mobileMenu.contains(event.target) &&
        !event.target.closest('button[aria-label="Toggle mobile menu"]')
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigation items - same as what was in sidebar
  const navItems = [
    { name: "Dashboard", icon: Home, path: "/dashboard", id: "dashboard" },
    { name: "Markets", icon: BarChart2, path: "/markets", id: "markets" },
    { name: "Trading", icon: TrendingUp, path: "/trading", id: "trading" },
    { name: "Wallet", icon: Wallet, path: "/wallet", id: "wallet" },
    { name: "History", icon: History, path: "/history", id: "history" },
    { name: "Watchlist", icon: Heart, path: "/watchlist", id: "watchlist" },
  ];

  const handleNavClick = (id) => {
    if (setActiveTab) {
      setActiveTab(id);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#111722] border-b border-gray-800">
      <div className="px-4 py-3 mx-auto">
        <div className="flex items-center justify-between">
          {/* Left side with Logo and Navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center mr-8">
              <div className="text-amber-500 h-9 w-9 mr-2 flex items-center justify-center rounded-full bg-amber-500 bg-opacity-20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span className="text-white text-xl font-bold">PaperCoin</span>
            </Link>

            {/* Navigation links moved to left */}
            <div className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex items-center text-sm font-medium ${
                    activeTab === item.id
                      ? "text-amber-500"
                      : "text-gray-300 hover:text-white"
                  }`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Hamburger menu button (visible on mobile only) */}
          <div className="block lg:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-400 hover:text-white focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              <MenuIcon size={24} />
            </button>
          </div>

          {/* Right side user items */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-48 pl-10 pr-3 py-2 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm"
                placeholder="Search assets..."
              />
            </div>

            {/* Notification button */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="p-2 rounded-full text-gray-400 hover:text-white focus:outline-none relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-500"></span>
              </button>

              {/* Notifications dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 border border-gray-700">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-white font-medium">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-4 border-b border-gray-700 hover:bg-gray-700">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-white">
                            Your deposit of $500 has been confirmed.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            2 hours ago
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-b border-gray-700 hover:bg-gray-700">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-white">
                            Bitcoin is up 5% today.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            5 hours ago
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-gray-700">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-white">
                            New feature alert: Portfolio Analytics is now
                            available.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            1 day ago
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 border-t border-gray-700">
                    <button className="w-full text-center text-sm text-amber-500 hover:text-amber-400 py-1">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings button */}
            <Link
              href="/settings"
              className="p-2 rounded-full text-gray-400 hover:text-white focus:outline-none"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={toggleProfileMenu}
                className="flex items-center text-sm focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                  {user?.userName?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 border border-gray-700">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm text-white truncate">
                        {user?.userName || user?.email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Your Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/help"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Help & Support
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar (visible on smaller screens) */}
        <div className="mt-3 md:hidden">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm"
              placeholder="Search assets, markets..."
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu (slide-in from left) */}
      {isMobileMenuOpen && (
        <div id="mobile-menu" className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900 bg-opacity-75"
            onClick={toggleMobileMenu}
          ></div>
          <div className="absolute inset-y-0 left-0 max-w-xs w-full bg-gray-800 shadow-xl">
            <div className="flex flex-col h-full">
              {/* User profile section */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                    {user?.userName?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {user?.userName || "User"}
                    </div>
                    <div className="text-gray-400 text-sm truncate">
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 py-4 overflow-y-auto">
                <nav className="px-2 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.path}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                        activeTab === item.id
                          ? "bg-gray-700 text-amber-500"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  ))}

                  {/* Additional items from sidebar */}
                  <div className="pt-4 mt-4 border-t border-gray-700">
                    <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Support
                    </h3>
                    <div className="mt-2 space-y-1">
                      <Link
                        href="/help"
                        className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <HelpCircle className="h-5 w-5 mr-3" />
                        Help & Support
                      </Link>
                      <Link
                        href="/community"
                        className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <Users className="h-5 w-5 mr-3" />
                        Community
                      </Link>
                    </div>
                  </div>
                </nav>
              </div>

              {/* Sign out button */}
              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
