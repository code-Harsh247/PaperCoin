// Backtest session lifecycle. Creating a session seeds an isolated virtual
// balance (mirroring the user's real cash by default) and asks the engine to
// begin the replay. Nothing here touches live balances — the backtest_*
// tables are a parallel universe.
import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

export async function POST(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  const speed = Math.min(Math.max(Number(body.speed) || 1, 0.1), 20);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  // Refuse a window with no captured trades — a clear error with the
  // available range beats a silent, empty replay.
  const coverage = await runQuery(
    `SELECT count(*)::int AS n FROM market_trades WHERE traded_at BETWEEN $1 AND $2`,
    [start, end]
  );
  if (coverage[0].n === 0) {
    const range = await runQuery(
      `SELECT min(traded_at) AS available_from, max(traded_at) AS available_to FROM market_trades`);
    return NextResponse.json({
      error: 'No captured trade data in that window',
      available_from: range[0].available_from,
      available_to: range[0].available_to,
    }, { status: 422 });
  }

  const bal = await runQuery(
    `SELECT cash_available FROM balances WHERE user_id = $1`, [userId]);
  const requested = Number(body.startingCash);
  const startingCash = Number.isFinite(requested) && requested > 0
    ? String(requested)
    : (bal[0]?.cash_available ?? '10000');

  const rows = await runQuery(
    `INSERT INTO backtest_sessions (user_id, start_date, end_date, speed)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, start, end, speed]
  );
  const sessionId = rows[0].id;
  await runQuery(
    `INSERT INTO backtest_balances (session_id, cash_available) VALUES ($1, $2)`,
    [sessionId, startingCash]);
  await runQuery(
    `INSERT INTO backtest_ledger_entries (session_id, account, delta, ref_type)
     VALUES ($1, 'cash_available', $2, 'session_open')`,
    [sessionId, startingCash]);
  await runQuery(`SELECT pg_notify('engine_backtest_commands', $1)`, [
    JSON.stringify({ type: 'start_session', session_id: Number(sessionId) }),
  ]);

  return NextResponse.json({
    session_id: sessionId,
    starting_cash: startingCash,
    trades_in_window: coverage[0].n,
  }, { status: 201 });
}

export async function GET() {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const sessions = await runQuery(
    `SELECT id, status, start_date, end_date, speed, replay_position, created_at, ended_at
     FROM backtest_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]);
  return NextResponse.json({ sessions });
}
