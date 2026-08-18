import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

export async function POST(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const orderId = Number(body.order_id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  // Ownership check goes through the session, since backtest orders belong to
  // sessions rather than directly to users.
  const rows = await runQuery(
    `UPDATE backtest_orders o SET cancel_requested = TRUE, updated_at = NOW()
     FROM backtest_sessions s
     WHERE o.id = $1 AND s.id = o.session_id AND s.user_id = $2
       AND o.status IN ('pending', 'open', 'partially_filled')
     RETURNING o.id, o.session_id`,
    [orderId, userId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found or not cancellable' }, { status: 404 });
  }
  await runQuery(`SELECT pg_notify('engine_backtest_commands', $1)`, [
    JSON.stringify({ type: 'cancel', order_id: orderId, session_id: Number(rows[0].session_id) }),
  ]);
  return NextResponse.json({ ok: true }, { status: 202 });
}
