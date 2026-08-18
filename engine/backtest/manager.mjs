// Tracks active BacktestSessions in-process and executes commands arriving on
// the 'engine_backtest_commands' NOTIFY channel (plus a poll fallback).
// Session events are forwarded — trade ticks throttled — to the
// 'backtest_events' channel, which the Next.js SSE route LISTENs on; that is
// the bridge across the process boundary.
import { pool } from '../db.mjs';
import { BacktestSession } from './session.mjs';

const MAX_CONCURRENT_SESSIONS = 3;
const MAX_SPEED = 20;
const TICK_THROTTLE_MS = 250;

const log = (level, msg, extra = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), level, mod: 'backtest', msg, ...extra }));

export class BacktestManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> BacktestSession
  }

  async init() {
    // Sessions left 'running' by a previous engine process are orphans: their
    // replay died with the process. Mark them stopped so the UI doesn't wait
    // on a ghost.
    const { rowCount } = await pool.query(
      `UPDATE backtest_sessions SET status = 'stopped', ended_at = NOW()
       WHERE status = 'running'`);
    if (rowCount > 0) log('info', `marked ${rowCount} orphaned sessions stopped`);

    const client = await pool.connect(); // dedicated LISTEN connection
    client.on('notification', (n) => {
      try {
        const cmd = JSON.parse(n.payload);
        this.dispatch(cmd).catch((err) =>
          log('error', 'command failed', { cmd, err: err.message }));
      } catch { /* malformed; poll fallback covers it */ }
    });
    await client.query('LISTEN engine_backtest_commands');

    setInterval(() => this.pollPending().catch(() => {}), 2000);
    log('info', 'backtest manager up');
  }

  async dispatch(cmd) {
    if (cmd.type === 'start_session') return this.startSession(Number(cmd.session_id));
    if (cmd.type === 'stop_session') return this.stopSession(Number(cmd.session_id));
    if (cmd.type === 'place') return this.placeOrder(Number(cmd.order_id));
    if (cmd.type === 'cancel') return this.cancelOrder(Number(cmd.order_id), Number(cmd.session_id));
  }

  async startSession(sessionId) {
    if (this.sessions.has(sessionId)) return;
    if (this.sessions.size >= MAX_CONCURRENT_SESSIONS) {
      await pool.query(
        `UPDATE backtest_sessions SET status = 'error', ended_at = NOW()
         WHERE id = $1 AND status = 'running'`, [sessionId]);
      log('warn', 'session refused: too many concurrent', { sessionId });
      return;
    }
    const { rows } = await pool.query(
      `SELECT * FROM backtest_sessions WHERE id = $1 AND status = 'running'`, [sessionId]);
    if (rows.length === 0) return;
    const row = rows[0];

    const session = new BacktestSession({
      id: row.id,
      userId: row.user_id,
      startDate: row.start_date,
      endDate: row.end_date,
      speed: Math.min(Number(row.speed) || 1, MAX_SPEED),
    });
    this.sessions.set(sessionId, session);

    // Forward events to Postgres for the SSE bridge; trade ticks throttled so
    // a 20x replay doesn't push hundreds of NOTIFYs a second.
    let lastTickSent = 0;
    session.on('event', (e) => {
      if (e.type === 'trade') {
        const now = Date.now();
        if (now - lastTickSent < TICK_THROTTLE_MS) return;
        lastTickSent = now;
      }
      pool.query(`SELECT pg_notify('backtest_events', $1)`,
        [JSON.stringify({ session_id: sessionId, ...e })]).catch(() => {});
    });

    // Persist the replay clock for the UI's progress display.
    const progressTimer = setInterval(() => {
      if (session.replayTs) {
        pool.query(
          `UPDATE backtest_sessions SET replay_position = $2 WHERE id = $1`,
          [sessionId, new Date(session.replayTs)]).catch(() => {});
      }
    }, 2000);
    session.on('event', (e) => {
      if (e.type === 'session') {
        clearInterval(progressTimer);
        // Keep the finished session around briefly so late reads see the end.
        setTimeout(() => this.sessions.delete(sessionId), 60_000);
      }
    });

    await session.start();
  }

  async stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) await session.stop();
    else {
      await pool.query(
        `UPDATE backtest_sessions SET status = 'stopped', ended_at = NOW()
         WHERE id = $1 AND status = 'running'`, [sessionId]);
    }
  }

  async placeOrder(orderId) {
    const { rows } = await pool.query(
      `SELECT * FROM backtest_orders WHERE id = $1 AND status = 'pending'`, [orderId]);
    if (rows.length === 0) return;
    const row = rows[0];
    const session = this.sessions.get(Number(row.session_id));
    if (!session || session.stopped) {
      await pool.query(
        `UPDATE backtest_orders SET status = 'rejected',
                reject_reason = 'session_not_running', updated_at = NOW()
         WHERE id = $1`, [orderId]);
      return;
    }
    await session.enqueue(() => session.place(row));
  }

  async cancelOrder(orderId, sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.enqueue(() => session.cancel(orderId));
  }

  async pollPending() {
    const { rows } = await pool.query(
      `SELECT o.id, o.session_id, o.status FROM backtest_orders o
       JOIN backtest_sessions s ON s.id = o.session_id
       WHERE (o.status = 'pending' AND s.status = 'running')
          OR (o.cancel_requested AND o.status IN ('open', 'partially_filled'))`);
    for (const r of rows) {
      await this.dispatch(
        r.status === 'pending'
          ? { type: 'place', order_id: r.id }
          : { type: 'cancel', order_id: r.id, session_id: r.session_id });
    }
  }
}
