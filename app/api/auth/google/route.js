// app/api/auth/google/route.js
import { NextResponse } from 'next/server';

// Start OAuth flow by redirecting to Google
export async function GET(request) {
  const googleClientId = process.env.OAUTH_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
  
  // Scopes to request from Google
  const scope = encodeURIComponent('profile email');
  
  // Create a state parameter to prevent CSRF attacks
  const state = generateRandomString(32);
  
  // Create the authorization URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  
  // Set the state in a cookie for verification when Google redirects back
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oauth_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  });
  
  return response;
}

// Helper function to generate a random string for the state parameter
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  
  return text;
}