// The logged-in user's username. Any email in the body is ignored.
import { fetchUserName } from "@/lib/db-utils";
import { NextResponse } from "next/server";
import { getAuthedUser, unauthorized } from "@/lib/serverAuth";

export async function POST() {
    const user = await getAuthedUser();
    if (!user) return unauthorized();

    try {
        const username = await fetchUserName(user.email);
        return NextResponse.json({ username });
    } catch (error) {
        console.error('Error fetching username:', error);
        return NextResponse.json({ error: 'Error fetching username' }, { status: 500 });
    }
}
