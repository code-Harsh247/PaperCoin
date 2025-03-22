// components/TradingPlatform.jsx
"use client"

import React, { useState } from 'react';
import TabNavigation from './TabNavigation';
import OpenOrders from './OpenOrders';
import OrderHistory from './OrderHistory';
import Funds from './Funds';

const TradingPlatform = () => {
  const [activeTab, setActiveTab] = useState('openOrders');

  const renderContent = () => {
    switch (activeTab) {
      case 'openOrders':
        return <OpenOrders />;
      case 'orderHistory':
        return <OrderHistory />;
      case 'funds':
        return <Funds />;
      default:
        return <OpenOrders />;
    }
  };

  return (
    <div className="w-full bg-gray-900 text-gray-200 p-4 rounded-md">
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default TradingPlatform;