// components/trading/PriceHeader.js
'use client'
import React, { useEffect, useState } from 'react';

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

  // Determine if price change is positive or negative for styling
  const isPriceUp = priceData.priceChange >= 0;
  
  return (
    <div className="flex items-center w-full bg-[#111722] text-white px-4 py-3 border-b border-gray-800">
      {/* Base/Quote Symbol */}
      <div className="mr-8">
        <div className="text-xl font-bold">{symbol.toUpperCase()}</div>
        <div className="text-sm text-gray-400">
          {symbol.slice(0, -4).toUpperCase()} Price
        </div>
      </div>
      
      {/* Current Price */}
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
      
      {/* 24h Stats */}
      <div className="flex space-x-6">
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
  );
};

export default PriceHeader;