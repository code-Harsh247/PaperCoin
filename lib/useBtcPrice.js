'use client';
import { useCallback, useState } from 'react';
import useReconnectingWebSocket from './useReconnectingWebSocket';

// Live BTC/USDT price. Several dashboard pieces need the same number to agree,
// and each one opening its own socket meant they could drift apart and each
// fail independently.
export default function useBtcPrice() {
  const [price, setPrice] = useState(0);
  // Price 24h ago, so callers can express a day's change without needing a
  // stored snapshot from yesterday.
  const [openPrice, setOpenPrice] = useState(0);

  const handleMessage = useCallback((event) => {
    try {
      const ticker = JSON.parse(event.data);
      setPrice(parseFloat(ticker.c));
      setOpenPrice(parseFloat(ticker.o));
    } catch (err) {
      console.error('Error processing ticker data:', err);
    }
  }, []);

  const { status } = useReconnectingWebSocket(
    'wss://stream.binance.com:9443/ws/btcusdt@ticker',
    { onMessage: handleMessage }
  );

  return { price, openPrice, status, connected: status === 'open' };
}
