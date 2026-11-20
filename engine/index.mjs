// PaperCoin trading engine — a single-threaded event loop over one ordered
// stream: market trades, depth updates, order placements, cancellations.
// Single-threaded is the point: every race condition is gone by construction,
// and the same event sequence always produces the same fills.
//
//   node engine/index.mjs
//
// The engine is the ONLY writer of order state. The API inserts rows with
// status='pending' (or sets cancel_requested) and NOTIFYs; everything after
// that happens here.
import './env.mjs';
import http from 'node:http';
import { pool, withTransaction } from './db.mjs';
import { MarketDataService } from './marketData.mjs';
import {
  allocateTrade, applyDepthToQueue, walkBook, stopTriggered,
} from './fillModel.mjs';
import {
  reserveAndOpen, rejectOrder, applyReservedFill, cancelOrder,
  settleMarketFills, persistOrderRow, notifyOrder,
} from './settlement.mjs';
import { parseUnits, fmtUnits, ZERO } from './money.mjs';
import { BacktestManager } from './backtest/manager.mjs';

const POLICY = process.env.ENGINE_FILL_POLICY === 'optimistic' ? 'optimistic' : 'pessimistic';
const CHECK_INVARIANTS = process.env.ENGINE_CHECK_INVARIANTS === '1';
const HEALTH_PORT = Number(process.env.ENGINE_PORT || 4600);
const startedAt = Date.now();

const log = (level, msg, extra = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), level, msg, ...extra }));

// ---------------------------------------------------------------- state

const orders = new Map();       // id -> in-memory order (BigInt fields)
const dirtyQueues = new Set();  // ids whose queue_ahead advanced without a fill
const md = new MarketDataService();
let tradeBuffer = [];           // trades held while the book is stale
let lastTradePrice = null;

// Time priority among simulated orders: the moment an order joined the line
// at its price. A plain counter, not a clock, so replay stays deterministic.
let joinCounter = 0;
const nextJoinSeq = () => ++joinCounter;

// Strict serialisation: every event goes through this chain, so handlers never
// interleave even though they await database writes.
let chain = Promise.resolve();
function enqueue(fn) {
  chain = chain.then(fn).catch((err) => log('error', 'handler failed', { err: err.message, stack: err.stack }));
  return chain;
}

function memOrder(row) {
  const quantity = parseUnits(row.quantity);
  const filled = parseUnits(row.filled_quantity);
  const avg = row.avg_fill_price ? parseUnits(row.avg_fill_price) : ZERO;
  return {
    id: Number(row.id),
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    type: row.type,
    limitPrice: row.limit_price === null ? null : parseUnits(row.limit_price),
    stopPrice: row.stop_price === null ? null : parseUnits(row.stop_price),
    quantity,
    filled,
    remaining: quantity - filled,
    // Reconstructed from the stored average; only display precision, never
    // used for balance math.
    valueFilled: (filled * avg) / 100_000_000n,
    queueAhead: row.queue_ahead === null ? null : parseUnits(row.queue_ahead),
    joinSeq: null, // assigned when the order starts resting
    lastSeenVolume: undefined,
    reservedRemaining: parseUnits(row.reserved_remaining),
    status: row.status,
    triggered: row.triggered,
    rejectReason: null,
  };
}

const isRestingLimit = (o) =>
  (o.status === 'open' || o.status === 'partially_filled') &&
  o.limitPrice !== null &&
  (o.type === 'limit' || (o.type === 'stop_limit' && o.triggered));

const isArmedStop = (o) =>
  o.status === 'open' && !o.triggered && (o.type === 'stop' || o.type === 'stop_limit');

// ---------------------------------------------------------------- placement

async function handlePlace(orderId) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (rows.length === 0) return;
  const row = rows[0];
  if (row.status !== 'pending') return; // already handled (poll + NOTIFY overlap)
  const order = memOrder(row);

  if (row.cancel_requested) {
    await withTransaction(async (tx) => { await cancelOrder(tx, order); });
    return;
  }

  // Validation that doesn't depend on balances.
  const problem = validate(order);
  if (problem) {
    await withTransaction(async (tx) => { await rejectOrder(tx, order, problem); });
    return;
  }

  // Market orders need a live book; while stale they stay pending and are
  // re-processed on resync. Resting orders can be accepted stale (their queue
  // position initialises at the next sync).
  if (order.type === 'market' && !md.synced) {
    log('warn', 'market order deferred: book stale', { orderId });
    return;
  }

  try {
    if (order.type === 'market') {
      await placeMarket(order);
    } else {
      await placeResting(order);
    }
  } catch (err) {
    // CHECK-constraint violations surface here: the reservation or settlement
    // would have taken a balance negative, so the whole transaction aborted.
    const reason = /check constraint/i.test(err.message) ? 'insufficient_funds' : `error: ${err.message}`;
    await withTransaction(async (tx) => { await rejectOrder(tx, order, reason); });
    log('info', 'order rejected', { orderId, reason });
  }
  await checkInvariants(order.userId);
}

function validate(order) {
  if (order.symbol && order.symbol !== 'BTCUSDT') return 'unsupported_symbol';
  if (order.quantity <= ZERO) return 'invalid_quantity';
  if ((order.type === 'limit' || order.type === 'stop_limit') &&
      (order.limitPrice === null || order.limitPrice <= ZERO)) return 'missing_limit_price';
  if ((order.type === 'stop' || order.type === 'stop_limit') &&
      (order.stopPrice === null || order.stopPrice <= ZERO)) return 'missing_stop_price';
  return null;
}

async function placeMarket(order) {
  const { fills } = walkBook(md.book.levelsFor(order.side), order.quantity, null, order.side);
  await withTransaction(async (tx) => {
    await settleMarketFills(tx, order, fills, Date.now());
  });
  log('info', 'market order settled', {
    orderId: order.id, filled: fmtUnits(order.filled), status: order.status,
  });
}

async function placeResting(order) {
  // Buy stops without a limit price reserve nothing: their cost is unknowable
  // until trigger. Affordability is checked when they convert, and they can be
  // rejected then — that is the honest behaviour, and it's documented in the
  // API. Everything else reserves at placement.
  const reserves = !(order.type === 'stop' && order.side === 'buy');

  if (order.type === 'limit' && md.synced) {
    order.queueAhead = md.book.volumeAt(order.side, order.limitPrice);
    order.lastSeenVolume = order.queueAhead;
  }

  await withTransaction(async (tx) => {
    if (reserves) {
      await reserveAndOpen(tx, order);
    } else {
      order.status = 'open';
      await tx.query(`UPDATE orders SET status = 'open', updated_at = NOW() WHERE id = $1`, [order.id]);
      await notifyOrder(tx, order);
    }
  });
  order.joinSeq = nextJoinSeq();
  orders.set(order.id, order);

  // A limit that crosses the market executes its crossing portion immediately
  // as a taker, at book prices; the rest stays resting.
  if (order.type === 'limit' && md.synced) await takerPhase(order);
  log('info', 'order accepted', { orderId: order.id, type: order.type, side: order.side });
}

// Executes the crossing portion of a limit-priced order against the current
// book. Fills draw on the reservation made at placement, so accounting is
// identical to maker fills — just at better-or-equal prices.
async function takerPhase(order) {
  const { fills } = walkBook(md.book.levelsFor(order.side), order.remaining, order.limitPrice, order.side);
  if (fills.length === 0) return;
  await withTransaction(async (tx) => {
    for (const f of fills) {
      await applyReservedFill(tx, order, {
        qty: f.qty, price: f.price, sourceTradeId: null,
        liquidity: 'taker', executedAt: Date.now(),
      });
    }
  });
  if (order.status === 'filled') orders.delete(order.id);
  log('info', 'taker phase', { orderId: order.id, filled: fmtUnits(order.filled), status: order.status });
}

async function handleCancel(orderId) {
  const order = orders.get(orderId);
  if (!order) {
    // Not in the working set: maybe still pending in the DB.
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1 AND status = $2', [orderId, 'pending']);
    if (rows.length > 0) {
      const o = memOrder(rows[0]);
      await withTransaction(async (tx) => { await cancelOrder(tx, o); });
    }
    return;
  }
  await withTransaction(async (tx) => { await cancelOrder(tx, order); });
  orders.delete(order.id);
  dirtyQueues.delete(order.id);
  log('info', 'order cancelled', { orderId });
  await checkInvariants(order.userId);
}

// ---------------------------------------------------------------- trades

async function handleTrade(trade) {
  lastTradePrice = trade.price;

  // Capture for the replay source. ON CONFLICT: reconnects can replay a trade.
  await pool.query(
    `INSERT INTO market_trades (trade_id, price, quantity, buyer_is_maker, traded_at)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [trade.tradeId, fmtUnits(trade.price), fmtUnits(trade.qty), trade.buyerIsMaker, new Date(trade.ts)]
  );

  if (!md.synced) {
    // Trades are ground truth even during a book blackout, but stops need a
    // book to convert against — hold everything and apply on resync.
    tradeBuffer.push(trade);
    if (tradeBuffer.length > 10000) {
      tradeBuffer.shift();
      log('warn', 'trade buffer overflow: oldest dropped');
    }
    return;
  }
  await processTrade(trade);
}

async function processTrade(trade) {
  // 1. Armed stops: trigger on last traded price.
  for (const order of [...orders.values()].filter(isArmedStop)) {
    if (stopTriggered(order, trade.price)) await triggerStop(order);
  }

  // 2. Resting limits: one trade is shared across all of them in price-time
  //    priority, so simulated orders can't collectively fill more than traded.
  const settleBatch = [];
  for (const r of allocateTrade([...orders.values()].filter(isRestingLimit), trade)) {
    const { order } = r;
    if (r.queueAhead !== order.queueAhead) {
      order.queueAhead = r.queueAhead;
      dirtyQueues.add(order.id);
    }
    if (r.fillQty > ZERO) settleBatch.push({ order, qty: r.fillQty });
  }
  if (settleBatch.length === 0) return;

  await withTransaction(async (tx) => {
    for (const { order, qty } of settleBatch) {
      await applyReservedFill(tx, order, {
        qty,
        price: order.limitPrice, // resting orders fill at their own price
        sourceTradeId: trade.tradeId,
        liquidity: 'maker',
        executedAt: trade.ts,
      });
    }
  });
  for (const { order } of settleBatch) {
    log('info', 'fill', {
      orderId: order.id, qty: fmtUnits(order.filled), status: order.status,
      sourceTrade: trade.tradeId,
    });
    if (order.status === 'filled') { orders.delete(order.id); dirtyQueues.delete(order.id); }
    await checkInvariants(order.userId);
  }
}

async function triggerStop(order) {
  order.triggered = true;
  log('info', 'stop triggered', { orderId: order.id, type: order.type });

  if (order.type === 'stop_limit') {
    // Becomes a live limit order: joins the queue now, at the back — behind
    // real volume and behind simulated orders already resting there.
    order.queueAhead = md.book.volumeAt(order.side, order.limitPrice);
    order.lastSeenVolume = order.queueAhead;
    order.joinSeq = nextJoinSeq();
    await withTransaction(async (tx) => { await persistOrderRow(tx, order); });
    await takerPhase(order); // it may have converted straight through the market
    return;
  }

  // stop (market): walk the book now.
  const { fills } = walkBook(md.book.levelsFor(order.side), order.remaining, null, order.side);
  try {
    await withTransaction(async (tx) => {
      if (order.side === 'sell') {
        // BTC was reserved at placement: draw fills from the reservation.
        for (const f of fills) {
          await applyReservedFill(tx, order, {
            qty: f.qty, price: f.price, sourceTradeId: null,
            liquidity: 'taker', executedAt: Date.now(),
          });
        }
        if (order.remaining > ZERO) await cancelOrder(tx, order); // book exhausted
      } else {
        // Buy stops reserved nothing; settle against available cash directly.
        await settleMarketFills(tx, order, fills, Date.now());
      }
    });
  } catch (err) {
    const reason = /check constraint/i.test(err.message)
      ? 'insufficient_funds_at_trigger' : `error: ${err.message}`;
    await withTransaction(async (tx) => { await rejectOrder(tx, order, reason); });
    log('info', 'stop rejected at trigger', { orderId: order.id, reason });
  }
  orders.delete(order.id);
  await checkInvariants(order.userId);
}

// ---------------------------------------------------------------- depth

function handleDepth({ bidPrices, askPrices }) {
  for (const order of orders.values()) {
    if (!isRestingLimit(order) || order.queueAhead === null) continue;
    const changed = order.side === 'buy' ? bidPrices : askPrices;
    if (!changed.some((p) => p === order.limitPrice)) continue;
    const vol = md.book.volumeAt(order.side, order.limitPrice);
    const q = applyDepthToQueue(order.queueAhead, vol, order.lastSeenVolume, POLICY);
    order.lastSeenVolume = vol;
    if (q !== order.queueAhead) {
      order.queueAhead = q;
      dirtyQueues.add(order.id);
    }
  }
}

// ---------------------------------------------------------------- sync

async function handleSync(synced) {
  log('info', `book ${synced ? 'synced' : 'STALE'}`);
  if (!synced) return;

  // Restart / resync re-verification: nothing can be ahead of us beyond what
  // rests at the level at all.
  for (const order of orders.values()) {
    if (!isRestingLimit(order)) continue;
    const vol = md.book.volumeAt(order.side, order.limitPrice);
    order.queueAhead = order.queueAhead === null ? vol
      : (order.queueAhead < vol ? order.queueAhead : vol);
    order.lastSeenVolume = vol;
    dirtyQueues.add(order.id);
  }

  const buffered = tradeBuffer;
  tradeBuffer = [];
  for (const t of buffered) await processTrade(t);
  if (buffered.length) log('info', `applied ${buffered.length} buffered trades`);

  // Market orders deferred while stale.
  const { rows } = await pool.query(
    `SELECT id FROM orders WHERE status = 'pending' ORDER BY id`);
  for (const r of rows) await handlePlace(Number(r.id));
}

// ---------------------------------------------------------------- plumbing

async function flushQueuePositions() {
  if (dirtyQueues.size === 0) return;
  const ids = [...dirtyQueues];
  dirtyQueues.clear();
  for (const id of ids) {
    const o = orders.get(id);
    if (!o || o.queueAhead === null) continue;
    await pool.query(
      'UPDATE orders SET queue_ahead = $2, updated_at = NOW() WHERE id = $1',
      [id, fmtUnits(o.queueAhead)]
    );
  }
}

// Reserved balances must equal the sum of open reservations, always. Runs per
// affected user when ENGINE_CHECK_INVARIANTS=1; a violation is a bug, loudly.
async function checkInvariants(userId) {
  if (!CHECK_INVARIANTS) return;
  const { rows: [r] } = await pool.query(
    `SELECT b.cash_reserved, b.btc_reserved,
            COALESCE(SUM(o.reserved_remaining) FILTER (WHERE o.side = 'buy'), 0)  AS buy_reserved,
            COALESCE(SUM(o.reserved_remaining) FILTER (WHERE o.side = 'sell'), 0) AS sell_reserved
     FROM balances b
     LEFT JOIN orders o ON o.user_id = b.user_id AND o.status IN ('open', 'partially_filled')
     WHERE b.user_id = $1
     GROUP BY b.cash_reserved, b.btc_reserved`,
    [userId]
  );
  if (!r) return;
  if (Number(r.cash_reserved) !== Number(r.buy_reserved) ||
      Number(r.btc_reserved) !== Number(r.sell_reserved)) {
    log('error', 'INVARIANT VIOLATION: reserved balances do not match open reservations', { userId, ...r });
  }
}

async function listenForCommands() {
  const client = await pool.connect(); // dedicated connection, held forever
  client.on('notification', (n) => {
    try {
      const cmd = JSON.parse(n.payload);
      if (cmd.type === 'place') enqueue(() => handlePlace(Number(cmd.order_id)));
      else if (cmd.type === 'cancel') enqueue(() => handleCancel(Number(cmd.order_id)));
    } catch { /* malformed payload: the poll fallback will catch the order */ }
  });
  await client.query('LISTEN engine_commands');

  // Poll fallback: anything NOTIFY missed (engine restart, dropped
  // connection) is picked up within 2 seconds.
  setInterval(() => enqueue(async () => {
    const { rows } = await pool.query(
      `SELECT id, status, cancel_requested FROM orders
       WHERE status = 'pending'
          OR (cancel_requested AND status IN ('open', 'partially_filled'))`);
    for (const r of rows) {
      if (r.status === 'pending') await handlePlace(Number(r.id));
      else await handleCancel(Number(r.id));
    }
  }), 2000);
}

function startHealthServer() {
  http.createServer((req, res) => {
    if (req.url !== '/health') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      synced: md.synced,
      last_event_age_ms: md.lastEventAt ? Date.now() - md.lastEventAt : null,
      last_trade_price: lastTradePrice === null ? null : fmtUnits(lastTradePrice),
      open_orders: orders.size,
      buffered_trades: tradeBuffer.length,
      fill_policy: POLICY,
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
    }));
  }).listen(HEALTH_PORT, () => log('info', `health on :${HEALTH_PORT}/health`));
}

// ---------------------------------------------------------------- boot

async function boot() {
  const { rows } = await pool.query(
    `SELECT * FROM orders WHERE status IN ('open', 'partially_filled') ORDER BY id`);
  // Rows arrive by id, i.e. placement order, which restores time priority for
  // limits exactly. A stop-limit that had triggered really joined at trigger
  // time; placement order is the closest record that survives a restart.
  for (const row of rows) {
    const order = memOrder(row);
    order.joinSeq = nextJoinSeq();
    orders.set(order.id, order);
  }
  log('info', `recovered ${rows.length} open orders`);

  md.on('trade', (t) => enqueue(() => handleTrade(t)));
  md.on('depth', (d) => enqueue(() => { handleDepth(d); }));
  md.on('sync', ({ synced }) => enqueue(() => handleSync(synced)));
  md.on('error_note', (n) => log('warn', n));
  md.start();

  await listenForCommands();
  setInterval(() => enqueue(flushQueuePositions), 5000);
  startHealthServer();

  // Backtest sessions run in this process but on their own chains — they
  // never pass through the live engine's enqueue(), so a 20x replay cannot
  // delay a live fill.
  const backtests = new BacktestManager();
  await backtests.init();

  log('info', 'engine up', { policy: POLICY, invariant_checks: CHECK_INVARIANTS });
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    log('info', `${sig}: shutting down`);
    md.stop();
    await enqueue(flushQueuePositions);
    await pool.end();
    process.exit(0);
  });
}

boot().catch((err) => {
  log('error', 'boot failed', { err: err.message, stack: err.stack });
  process.exit(1);
});
