// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getUserId } from '@/lib/db-utils';
import { getJwtSecret } from '@/lib/jwtSecret';

export async function GET() {
  const token = (await cookies()).get('token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(token, getJwtSecret());
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

