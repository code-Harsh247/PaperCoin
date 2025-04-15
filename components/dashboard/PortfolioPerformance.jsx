"use client"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const PortfolioPerformance = () => {
  const [timeframe, setTimeframe] = useState("1D")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [portfolioData, setPortfolioData] = useState([])
  const timeframes = ["1D", "1W", "1M", "1Y"]
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setLoading(true)
        const response = await axios.post("/api/portfolios/fetchall", {
          user_id: user.userId,
        })
        console.log("Portfolio Data Response:", response.data)
        const data = response.data.portfolio
        setPortfolioData(data || [])
        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch portfolio data:", err)
        setError("Failed to load portfolio data")
        setLoading(false)
      }
    }

    fetchPortfolioData()
  }, [user])

  useEffect(() => {
    console.log("Portfolio Data:", portfolioData)
  }, [portfolioData])

  // Process data for charts based on timeframe
  const getChartData = () => {
    if (!portfolioData.length) return []

    // Sort data by last_updated timestamp
    const sortedData = [...portfolioData].sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated))

    // Format data for charts based on timeframe
    const filteredData = sortedData

    // For demonstration, we're using all data points since we have limited entries
    // In a real app, you might filter based on timeframe

    return filteredData.map((entry) => ({
      time: new Date(entry.last_updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      value: Number.parseFloat(entry.total_balance),
      btc: Number.parseFloat(entry.btccoins),
    }))
  }

  // Calculate performance metrics
  const calculatePerformance = () => {
    if (!portfolioData.length) {
      return {
        Today: { amount: "$0.00", percentage: "0%", isPositive: true },
        "This Week": { amount: "$0.00", percentage: "0%", isPositive: true },
        "This Month": { amount: "$0.00", percentage: "0%", isPositive: true },
      }
    }

    // Sort by last_updated to get latest and earliest entries
    const sortedData = [...portfolioData].sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated))

    const latest = sortedData[sortedData.length - 1]
    const earliest = sortedData[0]

    // For row with negative balance
    const validData = sortedData.filter((entry) => Number.parseFloat(entry.total_balance) > 0)
    const latestValid = validData[validData.length - 1]

    // Calculate today's change (using the most recent valid balance for calculations)
    const todayChange = latestValid
      ? Number.parseFloat(latestValid.total_balance) - Number.parseFloat(earliest.total_balance)
      : 0
    const todayPercentage = latestValid ? (todayChange / Number.parseFloat(earliest.total_balance)) * 100 : 0

    // Since we have limited data, use the same calculation for week and month
    // In a real app, you would filter data by date ranges

    return {
      Today: {
        amount: `${todayChange >= 0 ? "+" : ""}$${Math.abs(todayChange).toFixed(2)}`,
        percentage: `${todayChange >= 0 ? "+" : ""}${todayPercentage.toFixed(2)}%`,
        isPositive: todayChange >= 0,
      },
      "This Week": {
        amount: `${todayChange >= 0 ? "+" : ""}$${Math.abs(todayChange).toFixed(2)}`,
        percentage: `${todayChange >= 0 ? "+" : ""}${todayPercentage.toFixed(2)}%`,
        isPositive: todayChange >= 0,
      },
      "This Month": {
        amount: `${todayChange >= 0 ? "+" : ""}$${Math.abs(todayChange).toFixed(2)}`,
        percentage: `${todayChange >= 0 ? "+" : ""}${todayPercentage.toFixed(2)}%`,
        isPositive: todayChange >= 0,
      },
    }
  }

  const chartData = getChartData()
  const performanceData = calculatePerformance()

  if (loading) {
    return <PortfolioSkeleton timeframes={timeframes} />
  }

  if (error) return <div className="text-center p-4 text-red-500">{error}</div>

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Portfolio Performance</h2>
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              className={`px-3 py-1 text-sm ${timeframe === tf ? "bg-gray-700" : "bg-gray-900"}  text-white rounded-lg`}
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
          <LineChart data={chartData}>
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
          <div key={period} className="bg-[#111722] bg-opacity-30 p-3 rounded-lg">
            <h3 className="text-gray-400 text-xs">{period}</h3>
            <p
              className={`text-xl font-bold ${
                data.isPositive ? "text-green-500 font-medium" : "text-red-500 font-medium"
              }`}
            >
              {data.amount}
            </p>
            <p className={`text-sm ${data.isPositive ? "text-green-500 font-medium" : "text-red-500 font-medium"}`}>
              {data.percentage}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton component for loading state
const PortfolioSkeleton = ({ timeframes }) => {
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-7 bg-gray-700 rounded w-48"></div>
        <div className="flex space-x-2">
          {timeframes.map((tf, index) => (
            <div key={index} className="h-8 w-10 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Chart Skeleton */}
      <div className="h-64 bg-[#111722] bg-opacity-30 rounded-lg px-4 py-2 flex items-center justify-center">
        <div className="w-full h-4/5">
          {/* Chart line skeleton */}
          <div className="relative w-full h-full">
            {/* Horizontal grid lines */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute w-full h-px bg-gray-700" style={{ top: `${20 * i}%` }}></div>
            ))}

            {/* Vertical grid lines */}
            <div className="absolute bottom-0 w-full flex justify-between">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-full w-px bg-gray-700" style={{ left: `${20 * i}%`, height: "100%" }}></div>
              ))}
            </div>

            {/* Fake chart line */}
            <div
              className="absolute bottom-1/3 left-0 right-0 h-1 bg-gray-600 rounded-full"
              style={{
                clipPath: "polygon(0% 100%, 20% 60%, 40% 80%, 60% 40%, 80% 70%, 100% 20%)",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-[#111722] bg-opacity-30 p-3 rounded-lg">
            <div className="h-3 bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-24 mb-1"></div>
            <div className="h-4 bg-gray-700 rounded w-12"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PortfolioPerformance
