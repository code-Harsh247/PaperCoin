import { NextResponse } from "next/server";
import { runQuery, getUserId } from '@/lib/db-utils';

// Deposits are a ledger event like everything else: append the entry, project
// it onto the balance, one transaction. Deposits touch only cash_available, so
// they cannot collide with the engine's reservation accounting.
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

        const rows = await runQuery(
            `WITH entry AS (
                INSERT INTO ledger_entries (user_id, account, delta, ref_type)
                VALUES ($1, 'cash_available', $2, 'deposit')
             )
             UPDATE balances
             SET cash_available = cash_available + $2, updated_at = NOW()
             WHERE user_id = $1
             RETURNING cash_available;`,
            [userId, String(amount)]
        );
        if (rows.length === 0) {
            return NextResponse.json({ message: 'No balance account for user' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Funds added successfully',
            available_funds: rows[0].cash_available,
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error adding funds: ", error);
        return NextResponse.json({ message: 'Error adding funds' }, { status: 500 });
    }
}
