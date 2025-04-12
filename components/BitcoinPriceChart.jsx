import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const BitcoinPriceChart = () => {
  // Mock Bitcoin price data for the last month (daily)
  const mockData = [
    { date: 'Mar 08', price: 41250.45, volume: 32.4 },
    { date: 'Mar 09', price: 40890.12, volume: 28.7 },
    { date: 'Mar 10', price: 41356.78, volume: 30.1 },
    { date: 'Mar 11', price: 42105.34, volume: 35.6 },
    { date: 'Mar 12', price: 42780.56, volume: 38.2 },
    { date: 'Mar 13', price: 43120.89, volume: 42.5 },
    { date: 'Mar 14', price: 43567.23, volume: 45.8 },
    { date: 'Mar 15', price: 44231.45, volume: 48.3 },
    { date: 'Mar 16', price: 43980.67, volume: 43.1 },
    { date: 'Mar 17', price: 43750.32, volume: 41.7 },
    { date: 'Mar 18', price: 42980.56, volume: 37.9 },
    { date: 'Mar 19', price: 42340.12, volume: 35.2 },
    { date: 'Mar 20', price: 42670.45, volume: 36.8 },
    { date: 'Mar 21', price: 43125.78, volume: 39.4 },
    { date: 'Mar 22', price: 43890.23, volume: 42.1 },
    { date: 'Mar 23', price: 44230.67, volume: 45.6 },
    { date: 'Mar 24', price: 44780.12, volume: 48.9 },
    { date: 'Mar 25', price: 45120.45, volume: 52.3 },
    { date: 'Mar 26', price: 45670.89, volume: 56.7 },
    { date: 'Mar 27', price: 45430.23, volume: 53.4 },
    { date: 'Mar 28', price: 45120.56, volume: 51.2 },
    { date: 'Mar 29', price: 44890.34, volume: 49.5 },
    { date: 'Mar 30', price: 44230.67, volume: 46.8 },
    { date: 'Mar 31', price: 43950.12, volume: 44.3 },
    { date: 'Apr 01', price: 43780.45, volume: 43.5 },
    { date: 'Apr 02', price: 44230.89, volume: 45.7 },
    { date: 'Apr 03', price: 44670.23, volume: 48.9 },
    { date: 'Apr 04', price: 45120.56, volume: 51.2 },
    { date: 'Apr 05', price: 45456.78, volume: 53.6 },
    { date: 'Apr 06', price: 45780.34, volume: 55.4 },
    { date: 'Apr 07', price: 46250.89, volume: 58.7 },
  ];

  // Time period state
  const [timePeriod, setTimePeriod] = useState('1M');

  // Filter data based on selected time period
  const getFilteredData = () => {
    switch (timePeriod) {
      case '1D':
        return mockData.slice(-2);
      case '1W':
        return mockData.slice(-7);
      case '1M':
        return mockData;
      case '1Y':
        // In a real app, this would show a year's worth of data
        return mockData;
      default:
        return mockData;
    }
  };

  // Calculate price change and percentage
  const filteredData = getFilteredData();
  const firstPrice = filteredData[0]?.price || 0;
  const lastPrice = filteredData[filteredData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercentage = ((priceChange / firstPrice) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg">
          <p className="text-gray-200 text-sm">{payload[0].payload.date}</p>
          <p className="font-bold text-yellow-500">${payload[0].value.toLocaleString()}</p>
          <p className="text-gray-300 text-xs">Volume: {payload[0].payload.volume} BTC</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Bitcoin</h2>
          <div className="flex items-center mt-1">
            <span className="text-2xl font-bold text-white mr-2">${lastPrice.toLocaleString()}</span>
            <span className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercentage}%)
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 text-sm ${timePeriod === '1D' ? 'bg-gray-700' : 'bg-gray-900'} text-white rounded-lg transition-colors duration-200`}
            onClick={() => setTimePeriod('1D')}
          >
            1D
          </button>
          <button 
            className={`px-3 py-1 text-sm ${timePeriod === '1W' ? 'bg-gray-700' : 'bg-gray-900'} text-white rounded-lg transition-colors duration-200`}
            onClick={() => setTimePeriod('1W')}
          >
            1W
          </button>
          <button 
            className={`px-3 py-1 text-sm ${timePeriod === '1M' ? 'bg-gray-700' : 'bg-gray-900'} text-white rounded-lg transition-colors duration-200`}
            onClick={() => setTimePeriod('1M')}
          >
            1M
          </button>
          <button 
            className={`px-3 py-1 text-sm ${timePeriod === '1Y' ? 'bg-gray-700' : 'bg-gray-900'} text-white rounded-lg transition-colors duration-200`}
            onClick={() => setTimePeriod('1Y')}
          >
            1Y
          </button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F7931A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F7931A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="date"
              tick={{ fill: '#9CA3AF' }}
              axisLine={{ stroke: '#4B5563' }}
              tickLine={false}
            />
            <YAxis 
              domain={['dataMin - 200', 'dataMax + 200']}
              tick={{ fill: '#9CA3AF' }}
              axisLine={{ stroke: '#4B5563' }}
              tickLine={false}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#F7931A" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
          <p className="text-gray-400 text-xs">Market Cap</p>
          <p className="text-white font-medium">$897.4B</p>
          <p className={`${isPositive ? 'text-green-500' : 'text-red-500'} text-xs`}>
            {isPositive ? '+' : ''}{priceChangePercentage}%
          </p>
        </div>

        <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
          <p className="text-gray-400 text-xs">24h Volume</p>
          <p className="text-white font-medium">$21.8B</p>
          <p className="text-gray-400 text-xs">594,231 BTC</p>
        </div>

        <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
          <p className="text-gray-400 text-xs">Your Position</p>
          <p className="text-white font-medium">$4,625.09</p>
          <p className="text-gray-400 text-xs">0.1 BTC</p>
        </div>
      </div>
    </div>
  );
};

export default BitcoinPriceChart;