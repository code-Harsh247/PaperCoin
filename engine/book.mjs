// In-memory L2 order book, maintained from a REST snapshot plus the diff
// stream, following Binance's documented spot procedure. Pure data structure:
// no sockets, no clock — that's what makes it unit-testable.
import { parseUnits, ZERO } from './money.mjs';

export class OrderBook {
  constructor() {
    this.bids = new Map(); // price units (BigInt as string key) -> qty units
    this.asks = new Map();
    this.lastUpdateId = 0;
    this.synced = false;
  }

  // Map keys must be primitives; BigInt works directly as a key via its
  // canonical string, but we normalise through toString to keep it explicit.
  static key(priceUnits) {
    return priceUnits.toString();
  }

  applySnapshot({ lastUpdateId, bids, asks }) {
    this.bids.clear();
    this.asks.clear();
    for (const [p, q] of bids) this.#setLevel(this.bids, parseUnits(p), parseUnits(q));
    for (const [p, q] of asks) this.#setLevel(this.asks, parseUnits(p), parseUnits(q));
    this.lastUpdateId = lastUpdateId;
    this.synced = true;
  }

  // Applies one depth diff event. Returns false when the event is from before
  // the snapshot (skip it), true when applied, and throws on a sequence gap —
  // the caller must resync, because a gap means the book is no longer the
  // market's book.
  applyDiff({ U, u, b, a }) {
    if (u <= this.lastUpdateId) return false;
    if (U > this.lastUpdateId + 1) {
      this.synced = false;
      throw new SequenceGapError(`expected U <= ${this.lastUpdateId + 1}, got ${U}`);
    }
    for (const [p, q] of b) this.#setLevel(this.bids, parseUnits(p), parseUnits(q));
    for (const [p, q] of a) this.#setLevel(this.asks, parseUnits(p), parseUnits(q));
    this.lastUpdateId = u;
    return true;
  }

  #setLevel(side, priceUnits, qtyUnits) {
    const k = OrderBook.key(priceUnits);
    if (qtyUnits === ZERO) side.delete(k);
    else side.set(k, qtyUnits);
  }

  // Real resting volume at an exact price (our simulated orders are never in
  // this book, so this is exactly "the queue" a joining order sits behind).
  volumeAt(side, priceUnits) {
    const levels = side === 'buy' ? this.bids : this.asks;
    return levels.get(OrderBook.key(priceUnits)) ?? ZERO;
  }

  // Levels a market/crossing BUY consumes: asks, cheapest first.
  // For a SELL: bids, highest first. Sorted on demand — walking happens only
  // when an aggressive order arrives, not on every tick.
  levelsFor(side) {
    const levels = side === 'buy' ? this.asks : this.bids;
    const entries = [...levels.entries()].map(([p, q]) => ({ price: BigInt(p), qty: q }));
    entries.sort(side === 'buy'
      ? (x, y) => (x.price < y.price ? -1 : 1)
      : (x, y) => (x.price > y.price ? -1 : 1));
    return entries;
  }

  bestBid() {
    let best = null;
    for (const p of this.bids.keys()) {
      const v = BigInt(p);
      if (best === null || v > best) best = v;
    }
    return best;
  }

  bestAsk() {
    let best = null;
    for (const p of this.asks.keys()) {
      const v = BigInt(p);
      if (best === null || v < best) best = v;
    }
    return best;
  }
}

export class SequenceGapError extends Error {}
