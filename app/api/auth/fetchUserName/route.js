import { fetchUserName } from "@/lib/db-utils";
import { NextResponse } from "next/server";

export async function POST(request) {
    const { email } = await request.json();
    try {
        const username = await fetchUserName(email);
        return NextResponse.json({ username });
    } catch (error) {
        console.error('Error fetching username:', error);
        return NextResponse.json({ error: 'Error fetching username' }, { status: 500 });
    }
}
