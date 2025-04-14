import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';

export async function POST(req) {
  try {
    const body = await req.json();
    const { trade_id, filled_amount, status } = body;

    if (!trade_id || filled_amount === undefined || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const query = `
      UPDATE user_trades 
      SET filled_amount = $1, status = $2 
      WHERE id = $3
      RETURNING *;
    `;
    const params = [filled_amount, status, trade_id];
    const result = await runQuery(query, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Trade not found or not updated' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Trade updated successfully',
      updatedTrade: result,
    });

  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
