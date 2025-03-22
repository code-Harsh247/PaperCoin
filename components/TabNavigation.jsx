"use client"

// Demo data for various components



// components/TabNavigation.jsx


import React from 'react';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'openOrders', label: 'Open Orders(3)' },
    { id: 'orderHistory', label: 'Order History' },
    { id: 'funds', label: 'Funds' },
  ];

  return (
    <div className="flex border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`py-2 px-4 font-medium whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-yellow-500 border-b-2 border-yellow-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;