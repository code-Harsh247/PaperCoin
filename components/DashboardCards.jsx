"use client";

import React from "react";
import {
  ArrowUp,
  ArrowDown,
  Wallet,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import useBtcPrice from "@/lib/useBtcPrice";

// Balance Card Component
export const BalanceCard = ({
  title = "Total Balance",
  amount = "$0.00",
  changePercentage = 0,
  changeLabel = "from yesterday",
  imgUrl,
  icon = Wallet,
  onCtaClick = () => {},
  showAddFunds = false,
  showBitcoinCount = false,
}) => {
  const Icon = icon;
  const isPositive = changePercentage >= 0;

  // Live BTC price, shared with the rest of the dashboard so every card quotes
  // the same number and survives a dropped connection.
  const { price: btcPrice, connected } = useBtcPrice();

  // The card's headline figure is already the holdings value, so quoting the
  // same number again next to the coin count says nothing. Show the price those
  // coins are being valued at instead.
  const btcPriceLabel =
    btcPrice > 0
      ? `$${btcPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null;

  return (
    <div className="relative bg-gradient-to-r from-gray-800 to-[#111722] rounded-xl shadow-lg overflow-hidden border border-gray-700">
      {/* Image container positioned on the right side */}
      {imgUrl && (
        <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${imgUrl})` }}
          ></div>
          
        </div>
      )}
      
      {/* Content container */}
      <div className="relative z-10 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center">
              <h2 className="text-gray-400 text-sm">{title}</h2>
              {showBitcoinCount && connected && (
                <span className="ml-2 flex items-center">
                  <RefreshCw className="h-3 w-3 text-green-500 mr-1 animate-spin" />
                  <span className="text-green-500 text-xs">Live</span>
                </span>
              )}
              {showBitcoinCount && !connected && (
                <span className="ml-2 flex items-center" title="Price feed dropped. Retrying automatically.">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-1 animate-pulse"></span>
                  <span className="text-amber-400 text-xs">Reconnecting</span>
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white mt-1">{amount}</p>

            {showAddFunds && (
              <button
                onClick={onCtaClick}
                className="mt-3 bg-amber-500 hover:bg-amber-600 text-black text-sm px-3 py-1 rounded-lg"
              >
                Add Funds
              </button>
            )}

            {showBitcoinCount && (
              <div className="mt-3 p-2 bg-gray-700 bg-opacity-40 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-xs font-bold">₿</span>
                    </div>
                    <span className="text-white">BTC</span>
                  </div>
                  <span className="text-amber-500 px-2">
                    {btcPriceLabel ?? "price unavailable"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-[10px]">
          {changePercentage !== null && (
            <div className="flex items-center text-sm">
              {isPositive ? (
                <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={isPositive ? "text-green-500" : "text-red-500"}>
                {isPositive ? "+" : ""}
                {Number(changePercentage).toFixed(2)}%
              </span>
              {changeLabel && (
                <span className="text-gray-400 ml-1">{changeLabel}</span>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Asset Card Component
export const AssetCard = ({
  name,
  symbol,
  price,
  changePercentage,
  amount,
  color = "bg-yellow-500",
}) => {
  const isPositive = changePercentage >= 0;

  return (
    <div className="flex items-center p-3 bg-gray-700 bg-opacity-30 rounded-lg">
      <div
        className={`w-8 h-8 ${color} rounded-full flex items-center justify-center mr-3`}
      >
        <span className="text-xs font-bold">{symbol}</span>
      </div>
      <div className="flex-1">
        <h3 className="text-white font-medium">{name}</h3>
        <p className="text-gray-400 text-xs">{price}</p>
      </div>
      <div className="text-right">
        <p className={isPositive ? "text-green-500" : "text-red-500"}>
          {isPositive ? "+" : ""}
          {changePercentage}%
        </p>
        <p className="text-white text-xs">{amount}</p>
      </div>
    </div>
  );
};

// Activity Card Component
export const ActivityItem = ({
  title,
  amount,
  amountLabel,
  date,
  time,
  status,
  type,
}) => {
  // Determine icon and colors based on activity type
  let icon = <TrendingUp className="h-5 w-5 text-blue-500" />;
  let bgColor = "bg-blue-500 bg-opacity-20";
  let textColor = "text-white";

  if (type === "buy") {
    icon = <ArrowUp className="h-5 w-5 text-green-500" />;
    bgColor = "bg-green-500 bg-opacity-20";
    textColor = "text-green-500";
  } else if (type === "sell") {
    icon = <ArrowDown className="h-5 w-5 text-red-500" />;
    bgColor = "bg-red-500 bg-opacity-20";
    textColor = "text-red-500";
  } else if (type === "deposit") {
    icon = <Wallet className="h-5 w-5 text-amber-500" />;
    bgColor = "bg-amber-500 bg-opacity-20";
    textColor = "text-white";
  }

  return (
    <div className="flex items-start p-4 bg-gray-700 bg-opacity-30 rounded-lg">
      <div
        className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center mr-4`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h3 className="text-white font-medium">{title}</h3>
          <span className={textColor}>{amount}</span>
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-gray-400 text-xs">
            {date} • {time}
          </p>
          <span
            className={
              status === "completed"
                ? "text-green-500 text-xs"
                : status === "pending"
                ? "text-amber-500 text-xs"
                : "text-white text-xs"
            }
          >
            {amountLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

// Market Overview Card Component
export const CoinTableRow = ({
  name,
  symbol,
  price,
  change,
  marketCap,
  color = "bg-yellow-500",
  onTradeClick,
}) => {
  const isPositive = change >= 0;

  return (
    <tr className="bg-gray-800 hover:bg-gray-700">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div
            className={`w-8 h-8 ${color} rounded-full flex items-center justify-center mr-3`}
          >
            <span className="text-xs font-bold">{symbol}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-white">{name}</div>
            <div className="text-xs text-gray-400">{symbol}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
        {price}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-500">
        <span className={isPositive ? "text-green-500" : "text-red-500"}>
          {isPositive ? "+" : ""}
          {change}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
        {marketCap}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <button
          onClick={onTradeClick}
          className="bg-amber-500 hover:bg-amber-600 text-black text-xs px-3 py-1 rounded-lg"
        >
          Trade
        </button>
      </td>
    </tr>
  );
};

// Quick Action Button Component
export const ActionButton = ({ icon, label, primary = false, onClick }) => {
  const Icon = icon;

  return (
    <button
      onClick={onClick}
      className={`w-full ${
        primary
          ? "bg-amber-500 hover:bg-amber-600 text-black"
          : "bg-gray-700 hover:bg-gray-600 text-white"
      } font-medium py-3 rounded-lg transition-colors flex items-center justify-center`}
    >
      <Icon className="h-5 w-5 mr-2" />
      <span>{label}</span>
    </button>
  );
};