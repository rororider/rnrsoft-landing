/* 최초 관리자 계정 생성 — POST /api/admin/setup
   보안 설계:
   - 관리자 계정이 이미 있으면 무조건 거부 (선점 방지)
   - env.SETUP_TOKEN 과 일치하는 토큰을 제시해야만 생성 가능
   - 비밀번호는 사용자가 브라우저에서 직접 입력 -> 즉시 PBKDF2 해싱. 평문 저장·로깅 없음 */

import { hashPassword, createSession, sessionCookie, rateLimit, resetRateLimit, isEmail } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!await rateLimit(env, ip)) return json({ ok: false, error: '시도 횟수 초과. 15분 후 재시도.' }, 429);

  // 이미 관리자가 있으면 종료
  const exists = await env.ANALYTICS.get('meta:admin_created');
  if (exists) return json({ ok: false, error: '관리자 계정이 이미 존재합니다.' }, 409);

  // 토큰은 KV(meta:setup_token) 우선, 없으면 환경변수
  const setupToken = (await env.ANALYTICS.get('meta:setup_token'))?.trim() || env.SETUP_TOKEN;
  if (!setupToken) return json({ ok: false, error: 'SETUP_TOKEN 미설정' }, 500);

  let body = {};
  try { body = await request.json(); } catch (_) {}

  if (String(body.token || '').trim() !== setupToken) {
    return json({ ok: false, error: '설정 토큰이 올바르지 않습니다.' }, 403);
  }

  // 아이디는 이메일 형식 — 소문자로 정규화해 저장(대소문자 혼동 방지)
  const username = String(body.username || '').trim().toLowerCase().slice(0, 254);
  const password = String(body.password || '');

  if (!isEmail(username)) {
    return json({ ok: false, error: '올바른 이메일 형식이 아닙니다. (예: name@example.com)' }, 400);
  }
  if (password.length < 12) {
    return json({ ok: false, error: '비밀번호는 12자 이상이어야 합니다.' }, 400);
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(password)).length;
  if (classes < 3) {
    return json({ ok: false, error: '비밀번호는 영대문자·영소문자·숫자·특수문자 중 3종류 이상을 포함해야 합니다.' }, 400);
  }

  const hash = await hashPassword(password);       // 평문은 여기서 소멸
  await env.ANALYTICS.put(`admin:${username}`, hash);
  await env.ANALYTICS.put('meta:admin_created', new Date().toISOString());

  await resetRateLimit(env, ip);
  const token = await createSession(env, username);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
}
