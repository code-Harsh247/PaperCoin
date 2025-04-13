"use client";
import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PortfolioPerformance = () => {
  const [timeframe, setTimeframe] = useState("1D");

  const timeframes = ["1D", "1W", "1M", "1Y"];

  const chartData = {
    "1D": [
      { time: "09:00", value: 10000 },
      { time: "12:00", value: 10120 },
      { time: "15:00", value: 10180 },
      { time: "18:00", value: 10142 },
    ],
    "1W": [
      { time: "Mon", value: 9850 },
      { time: "Tue", value: 9980 },
      { time: "Wed", value: 10100 },
      { time: "Thu", value: 10267 },
      { time: "Fri", value: 10250 },
    ],
    "1M": [
      { time: "Week 1", value: 10300 },
      { time: "Week 2", value: 10100 },
      { time: "Week 3", value: 9950 },
      { time: "Week 4", value: 9877 },
    ],
    "1Y": [
      { time: "Q1", value: 9500 },
      { time: "Q2", value: 10200 },
      { time: "Q3", value: 9700 },
      { time: "Q4", value: 10420 },
    ],
  };

  const performanceData = {
    Today: { amount: "+$142.35", percentage: "+2.8%", isPositive: true },
    "This Week": { amount: "+$267.89", percentage: "+5.3%", isPositive: true },
    "This Month": {
      amount: "-$122.45",
      percentage: "-2.4%",
      isPositive: false,
    },
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Portfolio Performance</h2>
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              className={`px-3 py-1 text-sm ${
                timeframe === tf ? "bg-gray-700" : "bg-gray-900"
              } text-white rounded-lg`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-64 bg-[#111722] bg-opacity-30 rounded-lg px-4 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData[timeframe]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="time" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#fbbf24" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ r: 3, stroke: "#fbbf24", strokeWidth: 2, fill: "#1f2937" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {Object.entries(performanceData).map(([period, data]) => (
          <div
            key={period}
            className="bg-[#111722] bg-opacity-30 p-3 rounded-lg"
          >
            <p className="text-gray-400 text-xs">{period}</p>
            <p
              className={
                data.isPositive
                  ? "text-green-500 font-medium"
                  : "text-red-500 font-medium"
              }
            >
              {data.amount}
            </p>
            <p
              className={
                data.isPositive
                  ? "text-green-500 text-xs"
                  : "text-red-500 text-xs"
              }
            >
              {data.percentage}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioPerformance;
