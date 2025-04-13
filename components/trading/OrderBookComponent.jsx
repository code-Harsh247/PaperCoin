'use client'
import React, { useState, useEffect } from 'react';
import { useOrderbook } from '@/Context/OrderBookContext';

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #111722;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
`;

const OrderBookComponent = () => {
  const { orderbook } = useOrderbook();
  const [priceData, setPriceData] = useState({
    price: 0,
    priceChange: 0,
    priceChangePercent: 0,
    high24h: 0,
    low24h: 0,
    volume: 0,
    quoteVolume: 0
  });
  const [maxTotal, setMaxTotal] = useState(0);
  const [displayMode, setDisplayMode] = useState('combined'); // 'combined', 'real', 'virtual'
  const symbol = "btcusdt";

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
    
    // Set up WebSocket for real-time price updates
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
    
    ws.onmessage = (event) => {
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
    };
    
    return () => {
      ws.close();
    };
  }, [symbol]);

  // Find the maximum total value for scaling
  useEffect(() => {
    if (orderbook.bids.length === 0 && orderbook.asks.length === 0) return;
      
    const maxBidTotal = orderbook.bids.length > 0 
      ? parseFloat(orderbook.bids[orderbook.bids.length - 1].total)
      : 0;
      
    const maxAskTotal = orderbook.asks.length > 0 
      ? parseFloat(orderbook.asks[orderbook.asks.length - 1].total)
      : 0;
      
    setMaxTotal(Math.max(maxBidTotal, maxAskTotal));
  }, [orderbook]);

  // Format price to consistent decimal places
  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Format amount to 4 decimal places
  const formatAmount = (amount) => {
    return parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  };

  // Calculate background width for visualization
  const calculateWidth = (total) => {
    if (!maxTotal) return 0;
    return (parseFloat(total) / maxTotal) * 100;
  };

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="bg-[#111722] text-white w-full h-full rounded-lg p-4 shadow-lg">
        {/* Header with display mode toggle */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold tracking-wide">Order Book</h2>
          <div className="flex space-x-1">
            <button 
              className={`text-xs px-3 py-1.5 rounded-md transition-colors duration-200 ${displayMode === 'combined' ? 'bg-amber-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setDisplayMode('combined')}
            >
              Combined
            </button>
            <button 
              className={`text-xs px-3 py-1.5 rounded-md transition-colors duration-200 ${displayMode === 'real' ? 'bg-amber-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setDisplayMode('real')}
            >
              Real Only
            </button>
            <button 
              className={`text-xs px-3 py-1.5 rounded-md transition-colors duration-200 ${displayMode === 'virtual' ? 'bg-amber-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setDisplayMode('virtual')}
            >
              Virtual Only
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-12 text-xs text-gray-400 pb-2 border-b border-gray-700 font-medium">
          <div className="col-span-4">Price (USDT)</div>
          <div className="col-span-4 text-right">Amount (BTC)</div>
          <div className="col-span-4 text-right">Total</div>
        </div>

        {/* Asks (Sell Orders) - Reversed to show highest price at top */}
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          {orderbook.asks
            .filter(ask => {
              if (displayMode === 'combined') return true;
              if (displayMode === 'real') return !ask.isVirtual;
              if (displayMode === 'virtual') return ask.isVirtual;
              return true;
            })
            .slice()
            .reverse()
            .map((ask, index) => (
              <div 
                key={`ask-${ask.price}-${index}`} 
                className={`grid grid-cols-12 text-xs py-1.5 border-b border-gray-800 relative ${
                  ask.isVirtual ? 'text-red-300' : 'text-red-500'
                } hover:bg-gray-800 transition-colors duration-150`}
              >
                {/* Red background for visualization */}
                <div 
                  className="absolute right-0 top-0 h-full bg-red-900 opacity-20" 
                  style={{ width: `${calculateWidth(ask.total)}%` }}
                ></div>
                
                {/* Price */}
                <div className="relative z-10 flex items-center col-span-4">
                  {formatPrice(ask.price)}
                  {ask.isVirtual && (
                    <span className="ml-1 px-1 py-0.5 bg-red-900 text-red-300 rounded text-xxs">V</span>
                  )}
                </div>
                
                {/* Amount */}
                <div className="text-right relative z-10 col-span-4 font-mono">{formatAmount(ask.amount)}</div>
                
                {/* Value (Price * Amount) */}
                <div className="text-right relative z-10 col-span-4 font-mono">
                  {formatPrice(parseFloat(ask.price) * parseFloat(ask.amount))}
                </div>
              </div>
            ))}
        </div>

        {/* Current price indicator */}
        <div className="py-2 text-center text-xs border-b border-gray-700 rounded-md my-1">
          <span className="font-medium text-gray-300">Current Price:</span> 
          <span className="text-amber-500 ml-1">({formatPrice(priceData.price)})</span>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          {orderbook.bids
            .filter(bid => {
              if (displayMode === 'combined') return true;
              if (displayMode === 'real') return !bid.isVirtual;
              if (displayMode === 'virtual') return bid.isVirtual;
              return true;
            })
            .map((bid, index) => (
              <div 
                key={`bid-${bid.price}-${index}`} 
                className={`grid grid-cols-12 text-xs py-1.5 border-b border-gray-800 relative ${
                  bid.isVirtual ? 'text-green-300' : 'text-green-500'
                } hover:bg-gray-800 transition-colors duration-150`}
              >
                {/* Green background for visualization */}
                <div 
                  className="absolute right-0 top-0 h-full bg-green-900 opacity-20" 
                  style={{ width: `${calculateWidth(bid.total)}%` }}
                ></div>
                
                {/* Price */}
                <div className="relative z-10 flex items-center col-span-4">
                  {formatPrice(bid.price)}
                  {bid.isVirtual && (
                    <span className="ml-1 px-1 py-0.5 bg-green-900 text-green-300 rounded text-xxs">V</span>
                  )}
                </div>
                
                {/* Amount */}
                <div className="text-right relative z-10 col-span-4 font-mono">{formatAmount(bid.amount)}</div>
                
                {/* Value (Price * Amount) */}
                <div className="text-right relative z-10 col-span-4 font-mono">
                  {formatPrice(parseFloat(bid.price) * parseFloat(bid.amount))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default OrderBookComponent;