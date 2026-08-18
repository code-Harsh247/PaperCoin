import { NextResponse } from "next/server";
import { runQuery, getUserId } from "@/lib/db-utils";

// Named export for POST requests
export async function POST(req) {
  try {
    let body = await req.json();
    const { trade_type, price, amount, filled_amount, status, user_id } = body;

    // Normalize values
    const normalizedTradeType = trade_type.toLowerCase();
    const normalizedStatus = status.toLowerCase();
    
    // Prepare and execute the database query
    try {
      // Placing an order only records it. The portfolio is settled when the
      // order actually fills, in updateUserPortfolio() in MatchingEngineContext,
      // which is the one place that knows the filled amount. Deducting here as
      // well would charge the user twice for the same trade.
      const query = `INSERT INTO user_trades (user_id, trade_type, price, amount, filled_amount, status)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`;
      const values = [user_id, normalizedTradeType, price, amount, filled_amount, normalizedStatus];
      const result = await runQuery(query, values);
      console.log("Trade created successfully in the DB:", result);

      return NextResponse.json({
        message: "Trade created successfully",
        trade_id: result[0]?.id,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error("Database error creating trade:", dbError);
      
      // Handle specific database errors
      if (dbError.code === 'ER_DUP_ENTRY') {
        return NextResponse.json(
          { message: "Duplicate trade entry", error: dbError.message },
          { status: 409 }
        );
      }
      
      if (dbError.code === 'ER_NO_REFERENCED_ROW') {
        return NextResponse.json(
          { message: "Referenced entity does not exist", error: dbError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { message: "Database error while creating trade", error: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch and log all other unexpected errors
    console.error("Unexpected error creating trade:", error);
    return NextResponse.json(
      { 
        message: "An unexpected error occurred", 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }, 
      { status: 500 }
    );
  }
}