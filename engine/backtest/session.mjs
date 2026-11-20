// One backtest session: replays captured trades through the same fill model
// as live trading, settling into the isolated backtest_* tables. Runs inside
// the engine process but on its own async chain — a fast replay can never add
// latency to live fills.
//
// Fidelity limits inherent to trade-only replay (documented, not hidden):
// there is no historical book, so market orders fill at the last replayed
// trade price, crossing limits fill at their own limit price, and queue
// positions seed at zero — all slightly optimistic relative to live.
import { EventEmitter } from 'node:events';
import { withTransaction } from '../db.mjs';
import { ReplaySource } from '../replay.mjs';
import { allocateTrade, stopTriggered } from '../fillModel.mjs';
import { parseUnits, fmtUnits, ZERO } from '../money.mjs';
import { pool } from '../db.mjs';
import * as bts from './settlement.mjs';

const log = (level, msg, extra = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), level, mod: 'backtest', msg, ...extra }));

export class BacktestSession extends EventEmitter {
  constructor({ id, userId, startDate, endDate, speed }) {
    super();
    this.id = Number(id);
    this.userId = userId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.speed = speed;
    this.orders = new Map();  // orderId -> mem order (BigInt fields)
    this.lastPrice = null;    // last replayed trade price (units)
    this.replayTs = null;     // replay clock (ms)
    this.joinCounter = 0;     // time priority among this session's orders
    this.stopped = false;
    this.source = null;
    // Serialises trade processing and commands within this session.
    this.chain = Promise.resolve();
  }

  enqueue(fn) {
    this.chain = this.chain.then(fn).catch((err) =>
      log('error', 'session handler failed', { session: this.id, err: err.message }));
    return this.chain;
  }

  async start() {
    this.source = new ReplaySource({
      from: this.startDate, to: this.endDate, speed: this.speed,
    });
    this.source.on('trade', (t) => this.enqueue(() => this.onTrade(t)));

    log('info', 'session started', { session: this.id, speed: this.speed });
    this.source.run()
      .then((count) => this.enqueue(() => this.finish('completed', count)))
      .catch((err) => {
        log('error', 'replay failed', { session: this.id, err: err.message });
        this.enqueue(() => this.finish('error', 0));
      });
  }

  // Halts the replay; open orders stay as they ended (the session is over).
  async stop() {
    this.source?.halt();
    await this.enqueue(() => this.finish('stopped'));
  }

  async finish(status, count) {
    if (this.stopped) return;
    this.stopped = true;
    this.source?.halt();
    await pool.query(
      `UPDATE backtest_sessions SET status = $2, ended_at = NOW(),
              replay_position = $3 WHERE id = $1 AND status = 'running'`,
      [this.id, status, this.replayTs ? new Date(this.replayTs) : null]
    );
    this.emit('event', { type: 'session', status, replayed: count ?? null });
    log('info', 'session finished', { session: this.id, status });
  }

  async onTrade(trade) {
    if (this.stopped) return;
    this.lastPrice = trade.price;
    this.replayTs = trade.ts;
    this.emit('event', {
      type: 'trade',
      price: fmtUnits(trade.price),
      qty: fmtUnits(trade.qty),
      buyerIsMaker: trade.buyerIsMaker,
      ts: trade.ts,
    });

    // Armed stops trigger on the replayed last-trade price.
    for (const order of [...this.orders.values()].filter(isArmedStop)) {
      if (stopTriggered(order, trade.price)) await this.triggerStop(order);
    }

    // Resting limits: identical rules to live — one replayed trade shared in
    // price-time priority, fills at each order's own price.
    const batch = [];
    for (const r of allocateTrade([...this.orders.values()].filter(isRestingLimit), trade)) {
      r.order.queueAhead = r.queueAhead;
      if (r.fillQty > ZERO) batch.push({ order: r.order, qty: r.fillQty });
    }
    if (batch.length === 0) return;

    await withTransaction(async (tx) => {
      for (const { order, qty } of batch) {
        await bts.applyReservedFill(tx, this.id, order, {
          qty, price: order.limitPrice, sourceTradeId: trade.tradeId,
          liquidity: 'maker', executedAt: trade.ts,
        });
      }
    });
    for (const { order } of batch) {
      this.emit('event', {
        type: 'fill', order_id: order.id, status: order.status,
        filled: fmtUnits(order.filled),
      });
      if (order.status === 'filled') this.orders.delete(order.id);
    }
  }

  async place(row) {
    const order = memOrder(row);
    const problem = validate(order);
    if (problem) {
      await withTransaction(async (tx) => { await bts.rejectOrder(tx, order, problem); });
      this.emit('event', { type: 'order_update', order_id: order.id, status: 'rejected', reason: problem });
      return;
    }

    try {
      if (order.type === 'market') {
        if (this.lastPrice === null) {
          await withTransaction(async (tx) => {
            await bts.rejectOrder(tx, order, 'no_replayed_price_yet');
          });
          this.emit('event', { type: 'order_update', order_id: order.id, status: 'rejected' });
          return;
        }
        await withTransaction(async (tx) => {
          await bts.settleMarketFills(tx, this.id, order,
            [{ price: this.lastPrice, qty: order.quantity }], this.replayTs ?? Date.now());
        });
      } else {
        order.queueAhead = ZERO; // no historical depth: documented limit
        await withTransaction(async (tx) => { await bts.reserveAndOpen(tx, this.id, order); });
        order.joinSeq = ++this.joinCounter;
        this.orders.set(order.id, order);
        // A limit crossing the replayed price executes immediately, at its
        // own limit price (no book to improve against).
        if (order.type === 'limit' && this.lastPrice !== null) {
          const crosses = order.side === 'buy'
            ? this.lastPrice <= order.limitPrice
            : this.lastPrice >= order.limitPrice;
          if (crosses) {
            await withTransaction(async (tx) => {
              await bts.applyReservedFill(tx, this.id, order, {
                qty: order.remaining, price: order.limitPrice, sourceTradeId: null,
                liquidity: 'taker', executedAt: this.replayTs ?? Date.now(),
              });
            });
            if (order.status === 'filled') this.orders.delete(order.id);
          }
        }
      }
      this.emit('event', { type: 'order_update', order_id: order.id, status: order.status });
    } catch (err) {
      const reason = /check constraint/i.test(err.message) ? 'insufficient_funds' : `error: ${err.message}`;
      await withTransaction(async (tx) => { await bts.rejectOrder(tx, order, reason); });
      this.orders.delete(order.id);
      this.emit('event', { type: 'order_update', order_id: order.id, status: 'rejected', reason });
    }
  }

  async cancel(orderId) {
    const order = this.orders.get(orderId);
    if (!order) return;
    await withTransaction(async (tx) => { await bts.cancelOrder(tx, this.id, order); });
    this.orders.delete(orderId);
    this.emit('event', { type: 'order_update', order_id: orderId, status: 'cancelled' });
  }

  async triggerStop(order) {
    order.triggered = true;
    if (order.type === 'stop_limit') {
      order.queueAhead = ZERO;
      order.joinSeq = ++this.joinCounter; // joins the line when it triggers
      await withTransaction(async (tx) => { await bts.persistOrderRow(tx, order); });
      this.emit('event', { type: 'order_update', order_id: order.id, status: order.status, triggered: true });
      return;
    }
    // stop (market): fills at the trigger price from the tape.
    try {
      await withTransaction(async (tx) => {
        if (order.side === 'sell') {
          // BTC was reserved at placement; draw the fill from the reservation.
          await bts.applyReservedFill(tx, this.id, order, {
            qty: order.remaining, price: this.lastPrice, sourceTradeId: null,
            liquidity: 'taker', executedAt: this.replayTs ?? Date.now(),
          });
        } else {
          await bts.settleMarketFills(tx, this.id, order,
            [{ price: this.lastPrice, qty: order.remaining }], this.replayTs ?? Date.now());
        }
      });
    } catch (err) {
      const reason = /check constraint/i.test(err.message)
        ? 'insufficient_funds_at_trigger' : `error: ${err.message}`;
      await withTransaction(async (tx) => { await bts.rejectOrder(tx, order, reason); });
    }
    this.orders.delete(order.id);
    this.emit('event', { type: 'order_update', order_id: order.id, status: order.status });
  }
}

const isRestingLimit = (o) =>
  (o.status === 'open' || o.status === 'partially_filled') &&
  o.limitPrice !== null &&
  (o.type === 'limit' || (o.type === 'stop_limit' && o.triggered));

const isArmedStop = (o) =>
  o.status === 'open' && !o.triggered && (o.type === 'stop' || o.type === 'stop_limit');

function validate(order) {
  if (order.quantity <= ZERO) return 'invalid_quantity';
  if ((order.type === 'limit' || order.type === 'stop_limit') &&
      (order.limitPrice === null || order.limitPrice <= ZERO)) return 'missing_limit_price';
  if ((order.type === 'stop' || order.type === 'stop_limit') &&
      (order.stopPrice === null || order.stopPrice <= ZERO)) return 'missing_stop_price';
  return null;
}

export function memOrder(row) {
  const quantity = parseUnits(row.quantity);
  const filled = parseUnits(row.filled_quantity);
  const avg = row.avg_fill_price ? parseUnits(row.avg_fill_price) : ZERO;
  return {
    id: Number(row.id),
    sessionId: Number(row.session_id),
    side: row.side,
    type: row.type,
    limitPrice: row.limit_price === null ? null : parseUnits(row.limit_price),
    stopPrice: row.stop_price === null ? null : parseUnits(row.stop_price),
    quantity,
    filled,
    remaining: quantity - filled,
    valueFilled: (filled * avg) / 100_000_000n,
    queueAhead: row.queue_ahead === null ? null : parseUnits(row.queue_ahead),
    reservedRemaining: parseUnits(row.reserved_remaining),
    status: row.status,
    triggered: row.triggered,
    rejectReason: null,
  };
}
