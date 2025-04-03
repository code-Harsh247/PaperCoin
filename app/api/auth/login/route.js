// app/api/auth/login/route.js
import { getUserByEmail } from "@/lib/db-utils";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const body = await req.json();
    // Validate request body
    if (!body) {
      return NextResponse.json({ message: "Request body is required" }, { status: 400 });
    }
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    // Find the user in the database
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: user.email,
        name: user.name,
        // Add any other user info you want in the token
      }, 
      SECRET_KEY, 
      { expiresIn: "7d" }
    );

    // Create response
    const response = NextResponse.json(
      { message: "Login successful" }, 
      { status: 200 }
    );

    // Set token as HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 *10, // 10 minutes
      path: '/',
    });

    return response;

  } catch (error) {
    console.error("Error in login:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}