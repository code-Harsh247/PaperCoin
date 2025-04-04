import { updateUserName } from "@/lib/db-utils";
import { NextResponse } from "next/server";

export async function POST(request) {
    const { email, username } = await request.json();
    try {
        const result = await updateUserName(email, username);
        return NextResponse.json({ success: result });
    } catch (error) {
        console.error("Error updating username:", error);
        return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }
}