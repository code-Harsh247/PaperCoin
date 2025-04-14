import { NextResponse } from "next/server";
import { getUserId } from "@/lib/db-utils";

export async function POST(req) {
    try{
        let body = await req.json();
        const userId = await getUserId(body.email);
        
        if (!userId) {
            return NextResponse.json(
                { message: "User not found with the provided email" },
                { status: 404 }
            );
        }

        return NextResponse.json({ user_id }, { status: 200 });
    }
    catch(error){
        console.error('Error fetching user ID:', error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}