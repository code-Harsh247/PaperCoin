// Resolves the authenticated user for API routes from the JWT cookie.
// This is the ONLY source of identity a route may trust: user ids or emails
// sent in a request body are attacker-controlled and must be ignored.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getUserId } from '@/lib/db-utils';
import { getJwtSecret } from '@/lib/jwtSecret';

async function verifiedPayload() {
  const token = (await cookies()).get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.email ? payload : null;
  } catch {
    return null;
  }
}

export async function getAuthedUserId() {
  const payload = await verifiedPayload();
  return payload ? await getUserId(payload.email) : null;
}

// Identity for routes that also need the email (looked up from the database,
// never taken from the request).
export async function getAuthedUser() {
  const payload = await verifiedPayload();
  if (!payload) return null;
  const userId = await getUserId(payload.email);
  return userId ? { userId, email: payload.email } : null;
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
