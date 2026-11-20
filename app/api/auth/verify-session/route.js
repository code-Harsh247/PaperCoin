// app/api/auth/verify-session/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwtSecret";
import { getUserId } from "@/lib/db-utils";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({
      isAuthenticated: false,
      message: "No authentication token found"
    }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    // userId is looked up rather than read from the token: password logins
    // never put it there, and the database is the authority on it anyway.
    return NextResponse.json({
      isAuthenticated: true,
      user: {
        userId: await getUserId(payload.email),
        email: payload.email,
        username: payload.username
      },
      message: "User is authenticated"
    }, { status: 200 });
  } catch (error) {
    console.error("Token verification error:", error.message);
    cookieStore.delete('token');
    return NextResponse.json({
      isAuthenticated: false,
      message: "Invalid or expired token"
    }, { status: 401 });
  }
}
