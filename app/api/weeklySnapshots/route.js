// app/api/portfolio/dashboard-summary/route.js
import { NextResponse } from "next/server";
import { runQuery } from '@/lib/db-utils';

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id } = body;
    
    // Validate the request data
    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
   
    // Get current portfolio state (most recent entry)
    const currentQuery = `
      SELECT total_balance, total_invested, available_funds, btccoins, last_updated
      FROM user_portfolios
      WHERE user_id = $1
      ORDER BY last_updated DESC
      LIMIT 1
    `;
   
    // Calculate yesterday's date (24 hours ago)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayQuery = `
      SELECT total_balance, total_invested, available_funds, btccoins
      FROM user_portfolios
      WHERE user_id = $1 AND last_updated <= $2
      ORDER BY last_updated DESC
      LIMIT 1
    `;
   
    // Run portfolio queries
    const currentResult = await runQuery(currentQuery, [user_id]);
    console.log("Current Result : ",currentResult);
    const yesterdayResult = await runQuery(yesterdayQuery, [user_id, yesterday.toISOString()]);
    console.log("Yesterday Result : ",yesterdayResult);
   
    // If no current data exists, return error
    if (currentResult.length === 0) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
   
    // Access the current data
    const current = currentResult[0];
   
    // Use current data as fallback if no historical data exists
    const previousDay = (yesterdayResult.length > 0) 
      ? yesterdayResult[0] 
      : {
          total_balance: 0,
          total_invested: 0,
          available_funds: 0,
          btccoins: 0
        };
   
    console.log("Previous Day Result : ",previousDay);
    // Protect against division by zero
    const calculateChange = (current, previous) => {
      if(previous === 0) return 0.0;
      return ((current - previous) / previous * 100).toFixed(2);
    };
   
    // Calculate percentage changes since yesterday
    const dailyBalanceChange = calculateChange(current.total_balance, previousDay.total_balance);
    const dailyInvestedChange = calculateChange(current.total_invested, previousDay.total_invested);
    const dailyAvailableChange = calculateChange(current.available_funds, previousDay.available_funds);
    const dailyBtcChange = calculateChange(current.btccoins, previousDay.btccoins);
   
    return NextResponse.json({
      success: true,
      dashboard: {
        btc_coins: current.btccoins,
        total_balance: current.total_balance,
        total_invested: current.total_invested,
        available_funds: current.available_funds,
        daily_balance_change_pct: dailyBalanceChange,
        daily_invested_change_pct: dailyInvestedChange,
        daily_available_change_pct: dailyAvailableChange,
        daily_btc_change_pct: dailyBtcChange,
        last_updated: current.last_updated
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}