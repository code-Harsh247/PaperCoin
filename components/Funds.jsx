

// components/Funds.jsx
"use client"



import React from 'react';
import { demoFunds } from './TradingPlatform';

const Funds = () => {
  const columns = [
    { id: 'asset', label: 'Asset' },
    { id: 'available', label: 'Available' },
    { id: 'inOrder', label: 'In Order' },
    { id: 'total', label: 'Total' },
    { id: 'estimatedValue', label: 'Estimated Value (USDT)' },
  ];

  const funds = demoFunds;
  const totalEstimatedValue = funds.reduce((sum, fund) => sum + fund.estimatedValue, 0);

  return (
    <div>
      <div className="mb-4 p-4 bg-gray-800 rounded-md">
        <div className="text-gray-400 mb-1 text-sm">Total Estimated Value</div>
        <div className="text-xl font-bold">${totalEstimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USDT</div>
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
            {funds.map((fund, index) => (
              <tr key={index} className="border-t border-gray-800 hover:bg-gray-800">
                <td className="px-4 py-3 text-sm font-medium">{fund.asset}</td>
                <td className="px-4 py-3 text-sm">{fund.available.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8})}</td>
                <td className="px-4 py-3 text-sm">{fund.inOrder.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8})}</td>
                <td className="px-4 py-3 text-sm">{fund.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8})}</td>
                <td className="px-4 py-3 text-sm">${fund.estimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Funds;