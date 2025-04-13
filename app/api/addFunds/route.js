import { NextResponse } from "next/server";
import { runQuery, getUserId } from '@/lib/db-utils'; 

export async function POST(req) {
    try {
        const { email, reqFunds } = await req.json();
        console.log("reqFunds: ", reqFunds);
        console.log("Email: ", email);
        const userId = await getUserId(email);
        console.log("UserId: ", userId);
        
        // Fixed SQL queries with PostgreSQL parameter syntax ($1, $2)
        const fundQuery = "UPDATE user_portfolios SET available_funds = available_funds + $1 WHERE user_id = $2";
        const totalQuery = "UPDATE user_portfolios SET total_balance = total_balance + $1 WHERE user_id = $2";
        
        const fundParams = [reqFunds, userId];
        const totalParams = [reqFunds, userId];
        
        await runQuery(fundQuery, fundParams);
        await runQuery(totalQuery, totalParams);
        
        console.log("reqFunds added successfully");
        return NextResponse.json({ message: 'reqFunds added successfully' }, { status: 200 });
    }
    catch (error) {
        console.error("Error adding reqFunds: ", error);
        return NextResponse.json({ message: 'Error adding reqFunds' }, { status: 500 });
    }
}