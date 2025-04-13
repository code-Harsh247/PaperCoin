// app/api/auth/verify-session/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    // Get the auth token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    // If no token exists, user is not authenticated
    if (!token) {
      return NextResponse.json({ 
        isAuthenticated: false,
        message: "No authentication token found" 
      }, { status: 401 });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Return user data from the token
    return NextResponse.json({
      isAuthenticated: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username
      },
      message: "User is authenticated"
    }, { status: 200 });
  } catch (error) {
    // If token verification fails
    console.error("Token verification error:", error);
    
    // Clear the invalid token
    const cookieStore = cookies();
    cookieStore.delete('token');
    
    return NextResponse.json({
      isAuthenticated: false,
      message: "Invalid or expired token"
    }, { status: 401 });
  }
}