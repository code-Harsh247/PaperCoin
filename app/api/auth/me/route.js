// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET() {
  const cookieStore = await cookies(); // No need to await
  const tokenCookie = cookieStore.get('token'); // Directly get cookie

  if (!tokenCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const token = tokenCookie.value; // Get the actual token string
  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET );
    const { payload } = await jwtVerify(token, secret);
    
    // Return user data (omitting sensitive information)
    return NextResponse.json({
      name: payload.name,
      email: payload.email,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

