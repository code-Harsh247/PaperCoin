"use client";

import React, { useEffect, useState } from "react";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        const response = await fetch("/api/orderHistory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: 1 }),
        });

        if (!response.ok) throw new Error("Failed to fetch order history");

        const data = await response.json();
        console.log(data);
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderHistory();
  }, []);

  const columns = [
    { id: "trade_time", label: "Date" },
    { id: "symbol", label: "Pair" },
    { id: "order_type", label: "Type" },
    { id: "side", label: "Side" },
    { id: "price", label: "Price" },
    { id: "amount", label: "Amount" },
    { id: "trade_status", label: "Status" },
    { id: "total", label: "Total" },
  ];

  return (
    <div>
      <div className="w-full overflow-x-auto bg-[#111722]">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-gray-400">Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-red-500">{error}</td>
              </tr>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.order_id} className="border-t border-gray-800 hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm">{new Date(order.trade_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{order.symbol}</td>
                  <td className="px-4 py-3 text-sm">{order.order_type}</td>
                  <td className={`px-4 py-3 text-sm ${order.side === "buy" ? "text-green-500" : "text-red-500"}`}>
                    {order.side.charAt(0).toUpperCase() + order.side.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.amount).toFixed(8)}</td>
                  <td className={`px-4 py-3 text-sm ${
                    order.trade_status === "Filled" ? "text-green-500" :
                    order.trade_status === "Canceled" ? "text-red-500" : "text-yellow-500"
                  }`}>{order.trade_status}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(order.total).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-gray-400">No order history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;