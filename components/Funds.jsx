"use client";

import React, { useEffect, useState } from "react";

const Funds = () => {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFunds = async () => {
      try {
        const response = await fetch("/api/funds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: 1 }), // Hardcoded user_id
        });

        if (!response.ok) {
          throw new Error("Failed to fetch funds");
        }

        const data = await response.json();

        if (data.length > 0 && data[0].assets) {
          const formattedFunds = Object.entries(data[0].assets).map(([asset, details]) => ({
            asset,
            available: details.available,
            inOrder: details.in_order,
            total: details.available + details.in_order,
            estimatedValue: (details.available + details.in_order) * getAssetPrice(asset),
          }));

          setFunds(formattedFunds);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFunds();
  }, []);

  // Mock function to get asset prices (replace with real price fetching later)
  const getAssetPrice = (asset) => {
    const mockPrices = { BTC: 60000, ETH: 3000, USDT: 1 }; // Example prices
    return mockPrices[asset] || 1; // Default price if not listed
  };

  const columns = [
    { id: "asset", label: "Asset" },
    { id: "available", label: "Available" },
    { id: "inOrder", label: "In Order" },
    { id: "total", label: "Total" },
    { id: "estimatedValue", label: "Estimated Value (USDT)" },
  ];

  const totalEstimatedValue = funds.reduce((sum, fund) => sum + fund.estimatedValue, 0);

  return (
    <div>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <>
          <div className="mb-4 p-4 bg-gray-800 rounded-md">
            <div className="text-gray-400 mb-1 text-sm">Total Estimated Value</div>
            <div className="text-xl font-bold">
              ${totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
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
                    <td className="px-4 py-3 text-sm">{fund.available.toFixed(8)}</td>
                    <td className="px-4 py-3 text-sm">{fund.inOrder.toFixed(8)}</td>
                    <td className="px-4 py-3 text-sm">{fund.total.toFixed(8)}</td>
                    <td className="px-4 py-3 text-sm">${fund.estimatedValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Funds;
