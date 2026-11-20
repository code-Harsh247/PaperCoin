import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits as u, fmtUnits, mulUnits } from '../money.mjs';
import { OrderBook, SequenceGapError } from '../book.mjs';
import {
  applyTradeToRestingLimit, applyDepthToQueue, walkBook, vwap, stopTriggered, aggressorOf,
  allocateTrade,
} from '../fillModel.mjs';

// ---------- money ----------

test('money: parse/format round-trips exactly', () => {
  for (const s of ['0.00000001', '64000.12345678', '10000.00000000', '0.00000000']) {
    assert.equal(fmtUnits(u(s)), s.includes('.') ? s.padEnd(s.indexOf('.') + 9, '0') : s);
  }
  assert.equal(fmtUnits(u('-5.5')), '-5.50000000');
});

test('money: rejects more than 8 decimals instead of truncating', () => {
  assert.throws(() => u('1.123456789'));
  assert.throws(() => u('abc'));
  assert.throws(() => u('1e5'));
});

test('money: multiplication floors, so per-fill values can only undershoot', () => {
  // 0.00000003 BTC x 0.33333333 -> floor to 0 units, never rounds up
  assert.equal(mulUnits(u('0.00000003'), u('0.33333333')), 0n);
  assert.equal(fmtUnits(mulUnits(u('0.5'), u('64000'))), '32000.00000000');
});

// ---------- order book ----------

const snapshot = {
  lastUpdateId: 100,
  bids: [['64000.00', '2.0'], ['63999.00', '5.0']],
  asks: [['64001.00', '1.5'], ['64002.00', '3.0']],
};

test('book: snapshot then contiguous diffs apply; stale diffs are skipped', () => {
  const book = new OrderBook();
  book.applySnapshot(snapshot);
  assert.equal(book.applyDiff({ U: 90, u: 100, b: [['1.00', '9.9']], a: [] }), false);
  assert.equal(book.volumeAt('buy', u('1.00')), 0n); // stale diff must not touch the book
  assert.equal(book.applyDiff({ U: 101, u: 105, b: [['64000.00', '2.5']], a: [['64001.00', '0']] }), true);
  assert.equal(book.volumeAt('buy', u('64000.00')), u('2.5'));
  assert.equal(book.volumeAt('sell', u('64001.00')), 0n); // zero qty removes the level
});

test('book: a sequence gap throws and marks the book unsynced', () => {
  const book = new OrderBook();
  book.applySnapshot(snapshot);
  assert.throws(() => book.applyDiff({ U: 150, u: 160, b: [], a: [] }), SequenceGapError);
  assert.equal(book.synced, false);
});

test('book: levelsFor sorts asks ascending for buys, bids descending for sells', () => {
  const book = new OrderBook();
  book.applySnapshot(snapshot);
  assert.deepEqual(book.levelsFor('buy').map((l) => fmtUnits(l.price)),
    ['64001.00000000', '64002.00000000']);
  assert.deepEqual(book.levelsFor('sell').map((l) => fmtUnits(l.price)),
    ['64000.00000000', '63999.00000000']);
  assert.equal(fmtUnits(book.bestBid()), '64000.00000000');
  assert.equal(fmtUnits(book.bestAsk()), '64001.00000000');
});

// ---------- resting-limit fill rules ----------

const buyOrder = (over = {}) => ({
  side: 'buy', limitPrice: u('64000'), remaining: u('1.0'), queueAhead: u('2.0'), ...over,
});
// aggressive sell = buyerIsMaker true
const sell = (price, qty) => ({ price: u(price), qty: u(qty), buyerIsMaker: true });
const buy = (price, qty) => ({ price: u(price), qty: u(qty), buyerIsMaker: false });

test('aggressor convention: m=true means the seller was aggressive', () => {
  assert.equal(aggressorOf(true), 'sell');
  assert.equal(aggressorOf(false), 'buy');
});

test('buy: trade above our bid is ignored', () => {
  assert.equal(applyTradeToRestingLimit(buyOrder(), sell('64000.01', '5')), null);
});

test('buy: wrong-direction trade (aggressive buy) never fills a buy', () => {
  assert.equal(applyTradeToRestingLimit(buyOrder(), buy('63999', '5')), null);
});

test('buy: trade at our price drains the queue before any fill', () => {
  const r = applyTradeToRestingLimit(buyOrder(), sell('64000', '1.5'));
  assert.equal(r.fillQty, 0n);              // 1.5 < 2.0 ahead of us: no fill yet
  assert.equal(r.queueAhead, u('0.5'));     // but the queue advanced
});

test('buy: overflow past the queue fills us partially', () => {
  const r = applyTradeToRestingLimit(buyOrder(), sell('64000', '2.6'));
  assert.equal(r.queueAhead, 0n);
  assert.equal(r.fillQty, u('0.6'));        // 2.6 - 2.0 ahead = 0.6 for us
});

test('buy: overflow is capped by our remaining quantity', () => {
  const r = applyTradeToRestingLimit(buyOrder(), sell('64000', '10'));
  assert.equal(r.fillQty, u('1.0'));
});

test('buy: market trading through our level fills the remainder at OUR price', () => {
  const o = buyOrder({ queueAhead: u('7.0') });   // deep queue is irrelevant on gap-through
  const r = applyTradeToRestingLimit(o, sell('63990', '0.1'));
  assert.equal(r.fillQty, u('1.0'));
  assert.equal(r.queueAhead, 0n);
});

test('sell: mirrors buy exactly', () => {
  const o = { side: 'sell', limitPrice: u('64100'), remaining: u('2.0'), queueAhead: u('1.0') };
  assert.equal(applyTradeToRestingLimit(o, buy('64099.99', '5')), null);  // below our ask
  const at = applyTradeToRestingLimit(o, buy('64100', '1.4'));
  assert.equal(at.fillQty, u('0.4'));
  const through = applyTradeToRestingLimit(o, buy('64150', '0.1'));
  assert.equal(through.fillQty, u('2.0'));  // gapped through: full fill at our price
});

// ---------- queue policy on depth updates ----------

test('pessimistic policy only applies the hard bound', () => {
  // level shrank 5 -> 3 with 4 ahead of us: at most 3 can be ahead now
  assert.equal(applyDepthToQueue(u('4'), u('3'), u('5'), 'pessimistic'), u('3'));
  // level grew: new arrivals join BEHIND us, queueAhead must not grow
  assert.equal(applyDepthToQueue(u('1'), u('9'), u('5'), 'pessimistic'), u('1'));
});

test('optimistic policy attributes shrinkage to cancellations ahead of us', () => {
  assert.equal(applyDepthToQueue(u('4'), u('3'), u('5'), 'optimistic'), u('2'));
  assert.equal(applyDepthToQueue(u('1'), u('9'), u('5'), 'optimistic'), u('1'));
});

// ---------- book walking (taker executions) ----------

const askLevels = [
  { price: u('64001'), qty: u('0.5') },
  { price: u('64002'), qty: u('1.0') },
  { price: u('64010'), qty: u('4.0') },
];

test('market buy walks levels in order and pays each level its own price', () => {
  const { fills, remaining } = walkBook(askLevels, u('1.2'), null, 'buy');
  assert.deepEqual(fills.map((f) => [fmtUnits(f.price), fmtUnits(f.qty)]), [
    ['64001.00000000', '0.50000000'],
    ['64002.00000000', '0.70000000'],
  ]);
  assert.equal(remaining, 0n);
  const w = vwap(fills);
  // 0.5x64001 + 0.7x64002 = 32000.5 + 44801.4 = 76801.9 for 1.2 BTC
  assert.equal(fmtUnits(w.value), '76801.90000000');
});

test('crossing limit stops walking at its limit price', () => {
  const { fills, remaining } = walkBook(askLevels, u('3'), u('64002'), 'buy');
  assert.equal(fmtUnits(fills.reduce((s, f) => s + f.qty, 0n)), '1.50000000');
  assert.equal(fmtUnits(remaining), '1.50000000'); // rests at the limit afterwards
});

test('exhausting the book leaves the remainder unfilled', () => {
  const { remaining } = walkBook(askLevels, u('100'), null, 'buy');
  assert.equal(fmtUnits(remaining), '94.50000000');
});

// ---------- stops ----------

test('stops trigger on last trade price, directionally', () => {
  const stopBuy = { side: 'buy', stopPrice: u('65000') };
  const stopSell = { side: 'sell', stopPrice: u('63000') };
  assert.equal(stopTriggered(stopBuy, u('64999.99')), false);
  assert.equal(stopTriggered(stopBuy, u('65000')), true);
  assert.equal(stopTriggered(stopSell, u('63000.01')), false);
  assert.equal(stopTriggered(stopSell, u('63000')), true);
});

// ---------- price-time priority across simulated orders ----------

const rest = (id, side, price, remaining, queueAhead, joinSeq = id) => ({
  id, side, limitPrice: u(price), remaining: u(remaining), queueAhead: u(queueAhead), joinSeq,
});
const fillsById = (results) =>
  Object.fromEntries(results.map((r) => [r.order.id, fmtUnits(r.fillQty)]));

test('time priority: two users at one price share a trade, earlier first', () => {
  // The bug this replaces: both used to fill 1 BTC from a single 1 BTC trade.
  const a = rest(1, 'buy', '64000', '1', '0');
  const b = rest(2, 'buy', '64000', '1', '0');
  const res = allocateTrade([a, b], sell('64000', '1'));
  assert.deepEqual(fillsById(res), { 1: '1.00000000', 2: '0.00000000' });
});

test('time priority follows joinSeq, not the order the array happens to be in', () => {
  const early = rest(7, 'buy', '64000', '1', '0', 1);
  const late = rest(3, 'buy', '64000', '1', '0', 2);
  const res = allocateTrade([late, early], sell('64000', '1'));
  assert.equal(fmtUnits(res.find((r) => r.order.id === 7).fillQty), '1.00000000');
  assert.equal(fmtUnits(res.find((r) => r.order.id === 3).fillQty), '0.00000000');
});

test('combined line interleaves real volume and earlier simulated orders', () => {
  // A: 2 real ahead, wants 0.5        -> line positions [2, 2.5)
  // B: 3 real ahead, behind A's 0.5   -> line positions [3.5, 4.5)
  // A 4 BTC trade fills all of A and the first 0.5 of B, and eats all of
  // B's real queue.
  const a = rest(1, 'buy', '64000', '0.5', '2');
  const b = rest(2, 'buy', '64000', '1', '3');
  const res = allocateTrade([a, b], sell('64000', '4'));
  assert.deepEqual(fillsById(res), { 1: '0.50000000', 2: '0.50000000' });
  assert.equal(fmtUnits(res.find((r) => r.order.id === 2).queueAhead), '0.00000000');
});

test('a trade too small to reach anyone still advances real queues', () => {
  const a = rest(1, 'buy', '64000', '1', '2');
  const b = rest(2, 'buy', '64000', '1', '3');
  const res = allocateTrade([a, b], sell('64000', '1.5'));
  assert.deepEqual(fillsById(res), { 1: '0.00000000', 2: '0.00000000' });
  assert.equal(fmtUnits(res.find((r) => r.order.id === 1).queueAhead), '0.50000000');
  assert.equal(fmtUnits(res.find((r) => r.order.id === 2).queueAhead), '1.50000000');
});

test('price priority: traded-through orders fill in full and do not draw on the trade', () => {
  const better = rest(1, 'buy', '64010', '5', '9');  // print is below it: swept
  const atPx = rest(2, 'buy', '64000', '1', '0');
  const worse = rest(3, 'buy', '63990', '1', '0');  // print is above it: untouched
  const res = allocateTrade([better, atPx, worse], sell('64000', '0.4'));
  assert.deepEqual(fillsById(res), { 1: '5.00000000', 2: '0.40000000' });
});

test('sells mirror buys', () => {
  const a = rest(1, 'sell', '64100', '1', '0');
  const b = rest(2, 'sell', '64100', '1', '0');
  const res = allocateTrade([a, b], buy('64100', '1.25'));
  assert.deepEqual(fillsById(res), { 1: '1.00000000', 2: '0.25000000' });
  assert.equal(allocateTrade([a, b], sell('64100', '5')).length, 0); // wrong side
});

function prng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6D2B79F5) >>> 0) / 4294967296);
}
const units = (r, max) => u((r() * max).toFixed(8));

test('property: one order through allocateTrade == applyTradeToRestingLimit', () => {
  const r = prng(99);
  for (let i = 0; i < 2000; i++) {
    const side = r() < 0.5 ? 'buy' : 'sell';
    const o = { id: 1, side, limitPrice: u('64000'), remaining: units(r, 2), queueAhead: units(r, 3) };
    const trade = {
      price: u((63995 + Math.floor(r() * 11)).toFixed(2)),
      qty: units(r, 5),
      buyerIsMaker: r() < 0.5,
    };
    const single = applyTradeToRestingLimit(o, trade);
    const [shared] = allocateTrade([o], trade);
    if (single === null) { assert.equal(shared, undefined); continue; }
    assert.equal(shared.fillQty, single.fillQty);
    assert.equal(shared.queueAhead, single.queueAhead);
  }
});

test('property: orders at the trade price never fill more than the trade', () => {
  const r = prng(7);
  for (let i = 0; i < 2000; i++) {
    const orders = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, k) =>
      rest(k + 1, 'buy', '64000', (0.001 + r() * 2).toFixed(8), (r() * 3).toFixed(8), Math.floor(r() * 100)));
    const trade = sell('64000', (r() * 5).toFixed(8));
    const total = allocateTrade(orders, trade).reduce((s, x) => s + x.fillQty, 0n);
    assert.ok(total <= trade.qty, `filled ${fmtUnits(total)} from a ${fmtUnits(trade.qty)} trade`);
    for (const x of allocateTrade(orders, trade)) {
      assert.ok(x.fillQty <= x.order.remaining && x.queueAhead >= 0n);
    }
  }
});
