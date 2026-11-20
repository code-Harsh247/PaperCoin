import { NextResponse } from "next/server";
import { runQuery } from '@/lib/db-utils';
import { getAuthedUserId, unauthorized } from '@/lib/serverAuth';

// Per-deposit ceiling. Also keeps String(amount) out of exponent notation
// ("1e+21"), which NUMERIC would reject.
const MAX_DEPOSIT = 1_000_000;

// Deposits are a ledger event like everything else: append the entry, project
// it onto the balance, one transaction. Deposits touch only cash_available, so
// they cannot collide with the engine's reservation accounting.
//
// The account credited is always the logged-in user's. An email in the body
// used to decide that, which let anyone credit any account.
export async function POST(req) {
    const userId = await getAuthedUserId();
    if (!userId) return unauthorized();

    try {
        const { reqFunds } = await req.json();

        const amount = Number(reqFunds);
        if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_DEPOSIT) {
            return NextResponse.json(
                { message: `Funds must be a positive number up to ${MAX_DEPOSIT.toLocaleString('en-US')}` },
                { status: 400 }
            );
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
            [userId, amount.toFixed(8)]
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
