// Property test: value is conserved under any interleaving of placements,
// fills, and cancels. Mirrors the settlement accounting exactly (BigInt,
// flooring, residual release) and asserts the ledger identities after every
// single event across thousands of randomised steps.
//
// Invariants:
//   cash_available + cash_reserved == start_cash - (buy spend) + (sell proceeds)
//   btc_available  + btc_reserved  == start_btc  + (bought)    - (sold)
//   reserved totals == sum of open orders' reservations
//   no balance ever negative
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits as u, fmtUnits, mulUnits, ZERO } from '../money.mjs';
import { allocateTrade } from '../fillModel.mjs';

// Deterministic PRNG so a failure is reproducible from the logged seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(seed, steps) {
  const rand = mulberry32(seed);
  const b = {
    cash_available: u('100000'), cash_reserved: ZERO,
    btc_available: u('2'), btc_reserved: ZERO,
  };
  const startCash = b.cash_available;
  const startBtc = b.btc_available;
  let buySpend = ZERO;   // cash that left on buy fills
  let sellProceeds = ZERO;
  let bought = ZERO;
  let sold = ZERO;

  const open = [];
  let price = u('60000');
  let nextId = 1;

  const assertInvariants = (context) => {
    const cashTotal = b.cash_available + b.cash_reserved;
    const btcTotal = b.btc_available + b.btc_reserved;
    assert.equal(cashTotal, startCash - buySpend + sellProceeds,
      `cash conservation broke ${context} (seed ${seed})`);
    assert.equal(btcTotal, startBtc + bought - sold,
      `btc conservation broke ${context} (seed ${seed})`);
    for (const k of Object.keys(b)) {
      assert.ok(b[k] >= ZERO, `${k} went negative ${context} (seed ${seed})`);
    }
    let buyRes = ZERO;
    let sellRes = ZERO;
    for (const o of open) {
      if (o.side === 'buy') buyRes += o.reservedRemaining;
      else sellRes += o.reservedRemaining;
    }
    assert.equal(b.cash_reserved, buyRes, `cash_reserved != open buy reservations ${context} (seed ${seed})`);
    assert.equal(b.btc_reserved, sellRes, `btc_reserved != open sell reservations ${context} (seed ${seed})`);
  };

  const applyFill = (o, qty, fillPrice) => {
    if (o.side === 'buy') {
      const piece = mulUnits(qty, o.limitPrice);
      const release = piece < o.reservedRemaining ? piece : o.reservedRemaining;
      const cost = mulUnits(qty, fillPrice);
      b.cash_reserved -= release;
      b.cash_available += release - cost;
      b.btc_available += qty;
      o.reservedRemaining -= release;
      buySpend += cost;
      bought += qty;
    } else {
      b.btc_reserved -= qty;
      b.cash_available += mulUnits(qty, fillPrice);
      o.reservedRemaining -= qty;
      sellProceeds += mulUnits(qty, fillPrice);
      sold += qty;
    }
    o.remaining -= qty;
    if (o.remaining === ZERO) {
      // completion: release reservation dust
      if (o.reservedRemaining > ZERO) release(o);
      open.splice(open.indexOf(o), 1);
    }
  };

  function release(o) {
    if (o.side === 'buy') {
      b.cash_reserved -= o.reservedRemaining;
      b.cash_available += o.reservedRemaining;
    } else {
      b.btc_reserved -= o.reservedRemaining;
      b.btc_available += o.reservedRemaining;
    }
    o.reservedRemaining = ZERO;
  }

  for (let i = 0; i < steps; i++) {
    const roll = rand();

    if (roll < 0.25) {
      // Place a limit order at a random offset around price, odd quantity to
      // exercise flooring dust.
      const side = rand() < 0.5 ? 'buy' : 'sell';
      const offset = BigInt(Math.floor(rand() * 200)) * u('1') / 100n; // 0..2.00
      const limitPrice = side === 'buy' ? price - offset : price + offset;
      const qty = u((0.001 + rand() * 0.05).toFixed(8));
      const o = {
        id: nextId++, side, limitPrice, quantity: qty, remaining: qty,
        queueAhead: u((rand() * 0.5).toFixed(8)),
        reservedRemaining: ZERO,
      };
      const need = side === 'buy' ? mulUnits(qty, limitPrice) : qty;
      const avail = side === 'buy' ? b.cash_available : b.btc_available;
      if (need > avail) continue; // engine would reject; nothing changes
      if (side === 'buy') { b.cash_available -= need; b.cash_reserved += need; }
      else { b.btc_available -= need; b.btc_reserved += need; }
      o.reservedRemaining = need;
      open.push(o);
      assertInvariants(`after place #${o.id}`);
    } else if (roll < 0.35 && open.length > 0) {
      // Cancel a random open order.
      const o = open[Math.floor(rand() * open.length)];
      release(o);
      open.splice(open.indexOf(o), 1);
      assertInvariants(`after cancel #${o.id}`);
    } else {
      // A market trade: random walk the price, random aggressor and size.
      const drift = BigInt(Math.floor((rand() - 0.5) * 400)) * u('1') / 100n;
      price += drift;
      if (price < u('1000')) price = u('1000');
      const trade = {
        price,
        qty: u((0.001 + rand() * 0.3).toFixed(8)),
        buyerIsMaker: rand() < 0.5,
      };
      // Same allocation as the engine: the trade is shared in price-time
      // priority. Orders exactly at the print can't, together, out-fill it.
      let atPriceFilled = ZERO;
      for (const r of allocateTrade([...open], trade)) {
        r.order.queueAhead = r.queueAhead;
        if (r.order.limitPrice === trade.price) atPriceFilled += r.fillQty;
        if (r.fillQty > ZERO) applyFill(r.order, r.fillQty, r.order.limitPrice);
      }
      assert.ok(atPriceFilled <= trade.qty, `phantom liquidity at trade (seed ${seed})`);
      assertInvariants('after trade');
    }
  }

  return { placed: nextId - 1, stillOpen: open.length, finalCash: fmtUnits(b.cash_available + b.cash_reserved) };
}

test('conservation holds across 5 randomised runs of 2000 events each', () => {
  for (const seed of [1, 42, 777, 20260818, 987654321]) {
    const result = simulate(seed, 2000);
    assert.ok(result.placed > 50, `seed ${seed} exercised too few orders`);
  }
});
