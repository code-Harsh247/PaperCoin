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
      const query = `INSERT INTO user_trades (user_id, trade_type, price, amount, filled_amount, status) 
               VALUES ($1, $2, $3, $4, $5, $6)`;
      const values = [user_id, normalizedTradeType, price, amount, filled_amount, normalizedStatus];
      const result = await runQuery(query, values);
      console.log("Trade created successfully in the DB:", result);
      const fundQuery = "UPDATE user_portfolios SET available_funds = available_funds - $1 WHERE user_id = $2";
        const totalQuery = "UPDATE user_portfolios SET total_balance = total_balance - $1 WHERE user_id = $2";
        
        const fundParams = [price, user_id];
        const totalParams = [price, user_id];
        
        await runQuery(fundQuery, fundParams);
        await runQuery(totalQuery, totalParams);

      
      return NextResponse.json({ 
        message: "Trade created successfully", 
        trade_id: result.insertId,
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