// Compatibility shim: the history page still asks for "trades", which are now
// engine orders. Field names are mapped back to the legacy shape.
//
// Always the logged-in user's orders; any user_id in the body is ignored.
import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";
import { getAuthedUserId, unauthorized } from "@/lib/serverAuth";

export async function POST() {
    const userId = await getAuthedUserId();
    if (!userId) return unauthorized();

    try {
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
            [userId]
        );
        return NextResponse.json({ trades }, { status: 200 });
    } catch (error) {
        console.error("Error fetching trades:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
