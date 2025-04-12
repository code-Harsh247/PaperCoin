"use client";

import { useState, useEffect } from "react";

export default function TradingForm() {
  const [orderType, setOrderType] = useState("Limit");
  const [buyPrice, setBuyPrice] = useState("63280.42");
  const [sellPrice, setSellPrice] = useState("63280.42");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [bitcoinPrice, setBitcoinPrice] = useState("63280.42");

  useEffect(() => {
    // Fetch Bitcoin price on component mount
    const fetchBitcoinPrice = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const data = await response.json();
        if (data && data.price) {
          const formattedPrice = parseFloat(data.price).toFixed(2);
          setBitcoinPrice(formattedPrice);
          setBuyPrice(formattedPrice);
          setSellPrice(formattedPrice);
        }
      } catch (error) {
        console.error("Error fetching Bitcoin price:", error);
      }
    };
    
    fetchBitcoinPrice();
  }, []);

  return (
    <div className="bg-[#111722] text-white p-4 rounded-xl w-full mx-auto shadow-xl border border-gray-800">
      <div className="flex space-x-3 mb-4 items-center">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm ${
            orderType === "Limit"
              ? "text-yellow-400 font-bold"
              : "text-white hover:bg-gray-800 transition-colors duration-200"
          }`}
          onClick={() => setOrderType("Limit")}
        >
          Limit
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-sm ${
            orderType === "Market"
              ? "text-yellow-400 font-bold"
              : "text-white hover:bg-gray-800 transition-colors duration-200"
          }`}
          onClick={() => setOrderType("Market")}
        >
          Market
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center ${
            orderType === "Stop Limit"
              ? "text-yellow-400 font-bold"
              : "text-white hover:bg-gray-800 transition-colors duration-200"
          }`}
          onClick={() => setOrderType("Stop Limit")}
        >
          Stop Limit
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buy Side */}
        <div className="bg-[#111722] p-3 rounded-lg border border-gray-800 shadow-lg">
          {orderType === "Stop Limit" && (
            <div className="mb-3">
              <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
                <div className="absolute top-1 left-2 text-gray-400 text-xs">
                  Stop
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute top-1 right-2 text-gray-400 text-xs">USDT</div>
              </div>
            </div>
          )}

          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                {orderType === "Stop Limit" ? "Limit" : "Price"}
              </div>
              {orderType === "Market" ? (
                <input
                  type="text"
                  value="Market Price"
                  disabled
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm text-gray-500"
                />
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  value={buyPrice}
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    if (/^[0-9]*\.?[0-9]*$/.test(e.target.value) || e.target.value === '') {
                      setBuyPrice(e.target.value);
                    }
                  }}
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}
              <div className="absolute top-1 right-2 text-gray-400 text-xs">USDT</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                Amount
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*\.?[0-9]*"
                value={buyAmount}
                onChange={(e) => {
                  // Only allow numbers and decimal point
                  if (/^[0-9]*\.?[0-9]*$/.test(e.target.value) || e.target.value === '') {
                    setBuyAmount(e.target.value);
                  }
                }}
                className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder=""
              />
              <div className="absolute top-1 right-2 text-gray-400 text-xs">BTC</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex justify-between items-center text-sm">
              <div className="text-gray-400">Total</div>
              <div className="text-gray-400">
                <span>Min 10 USDT</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-gray-400 mb-3 text-xs">
            <span>Available</span>
            <div className="flex items-center">
              <span>0.00000000 USDT</span>
            </div>
          </div>

          <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium shadow-lg text-sm transition-colors duration-200">
            Buy BTC
          </button>
        </div>

        {/* Sell Side */}
        <div className="bg-[#111722] p-3 rounded-lg border border-gray-800 shadow-lg">
          {orderType === "Stop Limit" && (
            <div className="mb-3">
              <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
                <div className="absolute top-1 left-2 text-gray-400 text-xs">
                  Stop
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute top-1 right-2 text-gray-400 text-xs">USDT</div>
              </div>
            </div>
          )}

          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                {orderType === "Stop Limit" ? "Limit" : "Price"}
              </div>
              {orderType === "Market" ? (
                <input
                  type="text"
                  value="Market Price"
                  disabled
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm text-gray-500"
                />
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  value={sellPrice}
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    if (/^[0-9]*\.?[0-9]*$/.test(e.target.value) || e.target.value === '') {
                      setSellPrice(e.target.value);
                    }
                  }}
                  className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}
              <div className="absolute top-1 right-2 text-gray-400 text-xs">USDT</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg relative">
              <div className="absolute top-1 left-2 text-gray-400 text-xs">
                Amount
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*\.?[0-9]*"
                value={sellAmount}
                onChange={(e) => {
                  // Only allow numbers and decimal point
                  if (/^[0-9]*\.?[0-9]*$/.test(e.target.value) || e.target.value === '') {
                    setSellAmount(e.target.value);
                  }
                }}
                className="w-full bg-transparent pt-6 pb-1.5 px-2 focus:outline-none text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder=""
              />
              <div className="absolute top-1 right-2 text-gray-400 text-xs">BTC</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex justify-between items-center text-sm">
              <div className="text-gray-400">Total</div>
              <div className="text-gray-400">
                <span>Min 10 USDT</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-gray-400 mb-3 text-xs">
            <span>Available</span>
            <div className="flex items-center">
              <span>0.00000000 BTC</span>
            </div>
          </div>

          <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium shadow-lg text-sm transition-colors duration-200">
            Sell BTC
          </button>
        </div>
      </div>
    </div>
  );
}