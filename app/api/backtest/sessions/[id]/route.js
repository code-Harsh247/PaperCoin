// One session: status + progress + isolated balances. DELETE stops the replay.
import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

async function ownedSession(id, userId) {
  const rows = await runQuery(
    `SELECT id, status, start_date, end_date, speed, replay_position, created_at, ended_at
     FROM backtest_sessions WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function GET(request, { params }) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const session = await ownedSession(id, userId);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const balances = await runQuery(
    `SELECT cash_available, cash_reserved, btc_available, btc_reserved
     FROM backtest_balances WHERE session_id = $1`, [id]);
  return NextResponse.json({ session, balances: balances[0] ?? null });
}

export async function DELETE(request, { params }) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const session = await ownedSession(id, userId);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await runQuery(`SELECT pg_notify('engine_backtest_commands', $1)`, [
    JSON.stringify({ type: 'stop_session', session_id: Number(id) }),
  ]);
  return NextResponse.json({ ok: true }, { status: 202 });
}
