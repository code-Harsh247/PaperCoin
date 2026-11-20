// Property test for engine/backtest/settlement.mjs: value conservation must
// hold for the isolated ledger exactly as it does for the live one — same
// simulation shape as conservation.test.mjs, retargeted at backtest_*
// accounting. This requires a database (the settlement module writes real
// rows), so it creates and tears down its own session.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool, withTransaction } from '../db.mjs';
import { parseUnits as u, fmtUnits, mulUnits, ZERO } from '../money.mjs';
import { allocateTrade } from '../fillModel.mjs';
import * as bts from '../backtest/settlement.mjs';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function makeSession(userId) {
  const { rows } = await pool.query(
    `INSERT INTO backtest_sessions (user_id, start_date, end_date, speed)
     VALUES ($1, NOW() - INTERVAL '1 hour', NOW(), 1) RETURNING id`,
    [userId]
  );
  const id = Number(rows[0].id);
  await pool.query(
    `INSERT INTO backtest_balances (session_id, cash_available, btc_available)
     VALUES ($1, 100000, 2)`, [id]
  );
  await pool.query(
    `INSERT INTO backtest_ledger_entries (session_id, account, delta, ref_type)
     VALUES ($1, 'cash_available', 100000, 'test_open'),
            ($1, 'btc_available', 2, 'test_open')`, [id]
  );
  return id;
}

async function dropSession(id) {
  await pool.query('DELETE FROM backtest_sessions WHERE id = $1', [id]);
}

async function readBalances(sessionId) {
  const { rows: [b] } = await pool.query(
    `SELECT cash_available, cash_reserved, btc_available, btc_reserved
     FROM backtest_balances WHERE session_id = $1`, [sessionId]
  );
  return {
    cash_available: u(b.cash_available), cash_reserved: u(b.cash_reserved),
    btc_available: u(b.btc_available), btc_reserved: u(b.btc_reserved),
  };
}

let nextOrderId = 0;
async function insertOrder(sessionId, side, limitPrice, quantity) {
  const { rows } = await pool.query(
    `INSERT INTO backtest_orders (session_id, side, type, limit_price, quantity, placed_at)
     VALUES ($1, $2, 'limit', $3, $4, NOW()) RETURNING id`,
    [sessionId, side, fmtUnits(limitPrice), fmtUnits(quantity)]
  );
  nextOrderId += 1;
  return {
    id: Number(rows[0].id), sessionId, side, limitPrice, quantity,
    remaining: quantity, filled: ZERO, valueFilled: ZERO,
    queueAhead: ZERO, reservedRemaining: ZERO, status: 'pending',
  };
}

test('backtest settlement conserves cash and BTC across randomised fills/cancels', async () => {
  const rand = mulberry32(20260818);
  const sessionId = await makeSession(2);
  try {
    const startCash = u('100000');
    const startBtc = u('2');
    let buySpend = ZERO, sellProceeds = ZERO, bought = ZERO, sold = ZERO;
    const open = [];
    let price = u('60000');

    const assertInvariants = async (ctx) => {
      const b = await readBalances(sessionId);
      const cashTotal = b.cash_available + b.cash_reserved;
      const btcTotal = b.btc_available + b.btc_reserved;
      assert.equal(cashTotal, startCash - buySpend + sellProceeds, `cash broke ${ctx}`);
      assert.equal(btcTotal, startBtc + bought - sold, `btc broke ${ctx}`);
      assert.ok(b.cash_available >= ZERO && b.cash_reserved >= ZERO, `cash negative ${ctx}`);
      assert.ok(b.btc_available >= ZERO && b.btc_reserved >= ZERO, `btc negative ${ctx}`);
    };

    for (let i = 0; i < 150; i++) {
      const roll = rand();

      if (roll < 0.35) {
        const side = rand() < 0.5 ? 'buy' : 'sell';
        const offset = BigInt(Math.floor(rand() * 200)) * u('1') / 100n;
        const limitPrice = side === 'buy' ? price - offset : price + offset;
        const qty = u((0.01 + rand() * 0.3).toFixed(8));
        const order = await insertOrder(sessionId, side, limitPrice, qty);

        await withTransaction(async (tx) => {
          try {
            await bts.reserveAndOpen(tx, sessionId, order);
          } catch (err) {
            if (!/check constraint/i.test(err.message)) throw err;
            await bts.rejectOrder(tx, order, 'insufficient_funds');
          }
        });
        if (order.status === 'open') open.push(order);
        await assertInvariants(`after place #${order.id}`);
      } else if (roll < 0.5 && open.length > 0) {
        const order = open.splice(Math.floor(rand() * open.length), 1)[0];
        await withTransaction(async (tx) => { await bts.cancelOrder(tx, sessionId, order); });
        await assertInvariants(`after cancel #${order.id}`);
      } else {
        const drift = BigInt(Math.floor((rand() - 0.5) * 400)) * u('1') / 100n;
        price += drift;
        if (price < u('1000')) price = u('1000');
        const trade = { price, qty: u((0.01 + rand() * 0.4).toFixed(8)), buyerIsMaker: rand() < 0.5 };

        const fills = [];
        for (const r of allocateTrade([...open], trade)) {
          r.order.queueAhead = r.queueAhead;
          if (r.fillQty > ZERO) fills.push({ order: r.order, qty: r.fillQty });
        }
        if (fills.length > 0) {
          await withTransaction(async (tx) => {
            for (const { order, qty } of fills) {
              await bts.applyReservedFill(tx, sessionId, order, {
                qty, price: order.limitPrice, sourceTradeId: 1_000_000 + i,
                liquidity: 'maker', executedAt: Date.now(),
              });
              if (order.side === 'buy') { buySpend += mulUnits(qty, order.limitPrice); bought += qty; }
              else { sellProceeds += mulUnits(qty, order.limitPrice); sold += qty; }
            }
          });
          for (const { order } of fills) {
            if (order.status === 'filled') {
              const idx = open.findIndex((o) => o.id === order.id);
              if (idx >= 0) open.splice(idx, 1);
            }
          }
          await assertInvariants('after trade');
        }
      }
    }
  } finally {
    await dropSession(sessionId);
  }
});
