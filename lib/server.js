import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'jingle_session';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수를 설정해 주세요.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET은 32자 이상이어야 합니다.');
  return new TextEncoder().encode(value);
}

export async function createUserSession(profile) {
  const token = await new SignJWT({ sub: profile.id, kind: 'user' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(sessionSecret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearUserSession() {
  const store = await cookies();
  store.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getUserId() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload.kind === 'user' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}

export async function requireUser() {
  const id = await getUserId();
  if (!id) throw new Error('로그인이 필요합니다.');
  return id;
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}
