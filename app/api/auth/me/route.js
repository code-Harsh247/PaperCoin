// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET() {
  const token = cookies().get('token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your_jwt_secret_key');
    const { payload } = await jwtVerify(token, secret);
    
    // Return user data (omitting sensitive information)
    return NextResponse.json({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

