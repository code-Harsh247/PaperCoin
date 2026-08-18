// The fill model: given what actually traded on Binance, would this simulated
// order have filled, and by how much? Pure functions over BigInt units — no
// I/O, no database, no clock. Everything here is deterministic and unit-tested.
//
// Aggressor convention (Binance aggTrade `m` = "buyer is maker"):
//   m = true  -> the aggressor was a SELLER  -> consumes bids -> fills our BUYs
//   m = false -> the aggressor was a BUYER   -> consumes asks -> fills our SELLs
import { mulUnits, minUnits, ZERO } from './money.mjs';

export function aggressorOf(buyerIsMaker) {
  return buyerIsMaker ? 'sell' : 'buy';
}

// Applies one market trade to one resting limit order.
//
// For a buy resting at P, against an aggressive-sell trade (price p, qty q):
//   p > P   untouched — the trade happened above our bid
//   p == P  the trade consumed the queue at our level; we fill only with the
//           overflow past what was ahead of us
//   p < P   the market traded through our level, so every bid at P (including
//           ours) must already have been taken out: fill the remainder in full,
//           at OUR price — we were resting, not crossing
//
// Sells mirror exactly. Returns { fillQty, queueAhead } — fillQty may be ZERO
// with the queue still advancing, which is real progress worth persisting.
export function applyTradeToRestingLimit(order, trade) {
  if (aggressorOf(trade.buyerIsMaker) !== (order.side === 'buy' ? 'sell' : 'buy')) {
    return null; // wrong direction: this trade consumed the other side of the book
  }

  const P = order.limitPrice;
  const tradedThrough = order.side === 'buy' ? trade.price < P : trade.price > P;
  const atOurPrice = trade.price === P;

  if (tradedThrough) {
    return { fillQty: order.remaining, queueAhead: ZERO };
  }
  if (!atOurPrice) return null;

  const consumed = minUnits(trade.qty, order.queueAhead);
  const queueAhead = order.queueAhead - consumed;
  const overflow = trade.qty - consumed;
  const fillQty = overflow > ZERO ? minUnits(overflow, order.remaining) : ZERO;
  return { fillQty, queueAhead };
}

// Queue policy on depth updates. L2 depth cannot tell us whether volume that
// vanished at our level was ahead of us or behind us — both are consistent
// with what we observe. Pessimistic takes only the hard bound: no more can be
// ahead of us than rests at the level at all (our simulated order is not part
// of the real book, so levelVolume is entirely other people). Optimistic
// additionally attributes any shrinkage to cancellations ahead of us; it will
// double-count shrinkage caused by trades we also processed, which is exactly
// why it is not the default.
export function applyDepthToQueue(queueAhead, levelVolume, lastSeenVolume, policy = 'pessimistic') {
  let q = queueAhead;
  if (policy === 'optimistic' && lastSeenVolume !== undefined && levelVolume < lastSeenVolume) {
    const shrink = lastSeenVolume - levelVolume;
    q = q > shrink ? q - shrink : ZERO;
  }
  return minUnits(q, levelVolume);
}

// Walks book levels for an aggressive (taker) execution: market orders, and
// the crossing portion of a marketable limit. Returns per-level fills; the
// price paid is each level's own price, so slippage is not modelled — it
// simply happens.
export function walkBook(levels, qty, limitPrice = null, side = 'buy') {
  const fills = [];
  let remaining = qty;
  for (const level of levels) {
    if (remaining === ZERO) break;
    if (limitPrice !== null) {
      const beyondLimit = side === 'buy' ? level.price > limitPrice : level.price < limitPrice;
      if (beyondLimit) break;
    }
    const take = minUnits(remaining, level.qty);
    if (take > ZERO) {
      fills.push({ price: level.price, qty: take });
      remaining -= take;
    }
  }
  return { fills, remaining };
}

export function vwap(fills) {
  let qty = ZERO;
  let value = ZERO;
  for (const f of fills) {
    qty += f.qty;
    value += mulUnits(f.qty, f.price);
  }
  return qty === ZERO ? null : { qty, value };
}

// Stops trigger on the LAST TRADED price, never the quote: quotes flicker
// without anything changing hands, and a stop that fires on a flicker is a
// stop that lies.
export function stopTriggered(order, lastTradePrice) {
  return order.side === 'buy'
    ? lastTradePrice >= order.stopPrice
    : lastTradePrice <= order.stopPrice;
}
