import { NextResponse } from "next/server";
import { runQuery } from '@/lib/db-utils';

// Spendable balances for the trading form. Reserved amounts are intentionally
// excluded: money committed to a resting order is not available to spend.
export async function POST(req) {
    try {
        const { user_id } = await req.json();
        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        const rows = await runQuery(
            `SELECT cash_available AS available_funds, btc_available AS btccoins,
                    cash_reserved, btc_reserved
             FROM balances WHERE user_id = $1`,
            [user_id]
        );
        return NextResponse.json({ funds: rows }, { status: 200 });
    } catch (error) {
        console.error("Error fetching funds:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
