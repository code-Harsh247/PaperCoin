"use client";
import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import axios from "axios";

const OrderHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await axios.post("/api/trades/fetchTrades", {
          user_id: user.userId
        });
        
        console.log(response.data);
        setTrades(response.data.trades || []);
      } catch (err) {
        setError(err.message || "Failed to fetch trades");
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [user]);

  const columns = [
    { id: "created_at", label: "Date" },
    { id: "id", label: "ID" },
    { id: "trade_type", label: "Type" },
    { id: "price", label: "Price (USDT)" },
    { id: "amount", label: "Amount (BTC)" },
    { id: "filled_amount", label: "Filled" },
    { id: "total", label: "Total Value" },
    { id: "status", label: "Status" },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatCrypto = (amount) => {
    return parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    });
  };

  const calculateTotal = (price, amount) => {
    return parseFloat(price) * parseFloat(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "text-yellow-500";
      case "filled":
        return "text-green-500";
      case "partially_filled":
        return "text-blue-500";
      case "canceled":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getTypeColor = (type) => {
    return type === "bid" ? "text-green-500" : "text-red-500";
  };

  return (
    <div>
      <div className="w-full overflow-x-auto bg-[#111722] rounded-lg">
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
            ) : trades.length > 0 ? (
              trades.map((trade) => (
                <tr key={trade.id} className="border-t border-gray-800 hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm text-gray-300">{formatDate(trade.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">#{trade.id}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${getTypeColor(trade.trade_type)}`}>
                    {trade.trade_type === "bid" ? "Buy" : "Sell"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatPrice(trade.price)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatCrypto(trade.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {parseFloat(trade.filled_amount) > 0 ? formatCrypto(trade.filled_amount) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatPrice(calculateTotal(trade.price, trade.amount))}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${getStatusColor(trade.status)}`}>
                    {trade.status.split("_").map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(" ")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-gray-400">No trades found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;