import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req) {
  try {
    const body = await req.json();
    const { trade_id } = body;

    if (!trade_id) {
      return NextResponse.json({ error: 'Missing trade_id' }, { status: 400 });
    }

    const query = `UPDATE user_trades SET status = 'canceled' WHERE id = $1 RETURNING *`;
    const params = [trade_id];
    const result = await runQuery(query, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'No trade found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Trade canceled successfully',
      trade: result 
    }, { status: 200 });
  } catch (error) {
    console.error('Error canceling trade:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
