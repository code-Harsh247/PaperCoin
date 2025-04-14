import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req) {
  try {
    const body = await req.json();
    const { trade_ids } = body;
    
    if (!trade_ids || !Array.isArray(trade_ids) || trade_ids.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid trade_ids array' }, { status: 400 });
    }
    
    // Create parameterized query with variable number of parameters
    const placeholders = trade_ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `SELECT * FROM user_trades WHERE id IN (${placeholders})`;
    
    const result = await runQuery(query, trade_ids);
    // console.log('Query result:', result);
    // if (result.rowCount === 0) {
    //   return NextResponse.json({ trades: [] }, { status: 200 });
    // }
    
    return NextResponse.json({ trades: result }, { status: 200 });
  } catch (error) {
    console.error('Error getting trades in bulk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}