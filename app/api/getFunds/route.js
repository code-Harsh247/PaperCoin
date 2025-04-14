import { NextResponse } from "next/server";
import { runQuery} from '@/lib/db-utils';

export async function POST(req) {
    try{
        let body = await req.json();
        const { user_id } = body;
        const query = `SELECT available_funds, btccoins FROM user_portfolios WHERE user_id = $1`;
        const params = [user_id];
        const funds = await runQuery(query, params);
        // console.log("Funds fetched successfully: ", funds);
        if (funds.rowCount === 0) {
            return NextResponse.json({ message: 'No funds found' }, { status: 404 });
        }
        return NextResponse.json({ funds }, { status: 200 });

    }
    catch (error) {
        console.error("Error fetching funds: ", error);
        return NextResponse.json({ message: 'Error fetching funds' }, { status: 500 });
    }
}