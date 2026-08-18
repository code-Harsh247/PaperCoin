'use client';
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

// Owns the backtest session: starting/stopping it on the server, and the SSE
// feed of replayed prices and fills. While a session is running, the trading
// UI derives its price, balances, and order routing from here instead of the
// live market — that split is the whole point: a backtest order must never
// reach the live engine.
const BacktestContext = createContext();

export const useBacktest = () => useContext(BacktestContext);

export const BacktestProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null); // running|completed|stopped|error
  const [backtestConfig, setBacktestConfig] = useState(null);
  const [replayPrice, setReplayPrice] = useState(null);   // string, e.g. "64251.10000000"
  const [replayTs, setReplayTs] = useState(null);         // ms, the replay clock
  const [lastError, setLastError] = useState(null);
  // Bumped on every fill/order event so order lists and balances know to refetch.
  const [fillCounter, setFillCounter] = useState(0);
  const esRef = useRef(null);

  const backtestActive = sessionId !== null && sessionStatus === 'running';

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const startBacktest = useCallback(async (config) => {
    setLastError(null);
    try {
      const { data } = await axios.post('/api/backtest/sessions', {
        startDate: config.startDateTime,
        endDate: config.endDateTime,
        speed: config.speed,
      });
      const id = Number(data.session_id);
      setBacktestConfig(config);
      setSessionId(id);
      setSessionStatus('running');
      setReplayPrice(null);
      setReplayTs(null);

      const es = new EventSource(`/api/backtest/sessions/${id}/stream`);
      esRef.current = es;
      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data);
          if (event.type === 'trade') {
            setReplayPrice(event.price);
            setReplayTs(event.ts);
          } else if (event.type === 'fill' || event.type === 'order_update') {
            setFillCounter((c) => c + 1);
          } else if (event.type === 'session') {
            setSessionStatus(event.status);
            setFillCounter((c) => c + 1);
            es.close();
          }
        } catch { /* skip malformed */ }
      };
      es.onerror = () => {
        // EventSource retries by itself; a persistent failure surfaces when
        // the user checks progress. Nothing sensible to do here.
      };
      return { ok: true, tradesInWindow: data.trades_in_window };
    } catch (err) {
      const detail = err.response?.data;
      const message = detail?.available_from
        ? `No data in that window. Captured data runs ${new Date(detail.available_from).toLocaleString()} – ${new Date(detail.available_to).toLocaleString()}.`
        : (detail?.error || err.message);
      setLastError(message);
      return { ok: false, error: message };
    }
  }, []);

  const stopBacktest = useCallback(async () => {
    if (sessionId === null) return;
    try {
      await axios.delete(`/api/backtest/sessions/${sessionId}`);
    } catch (err) {
      console.error('Failed to stop backtest:', err);
    }
    closeStream();
    setSessionStatus('stopped');
  }, [sessionId, closeStream]);

  // Leaving the page mid-session: close the stream; the server session keeps
  // running and can be found again via GET /api/backtest/sessions.
  useEffect(() => closeStream, [closeStream]);

  return (
    <BacktestContext.Provider
      value={{
        backtestActive,
        sessionId,
        sessionStatus,
        backtestConfig,
        replayPrice,
        replayTs,
        fillCounter,
        lastError,
        startBacktest,
        stopBacktest,
      }}
    >
      {children}
    </BacktestContext.Provider>
  );
};
