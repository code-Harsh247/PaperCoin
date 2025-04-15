"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { ArrowUpRight, ArrowDownRight, Clock, Search } from "lucide-react"
import axios from "axios"

export default function HistoryPage() {
  const { user } = useAuthStore()
  const [trades, setTrades] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setIsLoading(true)
        const response = await axios.post("/api/trades/fetchTrades", {
          user_id: user.userId
        })
        console.log("Response from fetchTrades:", response)
        // Fix: Extract trades array from the response data
        setTrades(response.data.trades);

      } catch (error) {
        console.error("Error fetching trades:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if(user?.userId){
        fetchTrades();
    }
  }, [user])

  useEffect(() => {
    console.log("Trades : ",trades);
  },[trades]);

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.parseFloat(value))
  }

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch =
      searchTerm === "" ||
      trade.id.toString().includes(searchTerm) ||
      trade.price.includes(searchTerm) ||
      trade.amount.includes(searchTerm)

    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "bid" && trade.trade_type === "bid") ||
      (activeFilter === "ask" && trade.trade_type === "ask") ||
      (activeFilter === "filled" && trade.status === "filled") ||
      (activeFilter === "pending" && trade.status !== "filled")

    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-[#0e1217] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Trade History</h1>
        <p className="text-gray-400 mb-8">View and track all your trading activities</p>

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by ID, price or amount..."
              className="bg-[#1a1f2b] border border-[#2a3042] rounded-lg pl-10 pr-4 py-2 w-full md:w-80 focus:outline-none focus:ring-1 focus:ring-[#f7931a]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activeFilter === "all" ? "bg-[#f7931a] text-white" : "bg-[#1a1f2b] text-gray-300"}`}
              onClick={() => setActiveFilter("all")}
            >
              All Trades
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activeFilter === "bid" ? "bg-[#f7931a] text-white" : "bg-[#1a1f2b] text-gray-300"}`}
              onClick={() => setActiveFilter("bid")}
            >
              Buy Orders
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activeFilter === "ask" ? "bg-[#f7931a] text-white" : "bg-[#1a1f2b] text-gray-300"}`}
              onClick={() => setActiveFilter("ask")}
            >
              Sell Orders
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activeFilter === "filled" ? "bg-[#f7931a] text-white" : "bg-[#1a1f2b] text-gray-300"}`}
              onClick={() => setActiveFilter("filled")}
            >
              Filled
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activeFilter === "pending" ? "bg-[#f7931a] text-white" : "bg-[#1a1f2b] text-gray-300"}`}
              onClick={() => setActiveFilter("pending")}
            >
              Pending
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#1a1f2b] rounded-xl p-8 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f7931a]"></div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-[#1a1f2b] rounded-xl p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-medium mb-2">No trades found</h3>
            <p className="text-gray-400">
              {searchTerm || activeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't made any trades yet"}
            </p>
          </div>
        ) : (
          <div className="bg-[#1a1f2b] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a3042]">
                    <th className="text-left p-4 text-gray-400 font-medium">ID</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Price</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Filled</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-[#2a3042] hover:bg-[#232836]">
                      <td className="p-4 font-medium">#{trade.id}</td>
                      <td className="p-4">
                        <div className="flex items-center">
                          {trade.trade_type === "bid" ? (
                            <>
                              <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                              </div>
                              <span className="text-green-500">Buy</span>
                            </>
                          ) : (
                            <>
                              <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center mr-2">
                                <ArrowDownRight className="h-3 w-3 text-red-500" />
                              </div>
                              <span className="text-red-500">Sell</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{formatCurrency(trade.price)}</td>
                      <td className="p-4">{Number.parseFloat(trade.amount).toFixed(8)}</td>
                      <td className="p-4">{Number.parseFloat(trade.filled_amount).toFixed(8)}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${
                            trade.status === "filled"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{formatDate(trade.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}