import { NextResponse } from "next/server";
import { runQuery, getUserId } from '@/lib/db-utils';

export async function POST(req) {
    try {
        const { email, reqFunds } = await req.json();

        const amount = Number(reqFunds);
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ message: 'Funds must be a positive number' }, { status: 400 });
        }

        const userId = await getUserId(email);
        if (!userId) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // user_portfolios is a log of snapshots, so adding funds means appending
        // a new row derived from the most recent one. Updating in place would
        // rewrite every historical snapshot for this user.
        const query = `
            INSERT INTO user_portfolios
                (user_id, total_balance, total_invested, available_funds, btccoins, last_updated)
            SELECT user_id,
                   total_balance + $1,
                   total_invested,
                   available_funds + $1,
                   btccoins,
                   NOW()
            FROM user_portfolios
            WHERE user_id = $2
            ORDER BY last_updated DESC
            LIMIT 1
            RETURNING total_balance, available_funds;
        `;

        const rows = await runQuery(query, [amount, userId]);
        if (rows.length === 0) {
            return NextResponse.json({ message: 'Portfolio not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Funds added successfully',
            total_balance: rows[0].total_balance,
            available_funds: rows[0].available_funds
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error adding funds: ", error);
        return NextResponse.json({ message: 'Error adding funds' }, { status: 500 });
    }
}
