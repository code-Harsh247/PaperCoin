let localOrderBook = {
    bids: new Map(),
    asks: new Map(),
    lastUpdateId: 0
  };
  
  let snapshotReceived = false;
  let eventBuffer = [];
  
  export function connectOrderBook(symbol = 'bnbbtc', onUpdate = () => {}) {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth`);
  
    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      if (!snapshotReceived) {
        eventBuffer.push(data);
      } else {
        handleDepthUpdate(data, onUpdate);
      }
    };
  
    fetchSnapshot(symbol, onUpdate);
  }
  
  async function fetchSnapshot(symbol, onUpdate) {
    const url = `https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=5000`;
  
    while (true) {
      const res = await fetch(url);
      const snapshot = await res.json();
  
      const firstU = eventBuffer[0]?.U;
      if (snapshot.lastUpdateId >= firstU) {
        applySnapshot(snapshot);
        snapshotReceived = true;
  
        eventBuffer = eventBuffer.filter((e) => e.u > snapshot.lastUpdateId);
        for (const event of eventBuffer) {
          handleDepthUpdate(event, onUpdate);
        }
        eventBuffer = [];
        break;
      }
    }
  }
  
  function applySnapshot(snapshot) {
    localOrderBook.bids = new Map(snapshot.bids.map(([p, q]) => [p, q]));
    localOrderBook.asks = new Map(snapshot.asks.map(([p, q]) => [p, q]));
    localOrderBook.lastUpdateId = snapshot.lastUpdateId;
  }
  
  function handleDepthUpdate(update, onUpdate) {
    const { U, u, b: bids, a: asks } = update;
  
    if (u <= localOrderBook.lastUpdateId) return;
    if (U > localOrderBook.lastUpdateId + 1) {
      console.error("Desync detected — restart sync");
      snapshotReceived = false;
      eventBuffer = [];
      return;
    }
  
    for (const [price, qty] of bids) {
      if (+qty === 0) localOrderBook.bids.delete(price);
      else localOrderBook.bids.set(price, qty);
    }
  
    for (const [price, qty] of asks) {
      if (+qty === 0) localOrderBook.asks.delete(price);
      else localOrderBook.asks.set(price, qty);
    }
  
    localOrderBook.lastUpdateId = u;
    onUpdate(getTopOfBook()); // Notify UI
  }
  
  export function getTopOfBook(depth = 20) {
    const sortedBids = [...localOrderBook.bids.entries()]
      .map(([price, qty]) => [parseFloat(price), parseFloat(qty)])
      .sort((a, b) => b[0] - a[0])
      .slice(0, depth);
  
    const sortedAsks = [...localOrderBook.asks.entries()]
      .map(([price, qty]) => [parseFloat(price), parseFloat(qty)])
      .sort((a, b) => a[0] - b[0])
      .slice(0, depth);
  
    return { bids: sortedBids, asks: sortedAsks };
  }
  