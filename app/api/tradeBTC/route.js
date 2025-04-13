import { NextResponse } from "next/server";
import { runQuery, getUserId } from "@/lib/db-utils";

// Named export for POST requests
export async function POST(req) {
  try {
    // Input validation - Check if request has a body
    if (!req) {
      return NextResponse.json(
        { message: "Invalid request" },
        { status: 400 }
      );
    }

    // Parse the request body and handle JSON parsing errors
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['email', 'trade_type', 'price', 'amount', 'filled_amount', 'status'];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { message: `Missing required field: ${field}` },
          { status: 400 }
        );
    }
    }

    // Validate numeric fields have proper values
    const numericFields = ['price', 'amount', 'filled_amount'];
    for (const field of numericFields) {
      const value = parseFloat(body[field]);
      if (isNaN(value) || value < 0) {
        return NextResponse.json(
          { message: `Invalid value for ${field}: must be a non-negative number` },
          { status: 400 }
        );
      }
    }

    // Validate trade_type
    const validTradeTypes = ['bid', 'ask'];
    if (!validTradeTypes.includes(body.trade_type.toLowerCase())) {
      return NextResponse.json(
        { message: "Invalid trade_type: must be 'buy' or 'sell'" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['open', 'filled', 'partially_filled', 'cancelled'];
    if (!validStatuses.includes(body.status.toLowerCase())) {
      return NextResponse.json(
        { message: "Invalid status: must be 'open', 'filled', 'partially_filled', or 'cancelled'" },
        { status: 400 }
      );
    }

    // Get user ID from email
    let user_id;
    try {
      user_id = await getUserId(body.email);
      
      if (!user_id) {
        return NextResponse.json(
          { message: "User not found with the provided email" },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("Error getting user ID:", error);
      return NextResponse.json(
        { message: "Error retrieving user information", error: error.message },
        { status: 500 }
      );
    }

    const { trade_type, price, amount, filled_amount, status } = body;

    // Normalize values
    const normalizedTradeType = trade_type.toLowerCase();
    const normalizedStatus = status.toLowerCase();
    
    // Prepare and execute the database query
    try {
      const query = `INSERT INTO user_trades (user_id, trade_type, price, amount, filled_amount, status) 
               VALUES ($1, $2, $3, $4, $5, $6)`;
      const values = [user_id, normalizedTradeType, price, amount, filled_amount, normalizedStatus];
      const result = await runQuery(query, values);

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