import { getSession, destroySession, clearCookie } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await getSession(env, request);
  if (s) await destroySession(env, s.token);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Set-Cookie': clearCookie() },
  });
}
