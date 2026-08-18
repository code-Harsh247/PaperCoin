"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import useBtcPrice from "@/lib/useBtcPrice"

// Portfolio value here means the market value of the BTC held, not the cash
// sitting in the wallet. Depositing funds buys nothing, so it must not move this
// chart; only price movement and buying or selling should.
//
// Holdings come from the portfolio snapshots and prices from Binance klines, so
// each point is "whatever was held at that moment, valued at that moment's
// price".

const TIMEFRAMES = {
  "1D": { interval: "15m", limit: 96, label: (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
  "1W": { interval: "1h", limit: 168, label: (d) => d.toLocaleDateString([], { weekday: "short", hour: "2-digit" }) },
  "1M": { interval: "4h", limit: 180, label: (d) => d.toLocaleDateString([], { month: "short", day: "numeric" }) },
  "1Y": { interval: "1d", limit: 365, label: (d) => d.toLocaleDateString([], { month: "short", day: "numeric" }) },
}

const PortfolioPerformance = () => {
  const [timeframe, setTimeframe] = useState("1D")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [candles, setCandles] = useState([])
  const { user } = useAuthStore()
  const { price: livePrice, openPrice: openPrice24h } = useBtcPrice()

  // Holdings history
  useEffect(() => {
    if (!user?.userId) return

    const fetchSnapshots = async () => {
      try {
        const response = await axios.post("/api/portfolios/fetchall", { user_id: user.userId })
        setSnapshots(response.data.portfolio || [])
      } catch (err) {
        console.error("Failed to fetch portfolio data:", err)
        setError("Failed to load portfolio data")
      }
    }

    fetchSnapshots()
  }, [user])

  // Price history for the selected window
  const fetchCandles = useCallback(async () => {
    const { interval, limit } = TIMEFRAMES[timeframe]
    try {
      setLoading(true)
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`
      )
      if (!response.ok) throw new Error(`Binance responded ${response.status}`)
      const data = await response.json()
      setCandles(data.map((c) => ({ time: c[0], close: Number.parseFloat(c[4]) })))
      setError(null)
    } catch (err) {
      console.error("Failed to fetch price history:", err)
      setError("Failed to load price history")
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    fetchCandles()
  }, [fetchCandles])

  // The position as it stands right now, taken from the newest snapshot. The
  // last candle bucket opens before "now", so it cannot be relied on for this.
  const position = useMemo(() => {
    if (!snapshots.length) return { btc: 0, invested: 0 }
    const latest = [...snapshots].sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))[0]
    return {
      btc: Number.parseFloat(latest.btccoins) || 0,
      invested: Number.parseFloat(latest.total_invested) || 0,
    }
  }, [snapshots])

  const currentBtc = position.btc

  // Value each point using the holdings that were in effect at that time.
  const chartData = useMemo(() => {
    if (!candles.length) return []

    const holdingsTimeline = [...snapshots]
      .map((s) => ({ at: new Date(s.last_updated).getTime(), btc: Number.parseFloat(s.btccoins) || 0 }))
      .sort((a, b) => a.at - b.at)

    const holdingsAt = (t) => {
      let held = 0
      for (const point of holdingsTimeline) {
        if (point.at > t) break
        held = point.btc
      }
      return held
    }

    const { label } = TIMEFRAMES[timeframe]
    const points = candles.map((candle) => {
      const btc = holdingsAt(candle.time)
      return {
        time: label(new Date(candle.time)),
        btc,
        price: candle.close,
        value: btc * candle.close,
      }
    })

    // The final point represents now, so it uses current holdings at the live
    // price rather than whatever the last candle bucket opened with.
    if (livePrice > 0 && points.length) {
      points[points.length - 1] = {
        ...points[points.length - 1],
        btc: currentBtc,
        price: livePrice,
        value: currentBtc * livePrice,
      }
    }

    return points
  }, [candles, snapshots, timeframe, livePrice, currentBtc])

  const stats = useMemo(() => {
    const { btc, invested } = position
    const currentValue = livePrice > 0 ? btc * livePrice : 0

    // A day's return is what the price move did to the position now held. If the
    // position changed during the day this is an approximation, but it never
    // mistakes a purchase for a gain the way comparing balances would.
    const dayReturn = livePrice > 0 && openPrice24h > 0 ? btc * (livePrice - openPrice24h) : 0
    const dayPct = openPrice24h > 0 ? ((livePrice - openPrice24h) / openPrice24h) * 100 : null

    // Total return is measured against what was actually paid, so deposits and
    // idle cash cannot flatter it.
    const totalReturn = currentValue - invested
    const totalPct = invested > 0 ? (totalReturn / invested) * 100 : null

    return { btc, invested, currentValue, dayReturn, dayPct, totalReturn, totalPct }
  }, [position, livePrice, openPrice24h])

  const holdsNothing = chartData.length > 0 && chartData.every((p) => p.btc === 0)

  const formatUsd = (value) =>
    `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading && !chartData.length) {
    return <PortfolioSkeleton timeframes={Object.keys(TIMEFRAMES)} />
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Portfolio Performance</h2>
          <p className="text-xs text-gray-400 mt-1">Market value of BTC held.</p>
        </div>
        <div className="flex space-x-2">
          {Object.keys(TIMEFRAMES).map((tf) => (
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

      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}

      {/* Chart Section */}
      <div className="h-64 bg-[#111722] bg-opacity-30 rounded-lg px-4 py-2 relative">
        {holdsNothing && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <p className="text-gray-300 font-medium">No BTC held yet</p>
              <p className="text-gray-500 text-sm mt-1">Buy some on the trading screen to start tracking performance</p>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="time" stroke="#ccc" minTickGap={40} />
            <YAxis stroke="#ccc" tickFormatter={(v) => `$${Number(v).toLocaleString()}`} width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#fbbf24" }}
              formatter={(value, name, entry) => [
                `${formatUsd(value)}  (${entry?.payload?.btc ?? 0} BTC @ ${formatUsd(entry?.payload?.price ?? 0)})`,
                "Holdings value",
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryTile label="1D return">
          <ReturnFigure
            amount={stats.dayReturn}
            pct={stats.dayPct}
            empty={stats.btc === 0}
            emptyNote="no position"
            formatUsd={formatUsd}
          />
        </SummaryTile>

        <SummaryTile label="Total return">
          <ReturnFigure
            amount={stats.totalReturn}
            pct={stats.totalPct}
            empty={stats.invested === 0}
            emptyNote="nothing invested"
            formatUsd={formatUsd}
          />
        </SummaryTile>

        <SummaryTile label="Invested">
          <p className="text-xl font-bold text-white">{formatUsd(stats.invested)}</p>
          <p className="text-sm text-gray-400">cost basis</p>
        </SummaryTile>

        <SummaryTile label="Current value">
          <p className="text-xl font-bold text-white">
            {livePrice > 0 ? formatUsd(stats.currentValue) : "—"}
          </p>
          <p className="text-sm text-gray-400">
            {livePrice > 0 ? `BTC at ${formatUsd(livePrice)}` : "waiting for price"}
          </p>
        </SummaryTile>

        <SummaryTile label="BTC held">
          <p className="text-xl font-bold text-white">{stats.btc}</p>
          <p className="text-sm text-gray-400">BTC</p>
        </SummaryTile>
      </div>
    </div>
  )
}

const SummaryTile = ({ label, children }) => (
  <div className="bg-[#111722] bg-opacity-30 p-3 rounded-lg">
    <h3 className="text-gray-400 text-xs">{label}</h3>
    {children}
  </div>
)

// A gain or loss in dollars with its percentage underneath. Zero counts as
// neutral rather than a gain, so an untouched account is not coloured green.
const ReturnFigure = ({ amount, pct, empty, emptyNote, formatUsd }) => {
  if (empty) {
    return (
      <>
        <p className="text-xl font-bold text-gray-400">—</p>
        <p className="text-sm text-gray-500">{emptyNote}</p>
      </>
    )
  }

  const tone = amount > 0 ? "text-green-500" : amount < 0 ? "text-red-500" : "text-gray-300"
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : ""

  return (
    <>
      <p className={`text-xl font-bold ${tone}`}>
        {sign}
        {formatUsd(Math.abs(amount))}
      </p>
      <p className={`text-sm ${tone}`}>
        {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`}
      </p>
    </>
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
          <div className="relative w-full h-full">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute w-full h-px bg-gray-700" style={{ top: `${20 * i}%` }}></div>
            ))}
            <div className="absolute bottom-0 w-full flex justify-between">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-full w-px bg-gray-700" style={{ left: `${20 * i}%`, height: "100%" }}></div>
              ))}
            </div>
            <div
              className="absolute bottom-1/3 left-0 right-0 h-1 bg-gray-600 rounded-full"
              style={{
                clipPath: "polygon(0% 100%, 20% 60%, 40% 80%, 60% 40%, 80% 70%, 100% 20%)",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Summary Skeleton */}
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
