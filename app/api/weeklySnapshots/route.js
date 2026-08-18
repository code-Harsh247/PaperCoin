// Dashboard summary, served from the engine's balances and fills.
// Response shape is unchanged from the snapshot era so the dashboard
// components need no edits:
//   available_funds  -> spendable cash (reserved cash excluded on purpose)
//   btc_coins        -> total BTC held, including BTC reserved in open sells
//   total_invested   -> average-cost basis of the position, derived from fills
import { NextResponse } from "next/server";
import { runQuery } from '@/lib/db-utils';
import { computePosition } from '@/lib/position';

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const balances = await runQuery(
      `SELECT cash_available, cash_reserved, btc_available, btc_reserved, updated_at
       FROM balances WHERE user_id = $1`,
      [user_id]
    );
    if (balances.length === 0) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    const b = balances[0];

    const fills = await runQuery(
      `SELECT side, quantity, price, executed_at FROM fills
       WHERE user_id = $1 ORDER BY executed_at, id`,
      [user_id]
    );
    const position = computePosition(fills);

    const btcTotal = parseFloat(b.btc_available) + parseFloat(b.btc_reserved);

    return NextResponse.json({
      success: true,
      dashboard: {
        btc_coins: btcTotal,
        total_balance: parseFloat(b.cash_available) + parseFloat(b.cash_reserved),
        total_invested: position.basis,
        available_funds: parseFloat(b.cash_available),
        daily_balance_change_pct: 0,
        daily_invested_change_pct: 0,
        daily_available_change_pct: 0,
        daily_btc_change_pct: 0,
        last_updated: b.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
