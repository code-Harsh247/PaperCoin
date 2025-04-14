// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getUserId } from '@/lib/db-utils';

export async function GET() {
  const token = cookies().get('token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = await getUserId(payload.email);
    // Return user data (omitting sensitive information)
    return NextResponse.json({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      userId: userId,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

