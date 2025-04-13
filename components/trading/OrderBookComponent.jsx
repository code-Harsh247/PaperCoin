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
  const { orderbook, rawOrderbook, virtualOrders } = useOrderbook();
  const [maxTotal, setMaxTotal] = useState(0);
  const [displayMode, setDisplayMode] = useState('combined'); // 'combined', 'real', 'virtual'

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

  // Current spread calculation
  const calculateSpread = () => {
    if (orderbook.asks.length === 0 || orderbook.bids.length === 0) return null;
    
    const lowestAsk = parseFloat(orderbook.asks[0].price);
    const highestBid = parseFloat(orderbook.bids[0].price);
    const spread = lowestAsk - highestBid;
    const spreadPercentage = (spread / lowestAsk) * 100;
    
    return {
      value: spread.toFixed(2),
      percentage: spreadPercentage.toFixed(2)
    };
  };

  // Get the calculated spread
  const spread = calculateSpread();

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="bg-[#111722] text-white w-full h-full rounded-lg p-4 shadow-lg">
      {/* Header with display mode toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold tracking-wide">Order Book</h2>
        <div className="flex space-x-1">
          <button 
            className={`text-xs px-3 py-1.5 rounded-md transition-colors duration-200 ${displayMode === 'combined' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setDisplayMode('combined')}
          >
            Combined
          </button>
          <button 
            className={`text-xs px-3 py-1.5 rounded-md transition-colors duration-200 ${displayMode === 'real' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setDisplayMode('real')}
          >
            Real Only
          </button>
          <button 
            className={`text-xs px-3 py-1.5 rounded-md transition-colors duration-200 ${displayMode === 'virtual' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
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

      {/* Spread indicator */}
      {spread && (
        <div className="py-2 text-center text-xs border-b border-gray-700 bg-gray-800 rounded-md my-1">
          <span className="font-medium text-gray-300">Spread:</span> 
          <span className="text-yellow-400 ml-1 font-mono">{spread.value}</span> 
          <span className="text-gray-400 ml-1">({spread.percentage}%)</span>
        </div>
      )}

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