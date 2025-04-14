import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req) {
    try {
        // Parse the request body
        const body = await req.json();
        const userId = body.user_id;
        
        if (!userId) {
            return NextResponse.json(
                { message: "Missing required parameter: user_id" },
                { status: 400 }
            );
        }
        
        // Query the database for trades
        const query = 'SELECT * FROM user_trades WHERE user_id = $1;';
        const allTrades = await runQuery(query, [userId]);
        
        // Check if trades were found (allTrades will be an array, even if empty)
        if (!allTrades || allTrades.length === 0) {
            return NextResponse.json(
                { 
                    message: "No trades found for this user",
                    trades: [] 
                },
                { status: 200 }  // Using 200 instead of 404 since empty results are valid
            );
        }
        
        // Return the trades
        return NextResponse.json(
            { 
                message: "Trades fetched successfully", 
                trades: allTrades 
            },
            { status: 200 }
        );
    }
    catch (err) {
        console.error('Error in fetching trades:', err);
        return NextResponse.json(
            { message: "Internal server error", error: err.message },
            { status: 500 }
        );
    }
}