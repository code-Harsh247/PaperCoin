import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits as u, fmtUnits, mulUnits } from '../money.mjs';
import { OrderBook, SequenceGapError } from '../book.mjs';
import {
  applyTradeToRestingLimit, applyDepthToQueue, walkBook, vwap, stopTriggered, aggressorOf,
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
