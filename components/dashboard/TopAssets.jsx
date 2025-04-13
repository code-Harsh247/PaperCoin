"use client";
import React from "react";
import { AssetCard } from "@/components/DashboardCards";

const TopAssets = () => {
  const assets = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      price: "$43,267.89",
      changePercentage: 2.4,
      amount: "0.023 BTC",
      color: "bg-yellow-500",
    },
    {
      name: "Solana",
      symbol: "SOL",
      price: "$106.78",
      changePercentage: 5.7,
      amount: "2.3 SOL",
      color: "bg-purple-500",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      price: "$3,128.45",
      changePercentage: 3.1,
      amount: "0.42 ETH",
      color: "bg-blue-500",
    },
    {
      name: "Cardano",
      symbol: "ADA",
      price: "$1.45",
      changePercentage: -1.2,
      amount: "145 ADA",
      color: "bg-blue-400",
    },
  ];

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Top Assets</h2>
        <button className="text-amber-500 text-sm hover:text-amber-400">
          View All
        </button>
      </div>
      <div className="space-y-4">
        {assets.map((asset) => (
          <AssetCard
            key={asset.symbol}
            name={asset.name}
            symbol={asset.symbol}
            price={asset.price}
            changePercentage={asset.changePercentage}
            amount={asset.amount}
            color={asset.color}
          />
        ))}
      </div>
      <button className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors">
        Trade Now
      </button>
    </div>
  );
};

export default TopAssets;
