'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';
import { useBacktest } from './BacktestContext';
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
  const { user } = useAuthStore();
  const [virtualOrders, setVirtualOrders] = useState({
    bids: [], // Array of {price, amount, isVirtual: true}
    asks: [], // Array of {price, amount, isVirtual: true}
  });
  const { backtestActive, backtestConfig } = useBacktest(); 
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false); 
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

  // Add a virtual order to the orderbook and save to database
  const addVirtualOrder = useCallback(async (side, price, amount) => {
    const sideKey = side.toLowerCase();
    if (sideKey !== 'bids' && sideKey !== 'asks') {
      console.error("Side must be 'bids' or 'asks'");
      return;
    }

    // Convert side name to trade_type (bid/ask) for database
    const trade_type = sideKey === 'bids' ? 'bid' : 'ask';

    console.log(`Adding virtual order: ${sideKey} - Price: ${price}, Amount: ${amount}`);

    // First update virtual orders for immediate UI feedback
    setVirtualOrders(prev => {
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

    // Only proceed to save in database if we have a user and positive amount

    try {
      // Save the trade to database using Axios
      const response = await axios.post('/api/trades/makeTrade', {
        user_id: user.userId,
        trade_type,
        price: parseFloat(price),
        amount: parseFloat(amount),
        filled_amount: 0, // New orders start with no filled amount
        status: 'open' // New orders start with open status
      });

      console.log('Trade saved successfully:', response.data);

    } catch (error) {
      console.error('Error during trade creation:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      // Consider adding error state or notifications here
      // But don't revert the UI state as it would be confusing to users
    }

  }, [user]);

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

// Fetch user trades and add them to virtual orders
const fetchUserTrades = useCallback(async () => {
  if (!user?.userId) return;
  
  try {
    setIsLoadingTrades(true);
    
    // First clear existing virtual orders to avoid duplicates
    clearVirtualOrders();
    
    // Using POST method with Axios
    const response = await axios.post('/api/trades/fetchTrades', {
      user_id: user.userId
    });
    
    // Check if we have trades
    const trades = response.data.trades || [];
    console.log('Fetched trades:', trades);
    // Process trades and add them to virtual orders
    trades.forEach(trade => {
      // Only add active trades that aren't fully filled
      if (trade.status === 'open' || trade.status === 'partially_filled') {
        const remainingAmount = parseFloat(trade.amount) - parseFloat(trade.filled_amount);
        
        if (remainingAmount > 0) {
          // For "bid" trades, add to bids; for "ask" trades, add to asks
          const side = trade.trade_type === 'bid' ? 'bids' : 'asks';
          
          // Add to virtual order but don't save to database again
          setVirtualOrders(prev => {
            // Create new virtual order
            const newOrder = {
              price: trade.price.toString(),
              amount: remainingAmount.toString(),
              isVirtual: true,
              tradeId: trade.id // Store the trade ID for reference
            };
            
            return {
              ...prev,
              [side]: [...prev[side], newOrder]
            };
          });
        }
      }
    });
    
    console.log('User trades added to virtual orderbook');
  } catch (err) {
    console.error('Error fetching user trades:', err);
    if (err.response) {
      console.error('Error response:', err.response.data);
    }
    setError('Failed to load user trades');
  } finally {
    setIsLoadingTrades(false);
  }
}, [user, clearVirtualOrders]);

  // Connect to WebSocket
  useEffect(() => {
    if (!symbol) return;
    // console.log("Backtesting url : ",process.env.BACKTEST_URL);
    const url = backtestActive
      ? "ws://20.193.153.208:8080"
      : `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@1000ms`;
  
    const ws = new WebSocket(url);
  
    ws.onopen = () => {
      console.log(`WebSocket connected to ${backtestActive ? 'BACKTEST' : 'LIVE'} for ${symbol}`);
      setConnected(true);
      setError(null);
  
      if (backtestActive && backtestConfig) {
        // Send config to the backtest stream
        console.log('Sending backtest configuration:', backtestConfig);
        ws.send(JSON.stringify({
          startDate: backtestConfig.startDateTime,
          endDate: backtestConfig.endDateTime,
          speed: backtestConfig.speed,
        }));
      }
    };
  
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if(backtestActive) console.log("Backtest data: ",data);
        // Process the orderbook data
        if (!data.bids || !data.asks) {
          console.warn('Skipping message: missing bids or asks');
          return;
        }
        const processedBids = data.bids.map(([price, amount]) => ({
          price,
          amount
        }));
  
        const processedAsks = data.asks.map(([price, amount]) => ({
          price,
          amount
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
  
    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [symbol, backtestActive, backtestConfig]);
  

  // Fetch user trades when component mounts or user changes
  useEffect(() => {
    fetchUserTrades();
  }, [fetchUserTrades, user]);

  // Get the complete orderbook with virtual orders
  const getCompleteOrderbook = useCallback(() => {
    return mergeOrderbooks();
  }, [mergeOrderbooks]);

  // useEffect(() => {
  //   console.log('Orderbook updated:', orderbook);
  // }, [orderbook]);

  // Context value
  const value = {
    rawOrderbook: orderbook,
    virtualOrders,
    orderbook: getCompleteOrderbook(),
    connected,
    error,
    isLoadingTrades,
    addVirtualOrder,
    removeVirtualOrder,
    clearVirtualOrders,
    fetchUserTrades  // Expose the fetch function in case you need to refresh manually
  };

  return (
    <OrderbookContext.Provider value={value}>
      {children}
    </OrderbookContext.Provider>
  );
};

export default OrderbookContext;