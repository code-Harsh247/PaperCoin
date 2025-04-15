import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req) {
    try {
        let body = await req.json();
        let { user_id, portfolio } = body;
        if (!user_id || !portfolio) {
            return NextResponse.json({ error: "User ID and portfolios are required" }, { status: 400 });
        }
        
        const query = `
            UPDATE user_portfolios
            SET 
                total_balance = $1,
                available_funds = $2,
                btccoins = $3,
                total_invested = $4,
                last_updated = $5
            WHERE user_id = $6
        `;
        
        const { total_balance, available_funds, btccoins, total_invested } = portfolio;
        const last_updated = new Date().toISOString();
        const params = [
            total_balance,
            available_funds,
            btccoins,
            total_invested,
            last_updated,
            user_id
        ];
        
        const result = await runQuery(query, params);
        
        
        return NextResponse.json({ 
            success: true, 
            message: "Portfolio updated successfully",
            updated_at: last_updated
        });
    }
    catch (error) {
        console.error("Error in updating user portfolios:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}