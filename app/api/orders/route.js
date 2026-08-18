// Order placement and listing. The API is deliberately dumb: it validates
// shape, inserts status='pending', and notifies the engine. Every state
// transition after that — reserve, open, fill, reject — belongs to the engine,
// which is what keeps a single writer over order state.
import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

const TYPES = new Set(['market', 'limit', 'stop', 'stop_limit']);
const SIDES = new Set(['buy', 'sell']);

const asDecimal = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(v) : null;
};

export async function POST(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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

  const rows = await runQuery(
    `INSERT INTO orders (user_id, side, type, limit_price, stop_price, quantity)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, created_at`,
    [userId, side, type, limitPrice, stopPrice, quantity]
  );
  const order = rows[0];
  await runQuery(`SELECT pg_notify('engine_commands', $1)`, [
    JSON.stringify({ type: 'place', order_id: order.id }),
  ]);

  return NextResponse.json({ order_id: order.id, status: order.status }, { status: 202 });
}

export async function GET(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const scope = new URL(request.url).searchParams.get('scope');
  const where = scope === 'open'
    ? `AND status IN ('pending', 'open', 'partially_filled')`
    : '';
  const orders = await runQuery(
    `SELECT id, side, type, limit_price, stop_price, quantity, filled_quantity,
            avg_fill_price, status, reject_reason, created_at, updated_at
     FROM orders WHERE user_id = $1 ${where}
     ORDER BY created_at DESC LIMIT 200`,
    [userId]
  );
  return NextResponse.json({ orders });
}
