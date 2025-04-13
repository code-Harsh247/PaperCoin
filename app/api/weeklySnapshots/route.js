// app/api/portfolio/dashboard-summary/route.js
import { NextResponse } from "next/server";
import { runQuery,getUserId } from '@/lib/db-utils'; 
import { get } from "http";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    // Validate the request data
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    // Get user ID first

    
    const userId = await getUserId(email);

    if(!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get current portfolio state
    const currentQuery = `
      SELECT total_balance, total_invested, available_funds,btccoins
      FROM user_portfolios
      WHERE user_id = $1
    `;
    
    // Get last week's data for weekly changes
    const lastWeekQuery = `
      SELECT total_balance, total_invested, available_funds
      FROM weekly_portfolio_snapshots
      WHERE user_id = $1
      ORDER BY week_ending_date DESC
      LIMIT 1 OFFSET 1
    `;
    
    // Run portfolio queries in parallel
    const currentResult = await runQuery(currentQuery, [userId]);
    const lastWeekResult = await runQuery(lastWeekQuery, [userId]);
    
    // If no current data exists, return error
    if (!currentResult || currentResult.length === 0) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }
    
    // Access the current data
    const current = currentResult[0];
    
    // Use current data as fallback if no historical data exists
    const lastWeek = (lastWeekResult && lastWeekResult.length > 0) ? lastWeekResult[0] : { 
      total_balance: current.total_balance,
      total_invested: current.total_invested,
      available_funds: current.available_funds
    };
    
    // Protect against division by zero
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return '0.0';
      return ((current - previous) / previous * 100).toFixed(1);
    };
    
    // Calculate percentage changes for weekly metrics
    const weeklyBalanceChange = calculateChange(current.total_balance, lastWeek.total_balance);
    const weeklyInvestedChange = calculateChange(current.total_invested, lastWeek.total_invested);
    const weeklyAvailableChange = calculateChange(current.available_funds, lastWeek.available_funds);
    
    return NextResponse.json({
      success: true,
      dashboard: {
        btc_coins:current.btccoins,
        total_balance: current.total_balance,
        total_invested: current.total_invested,
        available_funds: current.available_funds,
        weekly_balance_change_pct: weeklyBalanceChange,
        weekly_invested_change_pct: weeklyInvestedChange,
        weekly_available_change_pct: weeklyAvailableChange
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}