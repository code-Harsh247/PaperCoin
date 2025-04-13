'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the context
const OrderbookContext = createContext();

// Custom hook to use the orderbook context
export const useOrderbook = () => useContext(OrderbookContext);

export const OrderbookProvider = ({ symbol, children }) => {
  const [orderbook, setOrderbook] = useState({
    bids: [], // Array of {price, amount, total, isVirtual}
    asks: [], // Array of {price, amount, total, isVirtual}
    lastUpdateId: 0
  });
  
  const [virtualOrders, setVirtualOrders] = useState({
    bids: [], // Array of {price, amount, isVirtual: true}
    asks: [], // Array of {price, amount, isVirtual: true}
  });

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // Calculate totals for the orderbook entries
  const calculateTotals = useCallback((entries) => {
    let runningTotal = 0;
    return entries.map(entry => {
      runningTotal += parseFloat(entry.amount);
      return { ...entry, total: runningTotal };
    });
  }, []);

  // Merge real orderbook with virtual orders and sort appropriately
  const mergeOrderbooks = useCallback(() => {
    // Clone real orderbook entries and mark them as real
    const realBids = orderbook.bids.map(bid => ({ ...bid, isVirtual: false }));
    const realAsks = orderbook.asks.map(ask => ({ ...ask, isVirtual: false }));
    
    // Combine real and virtual orders
    const combinedBids = [...realBids, ...virtualOrders.bids];
    const combinedAsks = [...realAsks, ...virtualOrders.asks];
    
    // Sort bids in descending order (highest price first)
    const sortedBids = combinedBids
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 20); // Keep top 20
    
    // Sort asks in ascending order (lowest price first)
    const sortedAsks = combinedAsks
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, 20); // Keep top 20
    
    // Calculate running totals
    const bidsWithTotals = calculateTotals(sortedBids);
    const asksWithTotals = calculateTotals(sortedAsks);
    
    return {
      bids: bidsWithTotals,
      asks: asksWithTotals,
      lastUpdateId: orderbook.lastUpdateId
    };
  }, [orderbook, virtualOrders, calculateTotals]);

  // Add a virtual order to the orderbook
  const addVirtualOrder = useCallback((side, price, amount) => {
    setVirtualOrders(prev => {
      const sideKey = side.toLowerCase();
      if (sideKey !== 'bids' && sideKey !== 'asks') {
        console.error("Side must be 'bids' or 'asks'");
        return prev;
      }

      // Check if order at this price already exists
      const existingOrderIndex = prev[sideKey].findIndex(
        order => parseFloat(order.price) === parseFloat(price)
      );

      let newOrders;
      if (existingOrderIndex >= 0) {
        // Update existing order
        newOrders = [...prev[sideKey]];
        const oldAmount = parseFloat(newOrders[existingOrderIndex].amount);
        const newAmount = oldAmount + parseFloat(amount);
        
        if (newAmount <= 0) {
          // Remove the order if amount becomes zero or negative
          newOrders.splice(existingOrderIndex, 1);
        } else {
          // Update the amount
          newOrders[existingOrderIndex] = {
            ...newOrders[existingOrderIndex],
            amount: newAmount.toString()
          };
        }
      } else if (parseFloat(amount) > 0) {
        // Add new order only if amount is positive
        newOrders = [
          ...prev[sideKey],
          {
            price: price.toString(),
            amount: amount.toString(),
            isVirtual: true
          }
        ];
      } else {
        // Don't add new orders with negative or zero amount
        return prev;
      }

      return {
        ...prev,
        [sideKey]: newOrders
      };
    });
  }, []);

  // Remove a specific virtual order
  const removeVirtualOrder = useCallback((side, price) => {
    setVirtualOrders(prev => {
      const sideKey = side.toLowerCase();
      if (sideKey !== 'bids' && sideKey !== 'asks') {
        console.error("Side must be 'bids' or 'asks'");
        return prev;
      }

      const newOrders = prev[sideKey].filter(
        order => parseFloat(order.price) !== parseFloat(price)
      );

      return {
        ...prev,
        [sideKey]: newOrders
      };
    });
  }, []);

  // Clear all virtual orders
  const clearVirtualOrders = useCallback(() => {
    setVirtualOrders({
      bids: [],
      asks: []
    });
  }, []);

  // Connect to Binance WebSocket
  useEffect(() => {
    if (!symbol) return;

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@1000ms`);
    
    ws.onopen = () => {
      console.log(`WebSocket connected for ${symbol}`);
      setConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Process the orderbook data
        const processedBids = data.bids.map(([price, amount]) => ({
          price: price,
          amount: amount
        }));
        
        const processedAsks = data.asks.map(([price, amount]) => ({
          price: price,
          amount: amount
        }));
        
        setOrderbook({
          bids: processedBids,
          asks: processedAsks,
          lastUpdateId: data.lastUpdateId
        });
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
        setError('Failed to process orderbook data');
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      setError('WebSocket connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };
    
    // Clean up on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [symbol]);

  // Get the complete orderbook with virtual orders
  const getCompleteOrderbook = useCallback(() => {
    return mergeOrderbooks();
  }, [mergeOrderbooks]);

  // Context value
  const value = {
    rawOrderbook: orderbook,
    virtualOrders,
    orderbook: getCompleteOrderbook(),
    connected,
    error,
    addVirtualOrder,
    removeVirtualOrder,
    clearVirtualOrders
  };

  return (
    <OrderbookContext.Provider value={value}>
      {children}
    </OrderbookContext.Provider>
  );
};

export default OrderbookContext;