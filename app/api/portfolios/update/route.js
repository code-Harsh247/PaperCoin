import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req) {
    try {
        let body = await req.json();
        let { user_id, portfolio } = body;
        
        if (!user_id || !portfolio) {
            return NextResponse.json({ error: "User ID and portfolio are required" }, { status: 400 });
        }
       
        const query = `
            INSERT INTO user_portfolios
            (user_id, total_balance, available_funds, btccoins, total_invested, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
       
        const { total_balance, available_funds, btccoins, total_invested } = portfolio;
        const last_updated = new Date().toISOString();
        const params = [
            user_id,
            total_balance,
            available_funds,
            btccoins,
            total_invested,
            last_updated
        ];
       
        const result = await runQuery(query, params);
        return NextResponse.json({
            success: true,
            message: "Portfolio snapshot added successfully",
            updated_at: last_updated,
        });
    }
    catch (error) {
        console.error("Error in adding portfolio snapshot:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}