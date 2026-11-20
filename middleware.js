// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/jwtSecret';

// Define which routes should be protected
const protectedRoutes = ['/dashboard', '/profile', '/settings'];

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Check if the requested path is in the protected routes
  if (protectedRoutes.some(route => path.startsWith(route))) {
    const token = request.cookies.get('token')?.value;
    
    // If no token exists, redirect to login
    // console.log('Token from middleware:', token);
    if (!token) {
      return NextResponse.redirect(new URL('/?authRequired=true', request.url));
    }
    
    try {
      // Verify the JWT token
      // getJwtSecret throws when the secret is missing, landing in the catch
      // below: a misconfigured deploy redirects to login rather than trusting
      // tokens signed with a guessable key.
      await jwtVerify(token, getJwtSecret());
      
      // If token is valid, allow the request to proceed
      return NextResponse.next();
    } catch (error) {
      console.error('Invalid token:', error);
      
      // If token verification fails, redirect to login
      return NextResponse.redirect(new URL('/?authRequired=true', request.url));
    }
  }
  
  // For non-protected routes, allow the request to proceed
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
};