"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";

const OpenOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/openOrders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: 1 }),
        });

        if (!response.ok) throw new Error("Failed to fetch orders");

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const columns = [
    { id: "trade_time", label: "Date" },
    { id: "symbol", label: "Pair" },
    { id: "order_type", label: "Type", sortable: true },
    { id: "side", label: "Side", sortable: true },
    { id: "price", label: "Price", sortable: true },
    { id: "amount", label: "Amount" },
    { id: "filled", label: "Filled" },
    { id: "total", label: "Total" },
  ];

  if (loading) return <p className="text-gray-400">Loading orders...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                  {column.label}
                  {column.sortable && <span className="ml-1 inline-block">▼</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.order_id} className="border-t border-gray-800 hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">{new Date(order.trade_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{order.symbol}</td>
                  <td className="px-4 py-3 text-sm">{order.order_type}</td>
                  <td className={`px-4 py-3 text-sm ${order.side === "buy" ? "text-green-500" : "text-red-500"}`}>
                    {order.side.charAt(0).toUpperCase() + order.side.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.amount)}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.filled)}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
