"use client";

import { useState } from "react";

export default function TradingForm() {
  const [orderType, setOrderType] = useState("Limit");
  const [buyPrice, setBuyPrice] = useState("0.638");
  const [sellPrice, setSellPrice] = useState("0.638");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [buyTpSl, setBuyTpSl] = useState(false);
  const [sellTpSl, setSellTpSl] = useState(false);

  return (
    <div className="bg-gray-900 text-white p-6 rounded-xl w-full mx-auto shadow-2xl border border-gray-800">
      <div className="flex flex-wrap space-x-3 mb-6 items-center">
        <button
          className={`px-4 py-2 rounded-lg ${
            orderType === "Limit"
              ? "bg-blue-500 bg-opacity-20 text-blue-400 font-bold"
              : "text-white hover:bg-gray-800 transition-colors duration-200"
          }`}
          onClick={() => setOrderType("Limit")}
        >
          Limit
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            orderType === "Market"
              ? "bg-blue-500 bg-opacity-20 text-blue-400 font-bold"
              : "text-white hover:bg-gray-800 transition-colors duration-200"
          }`}
          onClick={() => setOrderType("Market")}
        >
          Market
        </button>
        <div className="relative">
          <button
            className={`px-4 py-2 rounded-lg flex items-center ${
              orderType === "Stop Limit"
                ? "bg-blue-500 bg-opacity-20 text-blue-400 font-bold"
                : "text-white hover:bg-gray-800 transition-colors duration-200"
            }`}
            onClick={() => setOrderType("Stop Limit")}
          >
            Stop Limit
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
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
        <div className="flex-grow"></div>
        <button className="flex items-center bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Auto-Invest
        </button>
        <button className="flex items-center bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
          Buy with EUR
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buy Side */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-lg">
          {orderType === "Stop Limit" && (
            <div className="mb-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-inner relative">
                <div className="absolute top-2 left-3 text-gray-400 text-sm">
                  Stop
                </div>
                <input
                  type="text"
                  className="w-full bg-transparent pt-7 pb-2 px-3 focus:outline-none text-right"
                />
                <div className="absolute top-2 right-3 text-gray-400">USDT</div>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                  <button className="text-gray-400 h-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                  <button className="text-gray-400 h-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-md relative">
              <div className="absolute top-2 left-3 text-gray-400 text-sm">
                {orderType === "Stop Limit" ? "Limit" : "Price"}
              </div>
              <input
                type="text"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full bg-transparent pt-7 pb-2 px-3 focus:outline-none text-right"
              />
              <div className="absolute top-2 right-3 text-gray-400">USDT</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                {/* <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button> */}
                {/* <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button> */}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-md relative">
              <div className="absolute top-2 left-3 text-gray-400 text-sm">
                Amount
              </div>
              <input
                type="text"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="w-full bg-transparent pt-7 pb-2 px-3 focus:outline-none text-right"
                placeholder=""
              />
              <div className="absolute top-2 right-3 text-gray-400">ARKM</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                {/* {/* <button className="text-gray-400 h-4">
                  {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg> */}
                {/* 
                <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button> */}
              </div>
            </div>
          </div>

          <div className="flex justify-between py-3 my-2">
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
            <div className="h-3 w-3 rounded-full border-2 border-gray-700 bg-gray-900"></div>
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
            <div className="h-3 w-3 rounded-full border-2 border-gray-700 bg-gray-900"></div>
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
            <div className="h-3 w-3 rounded-full border-2 border-gray-700 bg-gray-900"></div>
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
          </div>

          <div className="mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-inner p-4 flex justify-between items-center">
              <div className="text-gray-400">Total</div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">Minimum 5</span>
                <span>USDT</span>
              </div>
            </div>
          </div>

          {orderType === "Limit" && (
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="tpsl-buy"
                className="mr-2"
                checked={buyTpSl}
                onChange={() => setBuyTpSl(!buyTpSl)}
              />
              <label htmlFor="tpsl-buy" className="text-gray-300">
                TP/SL
              </label>
            </div>
          )}

          <div className="flex justify-between text-gray-400 mb-4">
            <span>Avbl</span>
            <div className="flex items-center">
              <span>0.00000000 USDT</span>
              <button className="ml-2 bg-blue-500 rounded-full h-5 w-5 flex items-center justify-center text-xs shadow hover:bg-blue-400 transition-colors duration-200">
                +
              </button>
            </div>
          </div>

          <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium shadow-lg transform transition-transform duration-150 hover:scale-105">
            Buy ARKM
          </button>
        </div>

        {/* Sell Side */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-lg">
          {orderType === "Stop Limit" && (
            <div className="mb-4">
              <div className="bg-gray-800 border border-gray-700 rounded-md relative">
                <div className="absolute top-2 left-3 text-gray-400 text-sm">
                  Stop
                </div>
                <input
                  type="text"
                  className="w-full bg-transparent pt-7 pb-2 px-3 focus:outline-none text-right"
                />
                <div className="absolute top-2 right-3 text-gray-400">USDT</div>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                  {/* <button className="text-gray-400 h-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button> */}
                  {/* <button className="text-gray-400 h-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button> */}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-md relative">
              <div className="absolute top-2 left-3 text-gray-400 text-sm">
                {orderType === "Stop Limit" ? "Limit" : "Price"}
              </div>
              <input
                type="text"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full bg-transparent pt-7 pb-2 px-3 focus:outline-none text-right"
              />
              <div className="absolute top-2 right-3 text-gray-400">USDT</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                {/* <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button>
                <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button> */}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-md relative">
              <div className="absolute top-2 left-3 text-gray-400 text-sm">
                Amount
              </div>
              <input
                type="text"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="w-full bg-transparent pt-7 pb-2 px-3 focus:outline-none text-right"
                placeholder=""
              />
              <div className="absolute top-2 right-3 text-gray-400">ARKM</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                {/* <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button> */}
                {/* <button className="text-gray-400 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button> */}
              </div>
            </div>
          </div>

          <div className="flex justify-between py-3">
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
            <div className="h-3 w-3 rounded-full border-2 border-gray-700 bg-gray-900"></div>
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
            <div className="h-3 w-3 rounded-full border-2 border-gray-700 bg-gray-900"></div>
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
            <div className="h-3 w-3 rounded-full border-2 border-gray-700 bg-gray-900"></div>
            <div className="flex-grow mx-2 h-0.5 bg-gray-700 self-center"></div>
          </div>

          <div className="mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-md p-3 flex justify-between items-center">
              <div className="text-gray-400">Total</div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">Minimum 5</span>
                <span>USDT</span>
              </div>
            </div>
          </div>

          {orderType === "Limit" && (
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="tpsl-sell"
                className="mr-2"
                checked={sellTpSl}
                onChange={() => setSellTpSl(!sellTpSl)}
              />
              <label htmlFor="tpsl-sell" className="text-gray-300">
                TP/SL
              </label>
            </div>
          )}

          <div className="flex justify-between text-gray-400 mb-4">
            <span>Avbl</span>
            <div className="flex items-center">
              <span>0.00000000 ARKM</span>
              <button className="ml-2 bg-gray-700 rounded-full h-5 w-5 flex items-center justify-center text-xs">
                +
              </button>
            </div>
          </div>

          <button className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium shadow-lg transform transition-transform duration-150 hover:scale-105">
            Sell ARKM
          </button>
        </div>
      </div>
    </div>
  );
}
