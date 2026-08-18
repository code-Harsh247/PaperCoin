'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';
import { useBacktest } from './BacktestContext';
import useReconnectingWebSocket from '@/lib/useReconnectingWebSocket';

// Displays the live Binance book, overlaid with the user's own open orders
// from the server engine. This context no longer places or matches anything —
// the engine process owns fills; the UI only renders state and asks for
// refreshes.
const OrderbookContext = createContext();

export const useOrderbook = () => useContext(OrderbookContext);

export const OrderbookProvider = ({ symbol, children }) => {
  const [orderbook, setOrderbook] = useState({
    bids: [], // Array of {price, amount, total, isVirtual}
    asks: [],
    lastUpdateId: 0,
  });
  const { user } = useAuthStore();
  const [virtualOrders, setVirtualOrders] = useState({ bids: [], asks: [] });
  const { backtestActive, backtestConfig, sessionId, fillCounter } = useBacktest();
  const [error, setError] = useState(null);

  const calculateTotals = useCallback((entries) => {
    let runningTotal = 0;
    return entries.map((entry) => {
      runningTotal += parseFloat(entry.amount);
      return { ...entry, total: runningTotal };
    });
  }, []);

  const mergeOrderbooks = useCallback(() => {
    const realBids = orderbook.bids.map((bid) => ({ ...bid, isVirtual: false }));
    const realAsks = orderbook.asks.map((ask) => ({ ...ask, isVirtual: false }));

    const combinedBids = [...realBids, ...virtualOrders.bids];
    const combinedAsks = [...realAsks, ...virtualOrders.asks];

    const sortedBids = combinedBids
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 20);
    const sortedAsks = combinedAsks
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, 20);

    return {
      bids: calculateTotals(sortedBids),
      asks: calculateTotals(sortedAsks),
      lastUpdateId: orderbook.lastUpdateId,
    };
  }, [orderbook, virtualOrders, calculateTotals]);

  // The user's open orders on the engine, shown as the "virtual" overlay in
  // the book — the backtest session's orders while one is running, live
  // orders otherwise. Remaining quantity only.
  const refreshOrders = useCallback(async () => {
    if (!user?.userId) {
      setVirtualOrders({ bids: [], asks: [] });
      return;
    }
    try {
      const url = backtestActive
        ? `/api/backtest/orders?session_id=${sessionId}&scope=open`
        : '/api/orders?scope=open';
      const { data } = await axios.get(url);
      const bids = [];
      const asks = [];
      for (const o of data.orders ?? []) {
        if (!o.limit_price) continue; // market/stop orders don't rest at a price
        const remaining = parseFloat(o.quantity) - parseFloat(o.filled_quantity);
        if (remaining <= 0) continue;
        const entry = {
          price: String(o.limit_price),
          amount: String(remaining),
          isVirtual: true,
          orderId: o.id,
        };
        (o.side === 'buy' ? bids : asks).push(entry);
      }
      setVirtualOrders({ bids, asks });
    } catch (err) {
      console.error('Error fetching open orders:', err);
    }
  }, [user, backtestActive, sessionId]);

  // Refresh on login, every few seconds, and on every backtest fill event;
  // anything that places or cancels can also call refreshOrders() directly.
  useEffect(() => {
    refreshOrders();
    const interval = setInterval(refreshOrders, 3000);
    return () => clearInterval(interval);
  }, [refreshOrders, fillCounter]);

  // Depth stream for the book visual (display only): live Binance normally,
  // the local snapshot-replay server during a backtest. The replay server's
  // address is config, not a constant — the old hardcoded IP was a VM that
  // no longer exists.
  const streamUrl = symbol
    ? (backtestActive
        ? (process.env.NEXT_PUBLIC_BACKTEST_WS_URL || 'ws://localhost:8080')
        : `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@1000ms`)
    : null;

  const handleStreamOpen = useCallback((socket) => {
    console.log(`WebSocket connected to ${backtestActive ? 'BACKTEST' : 'LIVE'} for ${symbol}`);
    setError(null);

    if (backtestActive && backtestConfig) {
      console.log('Sending backtest configuration:', backtestConfig);
      socket.send(JSON.stringify({
        startDate: backtestConfig.startDateTime,
        endDate: backtestConfig.endDateTime,
        speed: backtestConfig.speed,
      }));
    }
  }, [symbol, backtestActive, backtestConfig]);

  const handleStreamMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      if (backtestActive) console.log('Backtest data: ', data);
      if (!data.bids || !data.asks) {
        console.warn('Skipping message: missing bids or asks');
        return;
      }
      setOrderbook({
        bids: data.bids.map(([price, amount]) => ({ price, amount })),
        asks: data.asks.map(([price, amount]) => ({ price, amount })),
        lastUpdateId: data.lastUpdateId,
      });
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
      setError('Failed to process orderbook data');
    }
  }, [backtestActive]);

  const { status: connectionStatus } = useReconnectingWebSocket(streamUrl, {
    onOpen: handleStreamOpen,
    onMessage: handleStreamMessage,
  });

  const connected = connectionStatus === 'open';

  useEffect(() => {
    if (connectionStatus === 'reconnecting') {
      setError('Lost connection to the market feed. Reconnecting...');
    }
  }, [connectionStatus]);

  const getCompleteOrderbook = useCallback(() => mergeOrderbooks(), [mergeOrderbooks]);

  const value = {
    rawOrderbook: orderbook,
    virtualOrders,
    orderbook: getCompleteOrderbook(),
    connected,
    connectionStatus,
    error,
    refreshOrders,
  };

  return (
    <OrderbookContext.Provider value={value}>
      {children}
    </OrderbookContext.Provider>
  );
};

export default OrderbookContext;
