'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Every live stream in the app comes from Binance, and the connection drops for
// reasons that have nothing to do with the app: laptop sleep, wifi handover,
// switching a VPN on or off. A plain WebSocket goes silent for good when that
// happens, so all of them reconnect through this hook instead.
//
// status is one of 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'.

const BASE_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

export default function useReconnectingWebSocket(url, { onMessage, onOpen } = {}) {
  const [status, setStatus] = useState(url ? 'connecting' : 'idle');
  const socketRef = useRef(null);
  const retryTimerRef = useRef(null);
  const attemptRef = useRef(0);
  const disposedRef = useRef(false);

  // Held in a ref so that a caller passing inline callbacks does not tear the
  // socket down and rebuild it on every render.
  const handlersRef = useRef({ onMessage, onOpen });
  useEffect(() => {
    handlersRef.current = { onMessage, onOpen };
  }, [onMessage, onOpen]);

  const send = useCallback((data) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }, []);

  useEffect(() => {
    if (!url) {
      setStatus('idle');
      return undefined;
    }

    disposedRef.current = false;
    attemptRef.current = 0;

    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const scheduleRetry = () => {
      if (disposedRef.current || retryTimerRef.current) return;
      setStatus('reconnecting');

      const backoff = Math.min(BASE_RETRY_MS * 2 ** attemptRef.current, MAX_RETRY_MS);
      attemptRef.current += 1;
      // Jitter, so several streams reconnecting together do not sync up into
      // bursts against the same endpoint.
      const delay = backoff / 2 + Math.random() * (backoff / 2);

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposedRef.current) return;
      setStatus(attemptRef.current === 0 ? 'connecting' : 'reconnecting');

      let socket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleRetry();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposedRef.current) {
          socket.close();
          return;
        }
        attemptRef.current = 0;
        setStatus('open');
        handlersRef.current.onOpen?.(socket);
      };

      socket.onmessage = (event) => {
        if (!disposedRef.current) handlersRef.current.onMessage?.(event);
      };

      // A failed socket fires onerror and then onclose, so retrying from
      // onclose alone covers both a dropped connection and one that never
      // opened. The browser logs the underlying reason itself; the error event
      // carries no detail worth logging on top of that.
      socket.onclose = () => {
        if (disposedRef.current) return;
        socketRef.current = null;
        scheduleRetry();
      };
    };

    // Back from sleep or a VPN switch: go now instead of sitting out the rest
    // of the backoff.
    const reconnectNow = () => {
      if (disposedRef.current || socketRef.current) return;
      clearRetry();
      attemptRef.current = 0;
      connect();
    };

    connect();
    window.addEventListener('online', reconnectNow);

    return () => {
      disposedRef.current = true;
      clearRetry();
      window.removeEventListener('online', reconnectNow);

      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      }
      setStatus('closed');
    };
  }, [url]);

  return { status, send };
}
