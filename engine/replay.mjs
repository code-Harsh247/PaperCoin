// ReplaySource: the same event interface as MarketDataService, fed from
// captured market_trades instead of the live socket. The fill model cannot
// tell the difference — which is the point: backtesting is not a second
// implementation, it is the same engine on recorded events.
//
// CLI (determinism harness):
//   node engine/replay.mjs --minutes 10
// replays the last N minutes of captured trades against a synthetic order set,
// twice, and asserts the fill sequences are byte-identical.
import { EventEmitter } from 'node:events';
import { pool } from './db.mjs';
import { parseUnits, fmtUnits, ZERO } from './money.mjs';
import { applyTradeToRestingLimit } from './fillModel.mjs';

export class ReplaySource extends EventEmitter {
  constructor({ from, to, speed = 0 } = {}) {
    super();
    this.from = from;
    this.to = to;
    this.speed = speed; // 0 = as fast as possible; N = N x real time
  }

  async run() {
    const { rows } = await pool.query(
      `SELECT trade_id, price, quantity, buyer_is_maker, traded_at
       FROM market_trades
       WHERE traded_at >= $1 AND traded_at <= $2
       ORDER BY traded_at, trade_id`,
      [this.from, this.to]
    );
    let prevTs = null;
    for (const r of rows) {
      const ts = new Date(r.traded_at).getTime();
      if (this.speed > 0 && prevTs !== null) {
        const wait = (ts - prevTs) / this.speed;
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      }
      prevTs = ts;
      this.emit('trade', {
        tradeId: Number(r.trade_id),
        price: parseUnits(r.price),
        qty: parseUnits(r.quantity),
        buyerIsMaker: r.buyer_is_maker,
        ts,
      });
    }
    this.emit('end', { count: rows.length });
    return rows.length;
  }
}

// ---------------------------------------------------------------- CLI

async function determinismCheck(minutes) {
  const to = new Date();
  const from = new Date(to.getTime() - minutes * 60_000);

  // A synthetic book of resting orders bracketing the first captured price.
  async function runOnce() {
    const src = new ReplaySource({ from, to });
    let orders = null;
    const fillLog = [];

    src.on('trade', (t) => {
      if (orders === null) {
        // Seed orders around the opening price: buys below, sells above,
        // at 0.01% steps. queueAhead 0: replay has no depth capture, which is
        // the documented fidelity limit of trade-only replay.
        orders = [];
        for (let i = 1; i <= 5; i++) {
          const offset = (t.price * BigInt(i)) / 10000n;
          orders.push({ side: 'buy', limitPrice: t.price - offset, remaining: parseUnits('0.05'), queueAhead: ZERO, id: `b${i}` });
          orders.push({ side: 'sell', limitPrice: t.price + offset, remaining: parseUnits('0.05'), queueAhead: ZERO, id: `s${i}` });
        }
      }
      for (const o of orders) {
        if (o.remaining === ZERO) continue;
        const r = applyTradeToRestingLimit(o, t);
        if (r === null) continue;
        o.queueAhead = r.queueAhead;
        if (r.fillQty > ZERO) {
          o.remaining -= r.fillQty;
          fillLog.push(`${o.id}:${t.tradeId}:${fmtUnits(r.fillQty)}@${fmtUnits(o.limitPrice)}`);
        }
      }
    });

    const count = await src.run();
    return { count, fillLog };
  }

  const a = await runOnce();
  const b = await runOnce();
  const identical = a.fillLog.length === b.fillLog.length &&
    a.fillLog.every((x, i) => x === b.fillLog[i]);

  console.log(`replayed ${a.count} captured trades over ${minutes} minutes`);
  console.log(`run 1: ${a.fillLog.length} fills; run 2: ${b.fillLog.length} fills`);
  console.log(a.fillLog.slice(0, 5).map((l) => `  ${l}`).join('\n') || '  (no fills)');
  if (!identical) {
    console.error('DETERMINISM FAILURE: replay runs diverged');
    process.exit(1);
  }
  console.log('PASS: identical fill sequences across runs');
}

import { pathToFileURL } from 'node:url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const minutes = Number(process.argv[process.argv.indexOf('--minutes') + 1] || 10);
  determinismCheck(minutes).finally(() => pool.end());
}
