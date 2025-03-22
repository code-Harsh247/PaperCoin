// components/TradingPlatform.jsx
"use client"

export const demoOrderHistory = [
  {
    id: '12320',
    date: '2025-03-21 14:05:32',
    pair: 'BTC/USDT',
    type: 'Limit',
    side: 'Buy',
    price: 94500.00,
    amount: 0.5,
    status: 'Filled',
    total: 47250.00
  },
  {
    id: '12321',
    date: '2025-03-21 16:42:18',
    pair: 'ETH/USDT',
    type: 'Market',
    side: 'Sell',
    price: 5780.50,
    amount: 2.8,
    status: 'Filled',
    total: 16185.40
  },
  {
    id: '12325',
    date: '2025-03-21 20:17:45',
    pair: 'SOL/USDT',
    type: 'Limit',
    side: 'Sell',
    price: 418.25,
    amount: 25,
    status: 'Canceled',
    total: 10456.25
  },
  {
    id: '12330',
    date: '2025-03-22 07:33:12',
    pair: 'ADA/USDT',
    type: 'Limit',
    side: 'Buy',
    price: 2.15,
    amount: 2500,
    status: 'Filled',
    total: 5375.00
  }
];

export const demoTradeHistory = [
  {
    id: 'T-45678',
    date: '2025-03-22 08:12:34',
    pair: 'BTC/USDT',
    side: 'Buy',
    price: 95200.75,
    amount: 0.15,
    fee: '0.00015 BTC',
    total: 14280.11
  },
  {
    id: 'T-45679',
    date: '2025-03-22 09:05:21',
    pair: 'ETH/USDT',
    side: 'Sell',
    price: 5845.50,
    amount: 1.2,
    fee: '0.0012 ETH',
    total: 7014.60
  },
  {
    id: 'T-45680',
    date: '2025-03-22 10:23:47',
    pair: 'SOL/USDT',
    side: 'Buy',
    price: 420.25,
    amount: 8,
    fee: '0.008 SOL',
    total: 3362.00
  },
  {
    id: 'T-45681',
    date: '2025-03-22 11:18:59',
    pair: 'DOT/USDT',
    side: 'Sell',
    price: 38.75,
    amount: 125,
    fee: '0.125 DOT',
    total: 4843.75
  }
];

export const demoOpenOrders = [
  {
    id: '12345',
    date: '2025-03-22 09:32:15',
    pair: 'BTC/USDT',
    type: 'Limit',
    side: 'Buy',
    price: 95800.50,
    amount: 0.25,
    amountPerIceberg: 0.05,
    filled: '0%',
    total: 23950.13
  },
  {
    id: '12346',
    date: '2025-03-22 09:35:42',
    pair: 'ETH/USDT',
    type: 'Limit',
    side: 'Sell',
    price: 5872.25,
    amount: 3.5,
    amountPerIceberg: 0.5,
    filled: '28%',
    total: 20552.88
  },
  {
    id: '12347',
    date: '2025-03-22 10:15:03',
    pair: 'SOL/USDT',
    type: 'Market',
    side: 'Buy',
    price: 421.75,
    amount: 15,
    amountPerIceberg: 3,
    filled: '60%',
    total: 6326.25
  }
];

export const demoFunds = [
  {
    asset: 'BTC',
    available: 1.25,
    inOrder: 0.25,
    total: 1.5,
    estimatedValue: 143700.75
  },
  {
    asset: 'ETH',
    available: 12.5,
    inOrder: 3.5,
    total: 16,
    estimatedValue: 93956.00
  },
  {
    asset: 'SOL',
    available: 85.2,
    inOrder: 15,
    total: 100.2,
    estimatedValue: 42259.35
  },
  {
    asset: 'USDT',
    available: 52750.45,
    inOrder: 30829.26,
    total: 83579.71,
    estimatedValue: 83579.71
  },
  {
    asset: 'ADA',
    available: 8500,
    inOrder: 2500,
    total: 11000,
    estimatedValue: 23650.00
  }
];


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