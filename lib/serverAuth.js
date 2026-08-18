// Resolves the authenticated user for API routes from the JWT cookie.
// Same verification path as app/api/auth/me — one way to be logged in.
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getUserId } from '@/lib/db-utils';

export async function getAuthedUserId() {
  const token = (await cookies()).get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.email) return null;
    return await getUserId(payload.email);
  } catch {
    return null;
  }
}
