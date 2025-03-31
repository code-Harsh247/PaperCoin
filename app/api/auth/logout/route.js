// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the auth token cookie
  response.cookies.set('token', '', {
    expires: new Date(0),
    path: '/',
  });
  
  // Clear the oauth state cookie if it exists
  response.cookies.set('oauth_state', '', {
    expires: new Date(0),
    path: '/',
  });
  
  return response;
}