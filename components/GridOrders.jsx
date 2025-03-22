// components/GridOrders.jsx
"use client"



import React from 'react';
import { demoGridOrders } from './TradingPlatform';

const GridOrders = () => {
  const columns = [
    { id: 'pair', label: 'Pair' },
    { id: 'status', label: 'Status' },
    { id: 'created', label: 'Created' },
    { id: 'range', label: 'Price Range' },
    { id: 'gridCount', label: 'Grid Count' },
    { id: 'profit', label: 'Profit' },
    { id: 'invested', label: 'Invested' },
    { id: 'actions', label: 'Actions' },
  ];

  const gridOrders = demoGridOrders;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium py-2 px-4 rounded">
          Create Grid Bot
        </button>
      </div>
      
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
            {gridOrders.map((order) => (
              <tr key={order.id} className="border-t border-gray-800 hover:bg-gray-800">
                <td className="px-4 py-3 text-sm font-medium">{order.pair}</td>
                <td className={`px-4 py-3 text-sm ${
                  order.status === 'Active' ? 'text-green-500' : 
                  order.status === 'Paused' ? 'text-yellow-500' : 'text-red-500'
                }`}>{order.status}</td>
                <td className="px-4 py-3 text-sm">{order.created}</td>
                <td className="px-4 py-3 text-sm">{order.range}</td>
                <td className="px-4 py-3 text-sm">{order.gridCount}</td>
                <td className="px-4 py-3 text-sm text-green-500">{order.profit}</td>
                <td className="px-4 py-3 text-sm">{order.invested}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex space-x-2">
                    <button className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs">Edit</button>
                    {order.status === 'Active' ? (
                      <button className="bg-yellow-700 hover:bg-yellow-600 text-gray-200 px-2 py-1 rounded text-xs">Pause</button>
                    ) : (
                      <button className="bg-green-700 hover:bg-green-600 text-gray-200 px-2 py-1 rounded text-xs">Resume</button>
                    )}
                    <button className="bg-red-700 hover:bg-red-600 text-gray-200 px-2 py-1 rounded text-xs">Stop</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GridOrders;