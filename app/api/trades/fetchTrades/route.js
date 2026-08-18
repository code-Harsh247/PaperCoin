// Compatibility shim: the history page still asks for "trades", which are now
// engine orders. Field names are mapped back to the legacy shape.
import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req) {
    try {
        const { user_id } = await req.json();
        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        const trades = await runQuery(
            `SELECT id,
                    CASE side WHEN 'buy' THEN 'bid' ELSE 'ask' END AS trade_type,
                    type AS order_type,
                    COALESCE(limit_price, avg_fill_price, stop_price, 0) AS price,
                    quantity AS amount,
                    filled_quantity AS filled_amount,
                    CASE status WHEN 'cancelled' THEN 'canceled' ELSE status END AS status,
                    created_at
             FROM orders WHERE user_id = $1
             ORDER BY created_at DESC LIMIT 200`,
            [user_id]
        );
        return NextResponse.json({ trades }, { status: 200 });
    } catch (error) {
        console.error("Error fetching trades:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
