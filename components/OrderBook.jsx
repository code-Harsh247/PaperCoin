'use client';

import { useEffect, useState } from 'react';
import { connectOrderBook, getTopOfBook } from '@/lib/binance-orderbook';

export default function OrderBook() {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);

  useEffect(() => {
    connectOrderBook('bnbbtc', ({ bids, asks }) => {
      setBids(bids);
      setAsks(asks);
    });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 p-4 font-mono">
      <div>
        <h2 className="text-xl font-bold mb-2">Bids</h2>
        <ul className="text-green-600">
          {bids.map(([price, qty], i) => (
            <li key={i}>{price.toFixed(6)} — {qty.toFixed(4)}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Asks</h2>
        <ul className="text-red-600">
          {asks.map(([price, qty], i) => (
            <li key={i}>{price.toFixed(6)} — {qty.toFixed(4)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
