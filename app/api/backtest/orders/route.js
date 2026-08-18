// Backtest order placement and listing — the same dumb-API pattern as
// /api/orders: validate shape, insert 'pending', notify the engine's backtest
// channel. The session's replay loop owns every transition after that.
import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

const TYPES = new Set(['market', 'limit', 'stop', 'stop_limit']);
const SIDES = new Set(['buy', 'sell']);

const asDecimal = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(v) : null;
};

async function runningOwnedSession(sessionId, userId) {
  const rows = await runQuery(
    `SELECT id, replay_position, start_date FROM backtest_sessions
     WHERE id = $1 AND user_id = $2 AND status = 'running'`,
    [sessionId, userId]);
  return rows[0] ?? null;
}

export async function POST(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const sessionId = Number(body.session_id);
  if (!Number.isInteger(sessionId)) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const session = await runningOwnedSession(sessionId, userId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found or not running' }, { status: 404 });
  }

  const side = String(body.side || '').toLowerCase();
  const type = String(body.type || '').toLowerCase();
  if (!SIDES.has(side)) return NextResponse.json({ error: 'side must be buy or sell' }, { status: 400 });
  if (!TYPES.has(type)) return NextResponse.json({ error: 'unknown order type' }, { status: 400 });

  const quantity = asDecimal(body.quantity);
  if (!quantity) return NextResponse.json({ error: 'quantity must be positive' }, { status: 400 });

  const limitPrice = body.limit_price != null ? asDecimal(body.limit_price) : null;
  const stopPrice = body.stop_price != null ? asDecimal(body.stop_price) : null;
  if ((type === 'limit' || type === 'stop_limit') && !limitPrice) {
    return NextResponse.json({ error: 'limit_price required' }, { status: 400 });
  }
  if ((type === 'stop' || type === 'stop_limit') && !stopPrice) {
    return NextResponse.json({ error: 'stop_price required' }, { status: 400 });
  }

  // placed_at is REPLAY time: where the session's clock currently stands.
  const placedAt = session.replay_position ?? session.start_date;
  const rows = await runQuery(
    `INSERT INTO backtest_orders (session_id, side, type, limit_price, stop_price, quantity, placed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, status`,
    [sessionId, side, type, limitPrice, stopPrice, quantity, placedAt]
  );
  const order = rows[0];
  await runQuery(`SELECT pg_notify('engine_backtest_commands', $1)`, [
    JSON.stringify({ type: 'place', order_id: Number(order.id) }),
  ]);
  return NextResponse.json({ order_id: order.id, status: order.status }, { status: 202 });
}

export async function GET(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const sessionId = Number(url.searchParams.get('session_id'));
  if (!Number.isInteger(sessionId)) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const owned = await runQuery(
    `SELECT 1 FROM backtest_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
  if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const scope = url.searchParams.get('scope');
  const where = scope === 'open'
    ? `AND status IN ('pending', 'open', 'partially_filled')` : '';
  const orders = await runQuery(
    `SELECT id, side, type, limit_price, stop_price, quantity, filled_quantity,
            avg_fill_price, status, reject_reason, placed_at, updated_at
     FROM backtest_orders WHERE session_id = $1 ${where}
     ORDER BY placed_at DESC LIMIT 200`,
    [sessionId]
  );
  return NextResponse.json({ orders });
}
