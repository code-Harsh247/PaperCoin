// Holdings history for the performance chart, derived from fills: one point
// per execution, carrying the position and its cost basis at that moment.
// Keeps the legacy response shape ({portfolio: [{btccoins, total_invested,
// last_updated}]}) so PortfolioPerformance renders it unchanged.
import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";
import { positionTimeline } from "@/lib/position";

export async function POST(req) {
    try {
        let body = await req.json();
        let { user_id } = body;
        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const fills = await runQuery(
            `SELECT side, quantity, price, executed_at FROM fills
             WHERE user_id = $1 ORDER BY executed_at, id`,
            [user_id]
        );
        return NextResponse.json({ portfolio: positionTimeline(fills) }, { status: 200 });
    } catch (error) {
        console.error("Error fetching portfolio history:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
