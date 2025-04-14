"use client";
import React, { useState } from "react";
import { CoinTableRow } from "@/components/DashboardCards";
import { color } from "@amcharts/amcharts5";

const MarketOverview = () => {
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Gainer", "Loser"];

  // fetching data from API
  const fetchData = async (coin) => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${coin.symbol}`
      ); // Replace with your API endpoint
      const data = await response.json();
      // console.log(data); // Log the fetched data
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const coin = [
    {
      name: "Bitcoin",
      symbol: "BTCUSDT",
      color: "bg-yellow-500",
      marketCap: "2.1T",
    },
    {
      name: "Ethereum",
      symbol: "ETHUSDT",
      color: "bg-blue-500",
      marketCap: "980.1B",
    },
    {
      name: "Cardano",
      symbol: "ADAUSDT",
      color: "bg-blue-400",
      marketCap: "45.1B",
    },
    {
      name: "Solana",
      symbol: "SOLUSDT",
      color: "bg-purple-500",
      marketCap: "35.1B",
    },
    {
      name: "Litecoin",
      symbol: "LTCUSDT",
      color: "bg-gray-500",
      marketCap: "10.1B",
    },
    {
      name: "Ripple",
      symbol: "XRPUSDT",
      color: "bg-green-500",
      marketCap: "25.1B",
    },
    {
      name: "Polkadot",
      symbol: "DOTUSDT",
      color: "bg-red-500",
      marketCap: "20.1B",
    },
    {
      name: "Chainlink",
      symbol: "LINKUSDT",
      color: "bg-yellow-400",
      marketCap: "15.1B",
    },
    {
      name: "Dogecoin",
      symbol: "DOGEUSDT",
      color: "bg-yellow-600",
      marketCap: "10.1B",
    },
    {
      name: "Shiba Inu",
      symbol: "SHIBUSDT",
      color: "bg-pink-500",
      marketCap: "5.1B",
    },
  ]; // Example coin symbols

  // Removed unused 'data' declaration
  const [coins, setCoins] = useState([]);

  React.useEffect(() => {
    Promise.all(
      coin.map(async (coin) => {
        const data = await fetchData(coin);
        console.log(data); // Log the fetched data
        return {
          name: coin.name,
          symbol: data.symbol,
          price: data.weightedAvgPrice,
          change: data.priceChangePercent,
          marketCap: coin.marketCap,
          color: coin.color,
        };
      })
    ).then((result) => {
      // console.log(result); // Log the result of all promises
      setCoins(result); // Update state with the fetched coins
    }); // Handle asynchronous operations properly
  }, []); // Run only once on component mount

  console.log(coins); // Log the coins state
  // Filter coins based on selected filter
  const filteredCoins = coins.filter((coin) => {
    if (filter === "All") return true;
    if (filter === "Gainer") return coin.change > 0;
    if (filter === "Loser") return coin.change < 0;
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
                filter === filterOption ? "bg-gray-700" : "bg-gray-900"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  24h Change
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Market Cap
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCoins.map((coin) => (
                <CoinTableRow
                  key={coin.symbol}
                  name={coin.name}
                  symbol={coin.symbol.substring(0, 3)}
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
