"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrderbook } from "@/Context/OrderBookContext";
import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "react-hot-toast"; // Import the toast function

const API_TYPE = { Limit: "limit", Market: "market", "Stop Limit": "stop_limit" };

export default function TradingForm() {
  const { rawOrderbook, connected, connectionStatus, refreshOrders } = useOrderbook();
  const [balance, setBalance] = useState({ USDT: 0, BTC: 0, reservedUSDT: 0, reservedBTC: 0 });
  const { user } = useAuthStore();

  // Spendable balances come from the engine's ledger. Refreshed on an interval
  // because fills happen server-side whether or not this tab does anything.
  const fetchBalances = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const { data } = await axios.get("/api/balances");
      setBalance({
        USDT: parseFloat(data.cash_available) || 0,
        BTC: parseFloat(data.btc_available) || 0,
        reservedUSDT: parseFloat(data.cash_reserved) || 0,
        reservedBTC: parseFloat(data.btc_reserved) || 0,
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 3000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const [orderType, setOrderType] = useState("Limit");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [buyStopPrice, setBuyStopPrice] = useState("");
  const [sellStopPrice, setSellStopPrice] = useState("");
  const [buyAmount, setBuyAmount] = useState("1");
  const [sellAmount, setSellAmount] = useState("1");
  const [buyError, setBuyError] = useState("");
  const [sellError, setSellError] = useState("");
  const [marketPrice, setMarketPrice] = useState(null);

  // One placement path for both sides: submit to the engine, then refresh the
  // book overlay and balances so the reservation shows up immediately.
  const placeOrder = async (side, { price, stopPrice, amount }) => {
    const payload = {
      side,
      type: API_TYPE[orderType],
      quantity: String(amount),
    };
    if (orderType !== "Market") payload.limit_price = String(price);
    if (orderType === "Stop Limit") payload.stop_price = String(stopPrice);
    const { data } = await axios.post("/api/orders", payload);
    refreshOrders();
    fetchBalances();
    return data;
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  const parseInput = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const validateNumberInput = (value) => {
    return /^[0-9]*\.?[0-9]*$/.test(value);
  };

  const buyTotal = buyPrice && buyAmount ? parseInput(buyPrice) * parseInput(buyAmount) : 0;
  const sellTotal = sellPrice && sellAmount ? parseInput(sellPrice) * parseInput(sellAmount) : 0;

  useEffect(() => {
    if (rawOrderbook && rawOrderbook.bids.length > 0 && rawOrderbook.asks.length > 0) {
      const bestBid = parseFloat(rawOrderbook.bids[0].price);
      const bestAsk = parseFloat(rawOrderbook.asks[0].price);

      const avgPrice = (bestBid + bestAsk) / 2;
      setMarketPrice(avgPrice);

      if (!buyPrice) setBuyPrice(formatPrice(avgPrice));
      if (!sellPrice) setSellPrice(formatPrice(avgPrice));
    }
  }, [rawOrderbook, buyPrice, sellPrice]);

  // Place buy order
  const handleBuy = async () => {
    setBuyError("");

    try {
      if (orderType !== "Market" && parseInput(buyPrice) <= 0) {
        throw new Error("Please enter a valid price");
      }
      if (orderType === "Stop Limit" && parseInput(buyStopPrice) <= 0) {
        throw new Error("Please enter a valid stop price");
      }
      if (parseInput(buyAmount) <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const finalPrice = orderType === "Market" ? marketPrice : parseInput(buyPrice);
      const cost = finalPrice * parseInput(buyAmount);

      // Immediate feedback only — the engine is the authority and will reject
      // on its own check if a concurrent order got there first.
      if (cost > balance.USDT) {
        throw new Error(
          `Insufficient USDT balance (${balance.USDT.toFixed(2)} USDT available)`
        );
      }

      await placeOrder("buy", {
        price: parseInput(buyPrice),
        stopPrice: parseInput(buyStopPrice),
        amount: parseInput(buyAmount),
      });

      toast.success(
        orderType === "Market"
          ? `Market buy submitted: ${parseInput(buyAmount)} BTC`
          : `Buy order placed: ${parseInput(buyAmount)} BTC at ${formatPrice(finalPrice)} USDT`,
        {
          duration: 4000,
          position: "top-right",
          style: {
            background: '#10B981',
            color: '#fff',
            border: '1px solid #065F46',
          },
          icon: '🔄',
        }
      );

      setBuyAmount("1");
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      setBuyError(message);
      toast.error(message, {
        duration: 4000,
        position: "top-right",
        style: {
          background: '#EF4444',
          color: '#fff',
          border: '1px solid #991B1B',
        },
      });
    }
  };

  // Place sell order
  const handleSell = async () => {
    setSellError("");

    try {
      if (orderType !== "Market" && parseInput(sellPrice) <= 0) {
        throw new Error("Please enter a valid price");
      }
      if (orderType === "Stop Limit" && parseInput(sellStopPrice) <= 0) {
        throw new Error("Please enter a valid stop price");
      }
      if (parseInput(sellAmount) <= 0) {
        throw new Error("Please enter a valid amount");
      }
      if (parseInput(sellAmount) > balance.BTC) {
        throw new Error(
          `Insufficient BTC balance (${balance.BTC.toFixed(8)} BTC available)`
        );
      }

      const finalPrice = orderType === "Market" ? marketPrice : parseInput(sellPrice);

      await placeOrder("sell", {
        price: parseInput(sellPrice),
        stopPrice: parseInput(sellStopPrice),
        amount: parseInput(sellAmount),
      });

      toast.success(
        orderType === "Market"
          ? `Market sell submitted: ${parseInput(sellAmount)} BTC`
          : `Sell order placed: ${parseInput(sellAmount)} BTC at ${formatPrice(finalPrice)} USDT`,
        {
          duration: 4000,
          position: "top-right",
          style: {
            background: '#EF4444',
            color: '#fff',
            border: '1px solid #991B1B',
          },
          icon: '🔄',
        }
      );

      setSellAmount("1");
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      setSellError(message);
      toast.error(message, {
        duration: 4000,
        position: "top-right",
        style: {
          background: '#EF4444',
          color: '#fff',
          border: '1px solid #991B1B',
        },
      });
    }
  };

  return (
    <div className="bg-[#111722] text-white p-4 rounded-xl w-full mx-auto shadow-xl border border-gray-800">
      {/* Order Type Buttons */}
      <div className="flex space-x-3 mb-4 items-center justify-between">
        <div>
          {["Limit", "Market", "Stop Limit"].map((type) => (
            <button
              key={type}
              className={`px-3 py-1.5 rounded-lg text-sm ${orderType === type
                ? "text-yellow-400 font-bold"
                : "text-white hover:bg-gray-800 transition-colors duration-200"
                }`}
              onClick={() => setOrderType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        {/* Connection Status */}
        <div className="mb-3 w-64 flex items-center justify-end">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              connected
                ? 'bg-green-500'
                : connectionStatus === 'closed'
                  ? 'bg-red-500'
                  : 'bg-amber-500 animate-pulse'
            }`}
          ></div>
          <span className="text-xs text-gray-400">
            {connected
              ? 'Connected to Orderbook'
              : connectionStatus === 'reconnecting'
                ? 'Reconnecting to Orderbook...'
                : connectionStatus === 'connecting'
                  ? 'Connecting to Orderbook...'
                  : 'Disconnected from Orderbook'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BUY SIDE */}
        <div className="bg-[#111722] p-3 rounded-lg border border-gray-800 shadow-lg">
          {/* Stop Price Input (stop-limit only) */}
          {orderType === "Stop Limit" && (
            <div className="mb-3">
              <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
                <div className="absolute top-1 left-2 text-gray-400 text-xs">
                  Stop Price (triggers at or above)
                </div>
                <input
                  type="text"
                  value={buyStopPrice}
                  onChange={(e) => {
                    if (validateNumberInput(e.target.value)) setBuyStopPrice(e.target.value);
                  }}
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm text-white"
                />
                <div className="absolute top-1 right-2 text-gray-400 text-xs">USDT</div>
              </div>
            </div>
          )}

          {/* Price Input */}
          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                Price per BTC
              </div>
              <input
                type="text"
                value={orderType === "Market" ? "Market Price" : buyPrice}
                onChange={(e) => {
                  if (validateNumberInput(e.target.value)) {
                    setBuyPrice(e.target.value);
                  }
                }}
                disabled={orderType === "Market"}
                className={`w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm ${orderType === "Market" ? "text-gray-500" : "text-white"
                  }`}
              />
              <div className="absolute top-1 right-2 text-gray-400 text-xs">
                USDT
              </div>
            </div>
          </div>

          {/* Amount Input (BTC to buy) */}
          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                BTC to Buy
              </div>
              <input
                type="text"
                value={buyAmount}
                onChange={(e) => {
                  if (validateNumberInput(e.target.value)) {
                    setBuyAmount(e.target.value);
                  }
                }}
                className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm text-white"
              />
              <div className="absolute top-1 right-2 text-gray-400 text-xs">
                BTC
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="mb-3 bg-gray-800 border border-gray-700 rounded-lg p-2 flex justify-between items-center">
            <span className="text-gray-400 text-xs">Total Cost:</span>
            <span className="text-white text-sm">
              {orderType === "Market" && marketPrice
                ? (parseInput(buyAmount) * marketPrice).toFixed(2)
                : buyTotal.toFixed(2)} USDT
            </span>
          </div>

          {/* Available Balance */}
          <div className="flex justify-between text-gray-400 mb-3 text-xs">
            <span>Available</span>
            <span>{balance.USDT.toFixed(2)} USDT</span>
          </div>

          {/* Market Price */}
          {marketPrice && (
            <div className="flex justify-between text-gray-400 mb-3 text-xs">
              <span>Current Market Price</span>
              <span>{formatPrice(marketPrice)} USDT</span>
            </div>
          )}

          {buyError && <div className="mb-3 text-red-500 text-xs">{buyError}</div>}

          <button
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium shadow-lg text-sm transition-colors duration-200"
            onClick={handleBuy}
            disabled={!connected}
          >
            Buy BTC
          </button>
        </div>

        {/* SELL SIDE */}
        <div className="bg-[#111722] p-3 rounded-lg border border-gray-800 shadow-lg">
          {/* Stop Price Input (stop-limit only) */}
          {orderType === "Stop Limit" && (
            <div className="mb-3">
              <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
                <div className="absolute top-1 left-2 text-gray-400 text-xs">
                  Stop Price (triggers at or below)
                </div>
                <input
                  type="text"
                  value={sellStopPrice}
                  onChange={(e) => {
                    if (validateNumberInput(e.target.value)) setSellStopPrice(e.target.value);
                  }}
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm text-white"
                />
                <div className="absolute top-1 right-2 text-gray-400 text-xs">USDT</div>
              </div>
            </div>
          )}

          {/* Price Input */}
          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                Price per BTC
              </div>
              <input
                type="text"
                value={orderType === "Market" ? "Market Price" : sellPrice}
                onChange={(e) => {
                  if (validateNumberInput(e.target.value)) {
                    setSellPrice(e.target.value);
                  }
                }}
                disabled={orderType === "Market"}
                className={`w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm ${orderType === "Market" ? "text-gray-500" : "text-white"
                  }`}
              />
              <div className="absolute top-1 right-2 text-gray-400 text-xs">
                USDT
              </div>
            </div>
          </div>

          {/* Amount Input (BTC to sell) */}
          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                BTC to Sell
              </div>
              <input
                type="text"
                value={sellAmount}
                onChange={(e) => {
                  if (validateNumberInput(e.target.value)) {
                    setSellAmount(e.target.value);
                  }
                }}
                className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm text-white"
              />
              <div className="absolute top-1 right-2 text-gray-400 text-xs">
                BTC
              </div>
            </div>
          </div>

          {/* Total Receive */}
          <div className="mb-3 bg-gray-800 border border-gray-700 rounded-lg p-2 flex justify-between items-center">
            <span className="text-gray-400 text-xs">Total Receive:</span>
            <span className="text-white text-sm">
              {orderType === "Market" && marketPrice
                ? (parseInput(sellAmount) * marketPrice).toFixed(2)
                : sellTotal.toFixed(2)} USDT
            </span>
          </div>

          {/* Available Balance */}
          <div className="flex justify-between text-gray-400 mb-3 text-xs">
            <span>Available</span>
            <span>{balance.BTC.toFixed(8)} BTC</span>
          </div>

          {/* Market Price */}
          {marketPrice && (
            <div className="flex justify-between text-gray-400 mb-3 text-xs">
              <span>Current Market Price</span>
              <span>{formatPrice(marketPrice)} USDT</span>
            </div>
          )}

          {sellError && <div className="mb-3 text-red-500 text-xs">{sellError}</div>}

          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium shadow-lg text-sm transition-colors duration-200"
            onClick={handleSell}
            disabled={!connected}
          >
            Sell BTC
          </button>
        </div>
      </div>
    </div>
  );
}