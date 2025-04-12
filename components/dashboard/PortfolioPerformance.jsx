'use client';
import React, { useState } from 'react';

const PortfolioPerformance = () => {
  const [timeframe, setTimeframe] = useState('1D');
  
  const timeframes = ['1D', '1W', '1M', '1Y'];
  
  const performanceData = {
    'Today': { amount: '+$142.35', percentage: '+2.8%', isPositive: true },
    'This Week': { amount: '+$267.89', percentage: '+5.3%', isPositive: true },
    'This Month': { amount: '-$122.45', percentage: '-2.4%', isPositive: false }
  };
  
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Portfolio Performance</h2>
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              className={`px-3 py-1 text-sm ${
                timeframe === tf ? 'bg-gray-700' : 'bg-gray-900'
              } text-white rounded-lg`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      {/* Placeholder for chart - would integrate with an actual chart library */}
      <div className="h-64 bg-gray-700 bg-opacity-30 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Chart Visualization Here</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {Object.entries(performanceData).map(([period, data]) => (
          <div key={period} className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
            <p className="text-gray-400 text-xs">{period}</p>
            <p className={data.isPositive ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {data.amount}
            </p>
            <p className={data.isPositive ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
              {data.percentage}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioPerformance;