'use client';
import React from 'react';
import { TrendingUp, Wallet, Eye, PieChart } from 'lucide-react';
import { ActionButton } from '@/components/DashboardCards';

const QuickActions = () => {
  const actions = [
    {
      icon: TrendingUp,
      label: "Trade Now",
      primary: true,
      onClick: () => console.log('Trade Now')
    },
    {
      icon: Wallet,
      label: "Deposit",
      primary: false,
      onClick: () => console.log('Deposit')
    },
    {
      icon: Eye,
      label: "View Watchlist",
      primary: false,
      onClick: () => console.log('View Watchlist')
    },
    {
      icon: PieChart,
      label: "Portfolio Analytics",
      primary: false,
      onClick: () => console.log('Portfolio Analytics')
    }
  ];

  const handleContactSupport = () => {
    console.log('Contact Support');
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <ActionButton
            key={`action-${index}`}
            icon={action.icon}
            label={action.label}
            primary={action.primary}
            onClick={action.onClick}
          />
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-white font-medium mb-2">Need Help?</h3>
          <p className="text-gray-400 text-sm mb-3">Our support team is here for you 24/7.</p>
          <button 
            className="w-full border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-medium py-2 rounded-lg transition-colors"
            onClick={handleContactSupport}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;