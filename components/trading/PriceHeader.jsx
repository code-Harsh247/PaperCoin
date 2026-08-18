// components/trading/PriceHeader.js
'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { useBacktest } from '@/Context/BacktestContext';
import useReconnectingWebSocket from '@/lib/useReconnectingWebSocket';

const PriceHeader = ({ symbol = 'btcusdt' }) => {
  const [priceData, setPriceData] = useState({
    price: 0,
    priceChange: 0,
    priceChangePercent: 0,
    high24h: 0,
    low24h: 0,
    volume: 0,
    quoteVolume: 0
  });
  const [showBacktestModal, setShowBacktestModal] = useState(false);
  const [backtestParams, setBacktestParams] = useState({
    startDateTime: '',
    endDateTime: '',
    speed: 1
  });
  const {
    backtestActive, startBacktest, stopBacktest,
    replayPrice, replayTs, sessionStatus, lastError,
  } = useBacktest();

  useEffect(() => {
    // Fetch initial ticker data
    const fetchTickerData = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`);
        const data = await response.json();

        setPriceData({
          price: parseFloat(data.lastPrice),
          priceChange: parseFloat(data.priceChange),
          priceChangePercent: parseFloat(data.priceChangePercent),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          volume: parseFloat(data.volume),
          quoteVolume: parseFloat(data.quoteVolume)
        });
      } catch (error) {
        console.error('Error fetching ticker data:', error);
      }
    };

    fetchTickerData();
  }, [symbol]);

  // Real-time price updates. Each message carries the full 24h snapshot, so a
  // reconnect catches up on its own without refetching.
  const handleTickerMessage = useCallback((event) => {
    const data = JSON.parse(event.data);

    setPriceData({
      price: parseFloat(data.c),
      priceChange: parseFloat(data.p),
      priceChangePercent: parseFloat(data.P),
      high24h: parseFloat(data.h),
      low24h: parseFloat(data.l),
      volume: parseFloat(data.v),
      quoteVolume: parseFloat(data.q)
    });
  }, []);

  const { status: tickerStatus } = useReconnectingWebSocket(
    `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`,
    { onMessage: handleTickerMessage }
  );

  // Format large numbers with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Format price with appropriate decimal places
  const formatPrice = (price) => {
    if (price > 1000) return price.toFixed(2);
    if (price > 100) return price.toFixed(2);
    if (price > 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  // Initialize backtest parameters with today's date when opening modal
  const handleBacktestClick = () => {
    // Get current date in YYYY-MM-DD format for date inputs
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    // Get current time in HH:MM format for time inputs
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    // Set default values
    setBacktestParams({
      startDate: currentDate,
      startTime: '00:00',
      endDate: currentDate,
      endTime: currentTime,
      speed: 1
    });

    setShowBacktestModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBacktestParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [backtestError, setBacktestError] = useState(null);

  // Dates from the modal are in the user's local time, not UTC — forcing a
  // 'Z' suffix used to shift the requested window by the timezone offset.
  const handleStartBacktest = async () => {
    const { startDate, startTime, endDate, endTime, speed } = backtestParams;
    setBacktestError(null);

    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    const config = {
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      speed,
    };
    const result = await startBacktest(config);
    if (result.ok) {
      setShowBacktestModal(false);
    } else {
      setBacktestError(result.error);
    }
  };


  // Determine if price change is positive or negative for styling
  const isPriceUp = priceData.priceChange >= 0;

  return (
    <>
      <div className="flex items-center justify-between w-full bg-[#111722] text-white px-4 py-3 border-b border-gray-800">
        <div className="flex items-center">
          {/* Base/Quote Symbol */}
          <div className="mr-8">
            <div className="flex items-center">
              <span className="text-xl font-bold">{symbol.toUpperCase()}</span>
              {tickerStatus !== 'open' && (
                <span
                  className="ml-2 flex items-center text-xs text-amber-400"
                  title="The live feed dropped. Retrying automatically."
                >
                  <span className="w-2 h-2 mr-1 rounded-full bg-amber-400 animate-pulse" />
                  {tickerStatus === 'connecting' ? 'Connecting' : 'Reconnecting'}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              {symbol.slice(0, -4).toUpperCase()} Price
            </div>
          </div>

          {/* Current Price — the replayed tape during a backtest, live otherwise */}
          {backtestActive ? (
            <div className="mr-8">
              <div className="text-2xl font-bold text-amber-400">
                {replayPrice ? formatPrice(parseFloat(replayPrice)) : '—'}
              </div>
              <div className="text-sm flex items-center text-amber-400">
                <span className="w-2 h-2 mr-1 rounded-full bg-amber-400 animate-pulse" />
                REPLAY {replayTs ? new Date(replayTs).toLocaleString() : 'starting…'}
              </div>
            </div>
          ) : (
            <div className="mr-8">
              <div className="text-2xl font-bold">{formatPrice(priceData.price)}</div>
              <div className="text-sm flex items-center">
                <span className={`${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                  {isPriceUp ? '+' : ''}{formatPrice(priceData.priceChange)}
                </span>
                <span className={`ml-1 ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                  ({isPriceUp ? '+' : ''}{priceData.priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* 24h Stats (live market; hidden during replay where they'd mislead) */}
          <div className={`flex space-x-6 ${backtestActive ? 'hidden' : ''}`}>
            <div>
              <div className="text-xs text-gray-400">24h Change</div>
              <div className={`${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                {isPriceUp ? '+' : ''}{formatPrice(priceData.priceChange)} ({isPriceUp ? '+' : ''}{priceData.priceChangePercent.toFixed(2)}%)
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">24h High</div>
              <div>{formatPrice(priceData.high24h)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400">24h Low</div>
              <div>{formatPrice(priceData.low24h)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400">24h Volume(BTC)</div>
              <div>{formatNumber(priceData.volume.toFixed(2))}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400">24h Volume(USDT)</div>
              <div>{formatNumber(priceData.quoteVolume.toFixed(2))}</div>
            </div>
          </div>
        </div>

        {/* Backtest Button */}
        <div>
          {backtestActive ? (
            <button
              onClick={stopBacktest}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Stop Backtest
            </button>
          ) : (
            <button
              onClick={handleBacktestClick}
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Backtest
            </button>
          )}
        </div>

      </div>

      {/* Backtest Modal */}
      {showBacktestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#1E2530] border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Backtest Configuration</h3>
              <button
                onClick={() => setShowBacktestModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Start Date and Time */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Start Date & Time</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    name="startDate"
                    value={backtestParams.startDate}
                    onChange={handleInputChange}
                    className="bg-[#111722] text-white rounded border border-gray-700 px-3 py-2 w-full"
                  />
                  <input
                    type="time"
                    name="startTime"
                    value={backtestParams.startTime}
                    onChange={handleInputChange}
                    className="bg-[#111722] text-white rounded border border-gray-700 px-3 py-2 w-full"
                  />
                </div>
              </div>

              {/* End Date and Time */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">End Date & Time</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    name="endDate"
                    value={backtestParams.endDate}
                    onChange={handleInputChange}
                    className="bg-[#111722] text-white rounded border border-gray-700 px-3 py-2 w-full"
                  />
                  <input
                    type="time"
                    name="endTime"
                    value={backtestParams.endTime}
                    onChange={handleInputChange}
                    className="bg-[#111722] text-white rounded border border-gray-700 px-3 py-2 w-full"
                  />
                </div>
              </div>

              {/* Speed Factor */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Speed Factor: {backtestParams.speed}x
                </label>
                <input
                  type="range"
                  name="speed"
                  min="1"
                  max="5"
                  value={backtestParams.speed}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded-lg appearance-none cursor-pointer h-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1x</span>
                  <span>5x</span>
                </div>
              </div>
            </div>

            {backtestError && (
              <div className="mt-4 px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-red-400 text-sm">
                {backtestError}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowBacktestModal(false)}
                className="bg-transparent hover:bg-gray-700 text-gray-300 font-medium py-2 px-4 border border-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartBacktest}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Start Backtest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PriceHeader;