'use client';
import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMatchingEngine } from "@/Context/MatchingEngineContext"; // adjust path if needed
import axios from "axios";

const OrderHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingIds, setCancellingIds] = useState(new Set());
  const { user } = useAuthStore();
  const { cancelTrade } = useMatchingEngine();

  // Keep a ref to the latest trades for comparison inside the polling callback
  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  // Utility to detect meaningful changes
  const haveTradesChanged = (oldTrades, newTrades) => {
    if (oldTrades.length !== newTrades.length) return true;
    return oldTrades.some((old, idx) => {
      const neu = newTrades[idx];
      return (
        old.id !== neu.id ||
        old.status !== neu.status ||
        old.filled_amount !== neu.filled_amount
      );
    });
  };

  const fetchTrades = async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/trades/fetchTrades", {
        user_id: user.userId
      });
      const newTrades = response.data.trades || [];

      if (haveTradesChanged(tradesRef.current, newTrades)) {
        console.log("[OrderHistory] Trades updated");
        setTrades(newTrades);
      }
    } catch (err) {
      console.error("[OrderHistory] Fetch error:", err);
      setError(err.message || "Failed to fetch trades");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + polling every 3s
  useEffect(() => {
    if (!user?.userId) return;

    // initial load
    fetchTrades();

    const interval = setInterval(() => {
      fetchTrades();
    }, 2000);

    return () => clearInterval(interval);
  }, [user?.userId]);

  const handleCancelTrade = async (tradeId) => {
    setCancellingIds(prev => new Set(prev).add(tradeId));
    setTrades(curr =>
      curr.map(t => t.id === tradeId ? { ...t, status: "cancelling" } : t)
    );

    try {
      const success = await cancelTrade(tradeId);
      setTrades(curr =>
        curr.map(t =>
          t.id === tradeId
            ? { ...t, status: success ? "canceled" : (t.status === "cancelling" ? "open" : t.status) }
            : t
        )
      );
    } catch (err) {
      console.error("[OrderHistory] Error cancelling:", err);
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(tradeId);
        return next;
      });
    }
  };

  const columns = [
    { id: "created_at", label: "Date" },
    { id: "id", label: "ID" },
    { id: "trade_type", label: "Type" },
    { id: "price", label: "Price (USDT)" },
    { id: "amount", label: "Amount (BTC)" },
    { id: "filled_amount", label: "Filled" },
    { id: "total", label: "Total Value" },
    { id: "status", label: "Status" },
    { id: "actions", label: "Actions" },
  ];

  const formatDate = d => new Date(d).toLocaleString();
  const formatPrice = p =>
    parseFloat(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatCrypto = a =>
    parseFloat(a).toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  const calculateTotal = (p, a) => parseFloat(p) * parseFloat(a);
  const getStatusColor = s => ({
    open: "text-yellow-500",
    filled: "text-green-500",
    partially_filled: "text-blue-500",
    canceled: "text-red-500",
    cancelling: "text-gray-400",
  }[s] || "text-gray-400");
  const getTypeColor = t => (t === "bid" ? "text-green-500" : "text-red-500");
  const canBeCancelled = t => t.status === "open" || t.status === "partially_filled";

  return (
    <div>
      <div className="mb-2 text-xs text-gray-500">Auto‑refresh every 2s</div>
      <div className="w-full overflow-x-auto bg-[#111722] rounded-lg">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.id}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-400"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-red-500">
                  {error}
                </td>
              </tr>
            ) : trades.length > 0 ? (
              trades.map(trade => (
                <tr
                  key={trade.id}
                  className="border-t border-gray-800 hover:bg-gray-800"
                >
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatDate(trade.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">#{trade.id}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${getTypeColor(trade.trade_type)}`}>
                    {trade.trade_type === "bid" ? "Buy" : "Sell"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatPrice(trade.price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatCrypto(trade.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {parseFloat(trade.filled_amount) > 0
                      ? formatCrypto(trade.filled_amount)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {formatPrice(calculateTotal(trade.price, trade.amount))}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${getStatusColor(trade.status)}`}>
                    {trade.status === "cancelling"
                      ? "Cancelling..."
                      : trade.status
                          .split("_")
                          .map(w => w[0].toUpperCase() + w.slice(1))
                          .join(" ")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {canBeCancelled(trade) && (
                      <button
                        onClick={() => handleCancelTrade(trade.id)}
                        disabled={cancellingIds.has(trade.id)}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          cancellingIds.has(trade.id)
                            ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        {cancellingIds.has(trade.id) ? "Cancelling..." : "Cancel"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-gray-400">
                  No trades found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;
