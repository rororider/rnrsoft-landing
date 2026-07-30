import { verifyPassword, createSession, sessionCookie, rateLimit, resetRateLimit } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!await rateLimit(env, ip)) {
    return json({ ok: false, error: '로그인 시도가 많아 잠시 제한되었습니다. 15분 후 다시 시도해 주세요.' }, 429);
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  // setup과 동일하게 소문자 정규화 (대소문자 달라도 로그인되도록)
  const username = String(body.username || '').trim().toLowerCase().slice(0, 254);
  const password = String(body.password || '');
  if (!username || !password) return json({ ok: false, error: '이메일과 비밀번호를 입력하세요.' }, 400);

  const stored = await env.ANALYTICS.get(`admin:${username}`);
  // 사용자 없어도 동일한 지연/응답 — 계정 존재 여부를 노출하지 않는다.
  // 더미 해시의 반복 횟수는 실제와 같은 100000 (Workers 상한). 초과하면 예외로 500이 난다.
  const DUMMY = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const ok = stored ? await verifyPassword(password, stored) : await verifyPassword(password, DUMMY);
  if (!stored || !ok) return json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);

  await resetRateLimit(env, ip);   // 성공했으니 실패 카운터 해제
  const token = await createSession(env, username);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
}
