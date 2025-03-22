

// components/OpenOrders.jsx
"use client"

import React from 'react';
import { Search } from 'lucide-react';
import { demoOpenOrders } from './TradingPlatform';

const OpenOrders = () => {
  const columns = [
    { id: 'date', label: 'Date' },
    { id: 'pair', label: 'Pair' },
    { id: 'type', label: 'Type', sortable: true },
    { id: 'side', label: 'Side', sortable: true },
    { id: 'price', label: 'Price', sortable: true },
    { id: 'amount', label: 'Amount' },
    { id: 'amountPerIceberg', label: 'Amount per Iceberg Order' },
    { id: 'filled', label: 'Filled' },
    { id: 'total', label: 'Total' },
  ];

  const orders = demoOpenOrders;

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
                  {column.sortable && (
                    <span className="ml-1 inline-block">▼</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-gray-800 hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">{order.date}</td>
                  <td className="px-4 py-3 text-sm">{order.pair}</td>
                  <td className="px-4 py-3 text-sm">{order.type}</td>
                  <td className={`px-4 py-3 text-sm ${order.side === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {order.side}
                  </td>
                  <td className="px-4 py-3 text-sm">{order.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="px-4 py-3 text-sm">{order.amount}</td>
                  <td className="px-4 py-3 text-sm">{order.amountPerIceberg}</td>
                  <td className="px-4 py-3 text-sm">{order.filled}</td>
                  <td className="px-4 py-3 text-sm">{order.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-32">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-800 p-4 rounded-full mb-4">
                      <Search className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400">You have no open orders.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OpenOrders;