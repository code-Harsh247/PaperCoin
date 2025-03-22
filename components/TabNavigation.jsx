"use client";

import React, { useEffect, useState } from "react";

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/openOrders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: 1 }),
        });

        if (!response.ok) throw new Error("Failed to fetch orders");

        const data = await response.json();
        setOrderCount(data.length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const tabs = [
    { id: "openOrders", label: `Open Orders(${loading ? "..." : orderCount})` },
    { id: "orderHistory", label: "Order History" },
    { id: "funds", label: "Funds" },
  ];

  return (
    <div className="flex border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`py-2 px-4 font-medium whitespace-nowrap ${
            activeTab === tab.id
              ? "text-yellow-500 border-b-2 border-yellow-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
