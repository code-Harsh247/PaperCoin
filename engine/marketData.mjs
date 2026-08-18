// Market data service: one WebSocket to Binance carrying the depth diff and
// aggTrade streams, plus the REST snapshot procedure that turns diffs into a
// correct L2 book. Emits:
//   'trade'  { tradeId, price, qty, buyerIsMaker, ts }   (units are BigInt 1e8)
//   'depth'  { bidPrices, askPrices }                    (changed price levels)
//   'sync'   { synced }                                  (book trust boundary)
//
// While synced=false the engine must not match — a gap means we no longer
// know the market, and inventing fills during a blackout is how a simulator
// starts lying.
import { EventEmitter } from 'node:events';
import { OrderBook, SequenceGapError } from './book.mjs';
import { parseUnits } from './money.mjs';

const SYMBOL = 'BTCUSDT';
const STREAM_URL =
  `wss://stream.binance.com:9443/stream?streams=${SYMBOL.toLowerCase()}@depth@100ms/${SYMBOL.toLowerCase()}@aggTrade`;
const SNAPSHOT_URL = `https://api.binance.com/api/v3/depth?symbol=${SYMBOL}&limit=1000`;

const BASE_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

export class MarketDataService extends EventEmitter {
  constructor() {
    super();
    this.book = new OrderBook();
    this.ws = null;
    this.attempt = 0;
    this.stopped = false;
    this.buffer = [];        // depth diffs buffered while the snapshot loads
    this.syncing = false;
    this.lastEventAt = 0;    // wall-clock ms, for the health endpoint only
  }

  start() {
    this.stopped = false;
    this.#connect();
  }

  stop() {
    this.stopped = true;
    this.ws?.close();
  }

  get synced() {
    return this.book.synced;
  }

  #connect() {
    if (this.stopped) return;
    const ws = new WebSocket(STREAM_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.#resync();
    };

    ws.onmessage = (msg) => {
      this.lastEventAt = Date.now();
      let payload;
      try {
        payload = JSON.parse(msg.data).data;
      } catch {
        return;
      }
      if (!payload) return;
      if (payload.e === 'depthUpdate') this.#onDepth(payload);
      else if (payload.e === 'aggTrade') this.#onTrade(payload);
    };

    // A failed socket fires error then close; retrying from close covers both.
    ws.onclose = () => {
      if (this.stopped) return;
      this.#markStale();
      const backoff = Math.min(BASE_RETRY_MS * 2 ** this.attempt, MAX_RETRY_MS);
      this.attempt += 1;
      const delay = backoff / 2 + Math.random() * (backoff / 2);
      setTimeout(() => this.#connect(), delay);
    };
  }

  #markStale() {
    if (this.book.synced) {
      this.book.synced = false;
      this.emit('sync', { synced: false });
    }
  }

  // Binance spot procedure: buffer diffs, fetch a REST snapshot, drop diffs
  // entirely older than it, apply the rest, then require contiguity.
  async #resync() {
    if (this.syncing) return;
    this.syncing = true;
    this.#markStale();
    this.buffer = [];
    try {
      const res = await fetch(SNAPSHOT_URL);
      if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
      const snap = await res.json();
      this.book.applySnapshot(snap);
      for (const diff of this.buffer) this.#applyDiff(diff);
      this.buffer = [];
      this.emit('sync', { synced: true });
    } catch (err) {
      this.emit('error_note', `resync failed: ${err.message}`);
      setTimeout(() => { this.syncing = false; this.#resync(); }, 2000);
      return;
    }
    this.syncing = false;
  }

  #onDepth(d) {
    if (this.syncing) {
      this.buffer.push(d);
      if (this.buffer.length > 5000) this.buffer.shift();
      return;
    }
    if (!this.book.synced) return;
    this.#applyDiff(d);
  }

  #applyDiff(d) {
    try {
      const applied = this.book.applyDiff(d);
      if (applied) {
        this.emit('depth', {
          bidPrices: d.b.map(([p]) => parseUnits(p)),
          askPrices: d.a.map(([p]) => parseUnits(p)),
        });
      }
    } catch (err) {
      if (err instanceof SequenceGapError) {
        this.emit('error_note', `depth gap: ${err.message}`);
        this.#resync();
      } else {
        throw err;
      }
    }
  }

  #onTrade(t) {
    // Trades are ground truth and independent of book sync state: the engine
    // decides what to do with them while stale (it buffers), not us.
    this.emit('trade', {
      tradeId: t.a,
      price: parseUnits(t.p),
      qty: parseUnits(t.q),
      buyerIsMaker: t.m,
      ts: t.T,
    });
  }
}
