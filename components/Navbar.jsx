'use client';
import React from 'react';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import Link from 'next/link';

const Navbar = ({ user, toggleSidebar, signOut, router }) => {
  return (
    <header className="bg-gray-900 shadow-md border-b border-gray-800">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
         
          <div className="lg:hidden">
            <Link href="/" className="text-xl font-bold text-amber-500">
              PaperCoin
            </Link>
          </div>

          {/* Search bar moved to left corner */}
          <div className="relative hidden md:block w-64 lg:w-80">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Search coins, markets..."
            />
          </div>
        </div>
       
        <div className="flex items-center space-x-4">
          {/* Notification button */}
          <button
            className="relative p-2 text-gray-400 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
          </button>
         
          {/* Mobile search button */}
          <button
            className="p-2 text-gray-400 hover:text-white md:hidden"
            aria-label="Search"
          >
            <Search className="w-6 h-6" />
          </button>
          
          {/* Logout button */}
          <button
            onClick={() => {
              signOut();
              router.push('/');
            }}
            className="hidden md:flex items-center space-x-1 text-gray-400 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;