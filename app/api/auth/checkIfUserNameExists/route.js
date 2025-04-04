import {checkIfUserNameExists} from "@/lib/db-utils";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      );
    }
    
    // Check if username exists using your utility function
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
