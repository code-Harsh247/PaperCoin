import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db-utils';

export async function POST(req) {
  try {
    const body = await req.json();
    const { trades } = body;
    
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid trades array' }, { status: 400 });
    }
    
    // Validate each trade object
    for (const trade of trades) {
      if (!trade.trade_id || trade.filled_amount === undefined || !trade.status) {
        return NextResponse.json({ 
          error: 'Each trade must have trade_id, filled_amount, and status' 
        }, { status: 400 });
      }
    }
    
    // Use a transaction to ensure all updates either succeed or fail together
    const client = await runQuery('BEGIN');
    
    try {
      const updateResults = [];
      
      for (const trade of trades) {
        const query = `
          UPDATE user_trades
          SET filled_amount = $1, status = $2
          WHERE id = $3
          RETURNING *;
        `;
        const params = [trade.filled_amount, trade.status, trade.trade_id];
        const result = await runQuery(query, params, client);
        
        if (result.rowCount > 0) {
          updateResults.push(result.rows[0]);
        }
      }
      
      await runQuery('COMMIT', [], client);
      
      return NextResponse.json({
        message: 'Trades updated successfully',
        updatedCount: updateResults.length,
        updatedTrades: updateResults,
      });
    } catch (error) {
      await runQuery('ROLLBACK', [], client);
      throw error;
    }
  } catch (error) {
    console.error('Error updating trades in bulk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}