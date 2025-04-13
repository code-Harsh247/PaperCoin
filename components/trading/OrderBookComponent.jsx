'use client'
import React, { useState, useEffect } from 'react';
import { useOrderbook } from '@/Context/OrderBookContext';

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
    <div className="bg-[#111722] text-white w-full h-full rounded-lg p-4">
      {/* Header with display mode toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Order Book</h2>
        <div className="flex space-x-2">
          <button 
            className={`text-xs px-2 py-1 rounded ${displayMode === 'combined' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setDisplayMode('combined')}
          >
            Combined
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ${displayMode === 'real' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setDisplayMode('real')}
          >
            Real Only
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ${displayMode === 'virtual' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setDisplayMode('virtual')}
          >
            Virtual Only
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-4 text-xs text-gray-400 pb-2 border-b border-gray-700">
        <div>Price (USDT)</div>
        <div className="text-right">Amount (BTC)</div>
        <div className="text-right">Total</div>
        <div className="text-right">Sum (BTC)</div>
      </div>

      {/* Asks (Sell Orders) - Reversed to show highest price at top */}
      <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
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
              className={`grid grid-cols-4 text-xs py-1 border-b border-gray-800 relative ${
                ask.isVirtual ? 'text-red-300' : 'text-red-500'
              }`}
            >
              {/* Red background for visualization */}
              <div 
                className="absolute right-0 top-0 h-full bg-red-900 opacity-20" 
                style={{ width: `${calculateWidth(ask.total)}%` }}
              ></div>
              
              {/* Price */}
              <div className="relative z-10 flex items-center">
                {formatPrice(ask.price)}
                {ask.isVirtual && (
                  <span className="ml-1 px-1 py-0.5 bg-red-900 text-red-300 rounded text-xxs">V</span>
                )}
              </div>
              
              {/* Amount */}
              <div className="text-right relative z-10">{formatAmount(ask.amount)}</div>
              
              {/* Value (Price * Amount) */}
              <div className="text-right relative z-10">
                {formatPrice(parseFloat(ask.price) * parseFloat(ask.amount))}
              </div>
              
              {/* Total */}
              <div className="text-right relative z-10">{formatAmount(ask.total)}</div>
            </div>
          ))}
      </div>

      {/* Spread indicator */}
      {spread && (
        <div className="py-2 text-center text-xs text-gray-400 border-b border-gray-700">
          Spread: {spread.value} ({spread.percentage}%)
        </div>
      )}

      {/* Bids (Buy Orders) */}
      <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
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
              className={`grid grid-cols-4 text-xs py-1 border-b border-gray-800 relative ${
                bid.isVirtual ? 'text-green-300' : 'text-green-500'
              }`}
            >
              {/* Green background for visualization */}
              <div 
                className="absolute right-0 top-0 h-full bg-green-900 opacity-20" 
                style={{ width: `${calculateWidth(bid.total)}%` }}
              ></div>
              
              {/* Price */}
              <div className="relative z-10 flex items-center">
                {formatPrice(bid.price)}
                {bid.isVirtual && (
                  <span className="ml-1 px-1 py-0.5 bg-green-900 text-green-300 rounded text-xxs">V</span>
                )}
              </div>
              
              {/* Amount */}
              <div className="text-right relative z-10">{formatAmount(bid.amount)}</div>
              
              {/* Value (Price * Amount) */}
              <div className="text-right relative z-10">
                {formatPrice(parseFloat(bid.price) * parseFloat(bid.amount))}
              </div>
              
              {/* Total */}
              <div className="text-right relative z-10">{formatAmount(bid.total)}</div>
            </div>
          ))}
      </div>
    </div>
  );
};


export default OrderBookComponent;