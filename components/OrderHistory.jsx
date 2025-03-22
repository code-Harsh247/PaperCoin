

// components/OrderHistory.jsx
"use client"

import React from 'react';
import { demoOrderHistory } from './TradingPlatform';

const OrderHistory = () => {
  const columns = [
    { id: 'date', label: 'Date' },
    { id: 'pair', label: 'Pair' },
    { id: 'type', label: 'Type' },
    { id: 'side', label: 'Side' },
    { id: 'price', label: 'Price' },
    { id: 'amount', label: 'Amount' },
    { id: 'status', label: 'Status' },
    { id: 'total', label: 'Total' },
  ];

  const orders = demoOrderHistory;

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.id} 
                  className="px-4 py-2 text-left text-sm font-medium text-gray-400"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-gray-800 hover:bg-gray-800">
                <td className="px-4 py-3 text-sm">{order.date}</td>
                <td className="px-4 py-3 text-sm">{order.pair}</td>
                <td className="px-4 py-3 text-sm">{order.type}</td>
                <td className={`px-4 py-3 text-sm ${order.side === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {order.side}
                </td>
                <td className="px-4 py-3 text-sm">{order.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="px-4 py-3 text-sm">{order.amount}</td>
                <td className={`px-4 py-3 text-sm ${
                  order.status === 'Filled' ? 'text-green-500' : 
                  order.status === 'Canceled' ? 'text-red-500' : 'text-yellow-500'
                }`}>{order.status}</td>
                <td className="px-4 py-3 text-sm">{order.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;