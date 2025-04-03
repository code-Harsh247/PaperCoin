import { addUsertoDb, getUserByEmail } from "@/lib/db-utils";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(req) {
  try {
    const body = await req.json(); // Parse JSON body
    const { email, password, name } = body; // Destructure the required fields

    if (!email || !password || !name) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    // Check if the user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Add the user to the database
    const userInfo = {
      name: name,
      email: email,
      password_hash: hashedPassword,
    };
    const newUser = await addUsertoDb(userInfo);
    if (!newUser) {
      return NextResponse.json({ message: "Error adding user" }, { status: 500 });
    }

    // Don't include the password hash in the response
    const { password_hash, ...userWithoutPassword } = newUser;

    // Success response
    return NextResponse.json({ 
      message: "User created successfully", 
      user: userWithoutPassword 
    }, { status: 201 });

  } catch (error) {
    console.error("Error in sign-up:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}