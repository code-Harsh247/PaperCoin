import {checkIfUserExists} from "@/lib/db-utils";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { username } = await request.json();

  try {
    const isUserNameUsed =  await checkIfUserExists(username);
    return NextResponse.json({ isUserNameUsed });
  } catch (error) {
    console.error('Error checking username exits:', error);
    return NextResponse.json({ error: 'Error checking username exits' }, { status: 500 });
  }
}
