// Mirror of ../settlement.mjs with two deliberate differences:
//   1. Every statement targets the backtest_* tables, keyed by session — the
//      live balances/orders/fills tables are never named in this file, so a
//      backtest cannot touch real money even by bug.
//   2. No pg_notify here: session events flow through the session emitter and
//      the manager forwards them (throttled) to the 'backtest_events' channel.
import { fmtUnits, mulUnits, ZERO } from '../money.mjs';

const F = fmtUnits;

async function ledger(tx, sessionId, entries, refType, refId) {
  for (const [account, delta] of entries) {
    if (delta === ZERO) continue;
    await tx.query(
      `INSERT INTO backtest_ledger_entries (session_id, account, delta, ref_type, ref_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, account, F(delta), refType, String(refId)]
    );
  }
}

// Additive update; CHECK constraints abort anything that would go negative.
async function applyBalances(tx, sessionId, deltas) {
  const { cash_available = ZERO, cash_reserved = ZERO, btc_available = ZERO, btc_reserved = ZERO } = deltas;
  await tx.query(
    `UPDATE backtest_balances SET
       cash_available = cash_available + $2,
       cash_reserved  = cash_reserved  + $3,
       btc_available  = btc_available  + $4,
       btc_reserved   = btc_reserved   + $5,
       updated_at = NOW()
     WHERE session_id = $1`,
    [sessionId, F(cash_available), F(cash_reserved), F(btc_available), F(btc_reserved)]
  );
}

export async function reserveAndOpen(tx, sessionId, order) {
  let reserve;
  if (order.side === 'buy') {
    reserve = mulUnits(order.quantity, order.limitPrice);
    await ledger(tx, sessionId,
      [['cash_available', -reserve], ['cash_reserved', reserve]], 'order_reserve', order.id);
    await applyBalances(tx, sessionId, { cash_available: -reserve, cash_reserved: reserve });
  } else {
    reserve = order.quantity;
    await ledger(tx, sessionId,
      [['btc_available', -reserve], ['btc_reserved', reserve]], 'order_reserve', order.id);
    await applyBalances(tx, sessionId, { btc_available: -reserve, btc_reserved: reserve });
  }
  order.reservedRemaining = reserve;
  order.status = 'open';
  await tx.query(
    `UPDATE backtest_orders SET status = 'open', queue_ahead = $2,
            reserved_remaining = $3, updated_at = NOW() WHERE id = $1`,
    [order.id, order.queueAhead === null ? null : F(order.queueAhead), F(reserve)]
  );
}

export async function rejectOrder(tx, order, reason) {
  order.status = 'rejected';
  await tx.query(
    `UPDATE backtest_orders SET status = 'rejected', reject_reason = $2,
            updated_at = NOW() WHERE id = $1`,
    [order.id, reason]
  );
}

// Idempotent on (order_id, source_trade_id), same as live settlement.
export async function applyReservedFill(tx, sessionId, order, fill) {
  const { rowCount } = await tx.query(
    `INSERT INTO backtest_fills (order_id, session_id, side, quantity, price,
                                 source_trade_id, liquidity, executed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (order_id, source_trade_id) DO NOTHING`,
    [order.id, sessionId, order.side, F(fill.qty), F(fill.price),
     fill.sourceTradeId ?? null, fill.liquidity, new Date(fill.executedAt)]
  );
  if (rowCount === 0) return false;

  if (order.side === 'buy') {
    const releasedPiece = mulUnits(fill.qty, order.limitPrice);
    const cost = mulUnits(fill.qty, fill.price);
    const release = releasedPiece < order.reservedRemaining ? releasedPiece : order.reservedRemaining;
    const improvement = release - cost;
    await ledger(tx, sessionId, [
      ['cash_reserved', -release],
      ['cash_available', improvement],
      ['btc_available', fill.qty],
    ], 'fill', order.id);
    await applyBalances(tx, sessionId, {
      cash_reserved: -release, cash_available: improvement, btc_available: fill.qty,
    });
    order.reservedRemaining -= release;
  } else {
    const proceeds = mulUnits(fill.qty, fill.price);
    await ledger(tx, sessionId, [
      ['btc_reserved', -fill.qty],
      ['cash_available', proceeds],
    ], 'fill', order.id);
    await applyBalances(tx, sessionId, { btc_reserved: -fill.qty, cash_available: proceeds });
    order.reservedRemaining -= fill.qty;
  }

  order.filled += fill.qty;
  order.remaining -= fill.qty;
  order.valueFilled += mulUnits(fill.qty, fill.price);
  order.status = order.remaining === ZERO ? 'filled' : 'partially_filled';

  if (order.status === 'filled' && order.reservedRemaining > ZERO) {
    await releaseResidual(tx, sessionId, order, 'residual_release');
  }
  await persistOrderRow(tx, order);
  return true;
}

export async function releaseResidual(tx, sessionId, order, refType) {
  const r = order.reservedRemaining;
  if (r === ZERO) return;
  const account = order.side === 'buy' ? 'cash' : 'btc';
  await ledger(tx, sessionId,
    [[`${account}_reserved`, -r], [`${account}_available`, r]], refType, order.id);
  await applyBalances(tx, sessionId, {
    [`${account}_reserved`]: -r, [`${account}_available`]: r,
  });
  order.reservedRemaining = ZERO;
}

export async function cancelOrder(tx, sessionId, order) {
  await releaseResidual(tx, sessionId, order, 'cancel_release');
  order.status = 'cancelled';
  await persistOrderRow(tx, order);
}

export async function settleMarketFills(tx, sessionId, order, fills, executedAt) {
  let qty = ZERO;
  let value = ZERO;
  for (const f of fills) {
    qty += f.qty;
    value += mulUnits(f.qty, f.price);
    await tx.query(
      `INSERT INTO backtest_fills (order_id, session_id, side, quantity, price,
                                   source_trade_id, liquidity, executed_at)
       VALUES ($1, $2, $3, $4, $5, NULL, 'taker', $6)`,
      [order.id, sessionId, order.side, F(f.qty), F(f.price), new Date(executedAt)]
    );
  }
  if (order.side === 'buy') {
    await ledger(tx, sessionId,
      [['cash_available', -value], ['btc_available', qty]], 'fill', order.id);
    await applyBalances(tx, sessionId, { cash_available: -value, btc_available: qty });
  } else {
    await ledger(tx, sessionId,
      [['btc_available', -qty], ['cash_available', value]], 'fill', order.id);
    await applyBalances(tx, sessionId, { btc_available: -qty, cash_available: value });
  }
  order.filled += qty;
  order.remaining -= qty;
  order.valueFilled += value;
  order.status = order.remaining === ZERO ? 'filled' : 'cancelled';
  if (order.status === 'cancelled') order.rejectReason = 'tape_exhausted';
  await persistOrderRow(tx, order);
}

export async function persistOrderRow(tx, order) {
  const avg = order.filled === ZERO
    ? null
    : F((order.valueFilled * 100_000_000n) / order.filled);
  await tx.query(
    `UPDATE backtest_orders SET
       filled_quantity = $2, avg_fill_price = $3, status = $4,
       queue_ahead = $5, reserved_remaining = $6, triggered = $7,
       reject_reason = COALESCE($8, reject_reason), updated_at = NOW()
     WHERE id = $1`,
    [order.id, F(order.filled), avg, order.status,
     order.queueAhead === null ? null : F(order.queueAhead),
     F(order.reservedRemaining), order.triggered === true,
     order.rejectReason ?? null]
  );
}
