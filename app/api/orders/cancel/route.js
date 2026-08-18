// Cancellation request. The API only raises the flag; the engine performs the
// actual cancel (and the reservation release that goes with it), so a cancel
// can never race a fill — the engine's single thread orders them.
import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

export async function POST(request) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const orderId = Number(body.order_id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  const rows = await runQuery(
    `UPDATE orders SET cancel_requested = TRUE, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
       AND status IN ('pending', 'open', 'partially_filled')
     RETURNING id`,
    [orderId, userId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found or not cancellable' }, { status: 404 });
  }
  await runQuery(`SELECT pg_notify('engine_commands', $1)`, [
    JSON.stringify({ type: 'cancel', order_id: orderId }),
  ]);
  return NextResponse.json({ ok: true }, { status: 202 });
}
