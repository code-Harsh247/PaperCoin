// Username availability for the post-login username picker. Login-only: it is
// only ever called after sign-in, and keeping it closed stops anonymous
// enumeration of who has an account here.
import { checkIfUserNameExists } from "@/lib/db-utils";
import { NextResponse } from "next/server";
import { getAuthedUserId, unauthorized } from "@/lib/serverAuth";
import { validateUsername } from "@/lib/username";

export async function POST(request) {
  const userId = await getAuthedUserId();
  if (!userId) return unauthorized();

  try {
    const { username } = await request.json();
    const problem = validateUsername(username);
    if (problem) {
      return NextResponse.json({ message: problem }, { status: 400 });
    }

    const exists = await checkIfUserNameExists(username);
    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { message: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}
