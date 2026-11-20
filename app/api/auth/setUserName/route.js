// Sets the logged-in user's username. Whose account changes comes from the
// session cookie only; an email in the body used to decide it, which let
// anyone rename any account.
import { updateUserName } from "@/lib/db-utils";
import { NextResponse } from "next/server";
import { getAuthedUser, unauthorized } from "@/lib/serverAuth";
import { validateUsername } from "@/lib/username";

export async function POST(request) {
    const user = await getAuthedUser();
    if (!user) return unauthorized();

    let username;
    try {
        ({ username } = await request.json());
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const problem = validateUsername(username);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    try {
        const result = await updateUserName(user.email, username);
        return NextResponse.json({ success: result });
    } catch (error) {
        // users.username is UNIQUE: a taken name is the caller's problem, not ours.
        if (error.code === '23505') {
            return NextResponse.json({ error: "This username is already taken" }, { status: 409 });
        }
        console.error("Error updating username:", error);
        return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }
}
