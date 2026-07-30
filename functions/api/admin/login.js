import { verifyPassword, createSession, sessionCookie, rateLimit } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!await rateLimit(env, ip)) {
    return json({ ok: false, error: '시도 횟수를 초과했습니다. 15분 후 다시 시도하세요.' }, 429);
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  // setup과 동일하게 소문자 정규화 (대소문자 달라도 로그인되도록)
  const username = String(body.username || '').trim().toLowerCase().slice(0, 254);
  const password = String(body.password || '');
  if (!username || !password) return json({ ok: false, error: '이메일과 비밀번호를 입력하세요.' }, 400);

  const stored = await env.ANALYTICS.get(`admin:${username}`);
  // 사용자 없어도 동일한 지연/응답 — 계정 존재 여부를 노출하지 않는다
  const ok = stored ? await verifyPassword(password, stored) : await verifyPassword(password, 'pbkdf2$310000$AAAA$AAAA');
  if (!stored || !ok) return json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);

  const token = await createSession(env, username);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
}
