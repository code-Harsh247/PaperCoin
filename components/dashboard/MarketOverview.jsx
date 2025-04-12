'use client';
import React, { useState } from 'react';
import { CoinTableRow } from '@/components/DashboardCards';

const MarketOverview = () => {
  const [filter, setFilter] = useState('All');
  
  const filters = ['All', 'Gainer', 'Loser'];
  
  const coins = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      price: "$43,267.89",
      change: 2.4,
      marketCap: "$812.7B",
      color: "bg-yellow-500"
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      price: "$3,128.45",
      change: 3.1,
      marketCap: "$378.5B",
      color: "bg-blue-500"
    },
    {
      name: "Cardano",
      symbol: "ADA",
      price: "$1.45",
      change: -1.2,
      marketCap: "$48.2B",
      color: "bg-blue-400"
    },
    {
      name: "Solana",
      symbol: "SOL",
      price: "$106.78",
      change: 5.7,
      marketCap: "$42.1B",
      color: "bg-purple-500"
    }
  ];
  
  // Filter coins based on selected filter
  const filteredCoins = coins.filter(coin => {
    if (filter === 'All') return true;
    if (filter === 'Gainer') return coin.change > 0;
    if (filter === 'Loser') return coin.change < 0;
    return true;
  });

  const handleTradeClick = (coinName) => {
    console.log(`Trade ${coinName}`);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Market Overview</h2>
        <div className="flex space-x-2">
          {filters.map((filterOption) => (
            <button
              key={filterOption}
              className={`px-3 py-1 text-sm ${
                filter === filterOption ? 'bg-gray-700' : 'bg-gray-900'
              } text-white rounded-lg`}
              onClick={() => setFilter(filterOption)}
            >
              {filterOption}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">24h Change</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCoins.map((coin) => (
                <CoinTableRow
                  key={coin.symbol}
                  name={coin.name}
                  symbol={coin.symbol}
                  price={coin.price}
                  change={coin.change}
                  marketCap={coin.marketCap}
                  color={coin.color}
                  onTradeClick={() => handleTradeClick(coin.name)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;