// Settlement: the only code that writes order state, fills, ledger entries,
// and balances — always together, always in one transaction. The accounting
// identities live here:
//
//   place buy (limit-priced): cash_available -> cash_reserved, qty x P
//   fill q at p (p <= P):     cash_reserved -q*P; cash_available +q*(P-p);
//                             btc_available +q
//   place sell (resting):     btc_available -> btc_reserved, qty
//   sell fill q at p:         btc_reserved -q; cash_available +q*p
//   cancel / completion:      release whatever reservation remains (incl. dust
//                             from per-fill flooring)
//
// Market orders never rest, so they skip reservation entirely and settle
// against available balances inline.
import { fmtUnits, mulUnits, ZERO } from './money.mjs';

const F = fmtUnits;

async function ledger(tx, userId, entries, refType, refId) {
  for (const [account, delta] of entries) {
    if (delta === ZERO) continue;
    await tx.query(
      `INSERT INTO ledger_entries (user_id, account, delta, ref_type, ref_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, account, F(delta), refType, String(refId)]
    );
  }
}

// Additive update; the row lock serialises concurrent writers and the CHECK
// constraints abort anything that would drive a balance negative.
async function applyBalances(tx, userId, deltas) {
  const { cash_available = ZERO, cash_reserved = ZERO, btc_available = ZERO, btc_reserved = ZERO } = deltas;
  await tx.query(
    `UPDATE balances SET
       cash_available = cash_available + $2,
       cash_reserved  = cash_reserved  + $3,
       btc_available  = btc_available  + $4,
       btc_reserved   = btc_reserved   + $5,
       updated_at = NOW()
     WHERE user_id = $1`,
    [userId, F(cash_available), F(cash_reserved), F(btc_available), F(btc_reserved)]
  );
}

export async function notifyOrder(tx, order) {
  await tx.query(`SELECT pg_notify('engine_events', $1)`, [JSON.stringify({
    type: 'order_update',
    order_id: order.id,
    user_id: order.userId,
    status: order.status,
    filled_quantity: F(order.filled),
  })]);
}

// Accepts a pending order: reserves, transitions to open. Returns the
// reservation amount. Throws (aborting the tx) if balances cannot cover it —
// the caller records the rejection in a fresh transaction.
export async function reserveAndOpen(tx, order) {
  let reserve = ZERO;
  if (order.side === 'buy') {
    reserve = mulUnits(order.quantity, order.limitPrice); // limit & stop_limit only
    await ledger(tx, order.userId,
      [['cash_available', -reserve], ['cash_reserved', reserve]],
      'order_reserve', order.id);
    await applyBalances(tx, order.userId, { cash_available: -reserve, cash_reserved: reserve });
  } else {
    reserve = order.quantity;
    await ledger(tx, order.userId,
      [['btc_available', -reserve], ['btc_reserved', reserve]],
      'order_reserve', order.id);
    await applyBalances(tx, order.userId, { btc_available: -reserve, btc_reserved: reserve });
  }
  order.reservedRemaining = reserve;
  order.status = 'open';
  await tx.query(
    `UPDATE orders SET status = 'open', queue_ahead = $2, reserved_remaining = $3,
            updated_at = NOW()
     WHERE id = $1`,
    [order.id, order.queueAhead === null ? null : F(order.queueAhead), F(reserve)]
  );
  await notifyOrder(tx, order);
  return reserve;
}

export async function rejectOrder(tx, order, reason) {
  order.status = 'rejected';
  await tx.query(
    `UPDATE orders SET status = 'rejected', reject_reason = $2, updated_at = NOW()
     WHERE id = $1`,
    [order.id, reason]
  );
  await notifyOrder(tx, order);
}

// Applies one fill to a RESERVED order (maker fills from the trade stream, and
// taker fills of a crossing limit — both drew their reservation at placement).
// Idempotent on (order_id, source_trade_id): a replayed trade inserts nothing
// and changes nothing.
export async function applyReservedFill(tx, order, fill) {
  const { rowCount } = await tx.query(
    `INSERT INTO fills (order_id, user_id, side, quantity, price, source_trade_id, liquidity, executed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (order_id, source_trade_id) DO NOTHING`,
    [order.id, order.userId, order.side, F(fill.qty), F(fill.price),
     fill.sourceTradeId ?? null, fill.liquidity, new Date(fill.executedAt)]
  );
  if (rowCount === 0) return false; // already applied — crash replay, discard

  if (order.side === 'buy') {
    const P = order.limitPrice;
    const releasedPiece = mulUnits(fill.qty, P);
    const cost = mulUnits(fill.qty, fill.price);
    const release = releasedPiece < order.reservedRemaining ? releasedPiece : order.reservedRemaining;
    const improvement = release - cost; // price improvement: reserved at P, paid p
    await ledger(tx, order.userId, [
      ['cash_reserved', -release],
      ['cash_available', improvement],
      ['btc_available', fill.qty],
    ], 'fill', order.id);
    await applyBalances(tx, order.userId, {
      cash_reserved: -release, cash_available: improvement, btc_available: fill.qty,
    });
    order.reservedRemaining -= release;
  } else {
    const proceeds = mulUnits(fill.qty, fill.price);
    await ledger(tx, order.userId, [
      ['btc_reserved', -fill.qty],
      ['cash_available', proceeds],
    ], 'fill', order.id);
    await applyBalances(tx, order.userId, { btc_reserved: -fill.qty, cash_available: proceeds });
    order.reservedRemaining -= fill.qty;
  }

  order.filled += fill.qty;
  order.remaining -= fill.qty;
  order.valueFilled += mulUnits(fill.qty, fill.price);
  order.status = order.remaining === ZERO ? 'filled' : 'partially_filled';

  // Completion releases reservation dust left by per-fill flooring, so the
  // conservation invariant holds exactly, not approximately.
  if (order.status === 'filled' && order.reservedRemaining > ZERO) {
    await releaseResidual(tx, order, 'residual_release');
  }

  await persistOrderRow(tx, order);
  await notifyOrder(tx, order);
  return true;
}

export async function releaseResidual(tx, order, refType) {
  const r = order.reservedRemaining;
  if (r === ZERO) return;
  const account = order.side === 'buy' ? 'cash' : 'btc';
  await ledger(tx, order.userId,
    [[`${account}_reserved`, -r], [`${account}_available`, r]], refType, order.id);
  await applyBalances(tx, order.userId, {
    [`${account}_reserved`]: -r, [`${account}_available`]: r,
  });
  order.reservedRemaining = ZERO;
}

export async function cancelOrder(tx, order, finalStatus = 'cancelled') {
  await releaseResidual(tx, order, 'cancel_release');
  order.status = finalStatus;
  await persistOrderRow(tx, order);
  await notifyOrder(tx, order);
}

// Market-order settlement: no reservation phase; balances checked and moved in
// the same transaction that records the fills. `fills` are the book-walk
// pieces, each at its level's own price.
export async function settleMarketFills(tx, order, fills, executedAt) {
  let qty = ZERO;
  let value = ZERO;
  for (const f of fills) {
    qty += f.qty;
    value += mulUnits(f.qty, f.price);
    await tx.query(
      `INSERT INTO fills (order_id, user_id, side, quantity, price, source_trade_id, liquidity, executed_at)
       VALUES ($1, $2, $3, $4, $5, NULL, 'taker', $6)`,
      [order.id, order.userId, order.side, F(f.qty), F(f.price), new Date(executedAt)]
    );
  }
  if (order.side === 'buy') {
    await ledger(tx, order.userId,
      [['cash_available', -value], ['btc_available', qty]], 'fill', order.id);
    await applyBalances(tx, order.userId, { cash_available: -value, btc_available: qty });
  } else {
    await ledger(tx, order.userId,
      [['btc_available', -qty], ['cash_available', value]], 'fill', order.id);
    await applyBalances(tx, order.userId, { btc_available: -qty, cash_available: value });
  }
  order.filled += qty;
  order.remaining -= qty;
  order.valueFilled += value;
  // A market order never rests: whatever the book couldn't satisfy is gone.
  order.status = order.remaining === ZERO ? 'filled' : 'cancelled';
  if (order.status === 'cancelled') order.rejectReason = 'book_exhausted';
  await persistOrderRow(tx, order);
  await notifyOrder(tx, order);
  return { qty, value };
}

export async function persistOrderRow(tx, order) {
  const avg = order.filled === ZERO
    ? null
    : F((order.valueFilled * 100_000_000n) / order.filled);
  await tx.query(
    `UPDATE orders SET
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
