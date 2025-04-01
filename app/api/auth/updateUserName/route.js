// File: app/api/auth/updateUsername/route.js
import { checkIfUserExists } from "@/lib/db-utils";
import { NextResponse } from "next/server";
import { updateUserName } from "@/lib/db-utils"; // Assuming this function exists

// For the checkUserExist API call


export async function POST(request) {
  const { email, username } = await request.json();

  // Validate required fields
  if (!email || !username) {
    return NextResponse.json(
      { error: 'Email and username are required' }, 
      { status: 400 }
    );
  }

  try {
    // Double-check if username is available before updating
    // const isUserNameUsed = await checkIfUserExists(username);
    
    // if (isUserNameUsed) {
    //   return NextResponse.json(
    //     { error: 'Username is already taken' }, 
    //     { status: 409 }
    //   );
    // }

    // Update the user's username in the database
    // Using the provided function as mentioned in your requirements
    await updateUserName(email, username);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Username successfully updated' 
    });
  } catch (error) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username' }, 
      { status: 500 }
    );
  }
}