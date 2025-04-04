'use client';

import React from 'react';
import { BarChart2, PieChart, TrendingUp, Eye, Clock, LogOut, X, User, Settings } from 'lucide-react';
import Link from 'next/link';

const NavItem = ({ icon, label, active, onClick }) => {
  const Icon = icon;
  return (
    <button 
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${
        active ? 'bg-gray-800 text-amber-500' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span>{label}</span>
    </button>
  );
};

const UserProfile = ({ user, signOut, router }) => (
  <div className="mt-auto pt-4 border-t border-gray-800">
    <div className="px-2 py-3 rounded-lg ">
      <div className="flex items-center space-x-3">
        {/* User Avatar */}
        <div className="relative flex-shrink-0">
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || "User"} 
              className="w-10 h-10 rounded-full border border-gray-700 object-cover" 
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center">
              <span className="text-base font-medium text-black">
                {(user?.userName || user?.username || "User").charAt(0)}
              </span>
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-black"></div>
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user?.userName || user?.username || "User"}
          </p>
          <p className="text-xs text-gray-400 truncate">{user?.email || "user@example.com"}</p>
        </div>
        
        {/* Dropdown Menu Button (could be expanded later) */}
        <div className="relative inline-block">
          <button 
            className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="User menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      
    </div>
  </div>
);

const Sidebar = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  isMobile = false, 
  isOpen = true, 
  onClose, 
  signOut, 
  router 
}) => {
  const navItems = [
    { icon: BarChart2, label: 'Dashboard', id: 'dashboard' },
    { icon: PieChart, label: 'Portfolio', id: 'portfolio' },
    { icon: TrendingUp, label: 'Trade', id: 'trade' },
    { icon: Eye, label: 'Watchlist', id: 'watchlist' },
    { icon: Clock, label: 'History', id: 'history' }
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity lg:hidden ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        ></div>
        
        {/* Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-black transform transition-transform duration-300 ease-in-out lg:hidden ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <span className="text-2xl font-bold text-amber-500">PaperCoin</span>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-col h-[calc(100%-4rem)] px-4 py-6">
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => handleNavClick(item.id)}
                />
              ))}
            </nav>
            
            <UserProfile user={user} signOut={signOut} router={router} />
          </div>
        </aside>
      </>
    );
  }
  
  // Desktop sidebar
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800">
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <Link href="/" className="text-2xl font-bold text-amber-500">
          PaperCoin
        </Link>
      </div>
      
      <div className="flex flex-col h-[calc(100%-4rem)] px-4 py-6">
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>
        
        <UserProfile user={user} signOut={signOut} router={router} />
      </div>
    </aside>
  );
};

export default Sidebar;