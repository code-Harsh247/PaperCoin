import {checkIfUserNameSet} from "@/lib/db-utils";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { email } = await request.json();

  try {
    const isUserNameSet = await checkIfUserNameSet(email);
    return NextResponse.json({ isUserNameSet });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ error: 'Error checking username' }, { status: 500 });
  }
}
