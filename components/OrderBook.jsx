"use client"

import React, { useState, useEffect, useRef } from 'react';

const OrderBookComponent = ({ symb }) => {
  const [orderBook, setOrderBook] = useState({
    bids: [],
    asks: []
  });
  const [currentPrice, setCurrentPrice] = useState(null);
  const [lastTradePrice, setLastTradePrice] = useState(null);
  const [priceDirection, setPriceDirection] = useState(null); // 'up' or 'down'
  const [symbol, setSymbol] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  const orderBookWsRef = useRef(null);
  const tradeWsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const prevTradePrice = useRef(null);

  useEffect(() => {
    setSymbol(symb);
  }, [symb]);

  useEffect(() => {
    if (!symbol) return;

    // Clear existing state when symbol changes
    setIsLoading(true);
    setOrderBook({ bids: [], asks: [] });
    setCurrentPrice(null);
    setLastTradePrice(null);
    setPriceDirection(null);
    
    // Connect to order book WebSocket
    const connectOrderBookWs = () => {
      if (orderBookWsRef.current && orderBookWsRef.current.readyState !== WebSocket.CLOSED) {
        orderBookWsRef.current.close();
      }

      // Using depth20 stream for order book
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`);
      
      ws.onopen = () => {
        console.log('Order book WebSocket connection established');
        reconnectAttemptsRef.current = 0;
        setIsLoading(false);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Format the bids and asks data directly from the stream
        const formattedBids = data.bids.map(bid => ({
          price: parseFloat(bid[0]),
          amount: parseFloat(bid[1]),
          total: parseFloat(bid[0]) * parseFloat(bid[1])
        }));
        
        const formattedAsks = data.asks.map(ask => ({
          price: parseFloat(ask[0]),
          amount: parseFloat(ask[1]),
          total: parseFloat(ask[0]) * parseFloat(ask[1])
        }));

        setOrderBook({
          bids: formattedBids,
          asks: formattedAsks
        });
        
        setLastUpdateTime(new Date());
      };

      ws.onerror = (error) => {
        console.error('Order book WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Order book WebSocket connection closed');
        setIsLoading(true);
        
        // Reconnect with backoff
        reconnectAttemptsRef.current += 1;
        const backoff = Math.min(30000, Math.pow(2, reconnectAttemptsRef.current) * 1000);
        
        setTimeout(connectOrderBookWs, backoff);
      };

      orderBookWsRef.current = ws;
    };

    // Connect to trade WebSocket for last trade price
    const connectTradeWs = () => {
      if (tradeWsRef.current && tradeWsRef.current.readyState !== WebSocket.CLOSED) {
        tradeWsRef.current.close();
      }

      // Connect to trade stream
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);
      
      ws.onopen = () => {
        console.log('Trade WebSocket connection established');
      };

      ws.onmessage = (event) => {
        const trade = JSON.parse(event.data);
        const tradePrice = parseFloat(trade.p);
        
        // Set last trade price
        setLastTradePrice(tradePrice);
        
        // Determine price direction
        if (prevTradePrice.current !== null) {
          if (tradePrice > prevTradePrice.current) {
            setPriceDirection('up');
          } else if (tradePrice < prevTradePrice.current) {
            setPriceDirection('down');
          }
          // If equal, keep the previous direction
        }
        
        // Update current price reference
        prevTradePrice.current = tradePrice;
        
        // Use the trade price as the current price
        setCurrentPrice(tradePrice);
      };

      ws.onerror = (error) => {
        console.error('Trade WebSocket error:', error);
      };yield

      ws.onclose = () => {
        console.log('Trade WebSocket connection closed');
        
        // Reconnect with simple backoff
        setTimeout(connectTradeWs, 5000);
      };

      tradeWsRef.current = ws;
    };

    // Start both WebSocket connections
    connectOrderBookWs();
    connectTradeWs();

    // Cleanup function
    return () => {
      if (orderBookWsRef.current) {
        orderBookWsRef.current.close();
      }
      if (tradeWsRef.current) {
        tradeWsRef.current.close();
      }
    };
  }, [symbol]);

  // Format price with commas
  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Format amount with appropriate precision
  const formatAmount = (amount) => {
    return amount.toFixed(amount < 0.001 ? 8 : 5);
  };

  return (
    <div className="bg-gray-900 text-white w-full p-3 max-w-1/5">
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-base font-medium">
          Order Book {isLoading ? "(Loading...)" : ""}
          {lastUpdateTime && !isLoading && (
            <span className="text-xs text-gray-400 ml-2">
              Last update: {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}
        </h2>
      </div>
      
      <div className="flex text-xs text-gray-400 p-2">
        <div className="flex-1">Price (USDT)</div>
        <div className="flex-1">Amount (BTC)</div>
        <div className="flex-1 text-right">Total</div>
      </div>

      {/* Ask orders (sell orders - red) */}
      <div className="overflow-hidden">
        {orderBook.asks.slice(0, 13).reverse().map((ask, index) => (
          <div key={`ask-${index}`} className="flex text-xs p-1 hover:bg-gray-800">
            <div className="flex-1 text-red-500">{formatPrice(ask.price)}</div>
            <div className="flex-1">{formatAmount(ask.amount)}</div>
            <div className="flex-1 text-right">{ask.total.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Current price indicator (from trade stream) */}
      {currentPrice && (
        <div className="flex text-start p-2 border-t border-b border-gray-800">
          <div className={`flex-1 font-medium ${priceDirection === 'up' ? 'text-green-400' : priceDirection === 'down' ? 'text-red-500' : 'text-white'}`}>
            {formatPrice(currentPrice)} 
            {priceDirection === 'up' && <span className="text-green-400 ml-1">↑</span>}
            {priceDirection === 'down' && <span className="text-red-500 ml-1">↓</span>}
          </div>
          <div className="flex-1 text-gray-400">${formatPrice(currentPrice)}</div>
        </div>
      )}

      {/* Bid orders (buy orders - green) */}
      <div className="overflow-hidden">
        {orderBook.bids.slice(0, 13).map((bid, index) => (
          <div key={`bid-${index}`} className="flex text-xs p-1 hover:bg-gray-800">
            <div className="flex-1 text-green-400">{formatPrice(bid.price)}</div>
            <div className="flex-1">{formatAmount(bid.amount)}</div>
            <div className="flex-1 text-right">{bid.total.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBookComponent;