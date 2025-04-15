import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db-utils";

export async function POST(req){
    try{
        let body = await req.json();
        let { user_id } = body;
        if(!user_id){
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }
        let query = `SELECT * FROM user_portfolios WHERE user_id = $1`;
        let values = [user_id];
        let result = await runQuery(query, values);
        if(result.length === 0){
            return NextResponse.json({ error: "No portfolios found for this user" }, { status: 404 });
        }
        return NextResponse.json({portfolio: result}, { status: 200 });
    }
    catch(error){
        console.error("Error in fetching user portfolios:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}