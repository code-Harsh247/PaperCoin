// app/api/auth/google/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { addUsertoDb } from '@/lib/db-utils'; 

export async function GET(request) {
  // Get the authorization code from the URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Retrieve the stored state from cookies to verify CSRF protection
  const storedState = cookies().get('oauth_state')?.value;

  // Verify state parameter to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=invalid_state`);
  }

  // Exchange the authorization code for tokens
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=token_exchange_failed`);
    }

    // Get user information with the access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();



    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info:', userInfo);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=user_info_failed`);
    }

    // console.log('User Info:', userInfo);

    // Format user info for database storage
    const dbUserInfo = {
      name: userInfo.name,
      email: userInfo.email,
      google_id: userInfo.sub, // Google's user ID is in the 'sub' field
      password_hash: null // No password for Google auth users
    };

    // Add or update user in the database
    try {
      const dbUser = await addUsertoDb(dbUserInfo);
      console.log('User added/updated in database:', dbUser);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // You can decide whether to fail the auth flow or continue
      // return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=database_error`);
    }
    // ADD user to database

    // Here you would typically:
    // 1. Check if the user exists in your database
    // 2. Create a new user if they don't exist
    // 3. Update user information if needed
    // 4. Create a session or JWT token

    // For this example, we'll create a simple JWT
    const jwt = await createJWT(userInfo);

    // Redirect to the frontend with the token
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth-success`);

    // Set the token in a cookie
    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=server_error`);
  }
}

async function createJWT(userInfo) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your_jwt_secret_key');

  const token = await new SignJWT({
    sub: userInfo.sub,
    name: userInfo.name,
    email: userInfo.email,
    picture: userInfo.picture,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}