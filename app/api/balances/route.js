import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId } from '@/lib/serverAuth';

export async function GET() {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const rows = await runQuery(
    `SELECT cash_available, cash_reserved, btc_available, btc_reserved, updated_at
     FROM balances WHERE user_id = $1`,
    [userId]
  );
  if (rows.length === 0) {
    return NextResponse.json({
      cash_available: '0', cash_reserved: '0', btc_available: '0', btc_reserved: '0',
    });
  }
  return NextResponse.json(rows[0]);
}
