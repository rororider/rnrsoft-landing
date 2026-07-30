/* 비밀번호 분실 복구 — POST /api/admin/recover
   body: { token, username, password }

   설계 이유:
   비밀번호는 해시로만 저장하므로 원문 복구가 불가능하다. 이메일 발송 인프라도 없어
   "메일로 링크 전송" 방식을 쓸 수 없다. 대신 오프라인에 보관하는 복구 토큰
   (KV meta:recovery_token)을 제시하면 비밀번호를 재설정하도록 한다.

   보안:
   - 복구 토큰은 1회용. 사용하면 즉시 폐기하고 새 토큰을 발급해 KV에 저장
   - 기존 세션 전부 무효화
   - rate limit 적용 (무차별 시도 차단)
   - 토큰 비교는 상수 시간 */
import { hashPassword, createSession, sessionCookie, rateLimit, resetRateLimit } from '../../_auth.js';

function constEq(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!await rateLimit(env, ip)) {
    return json({ ok: false, error: '시도가 많아 잠시 제한되었습니다. 15분 후 다시 시도해 주세요.' }, 429);
  }

  const stored = (await env.ANALYTICS.get('meta:recovery_token'))?.trim();
  if (!stored) return json({ ok: false, error: '복구 토큰이 설정되지 않았습니다.' }, 500);

  let body = {};
  try { body = await request.json(); } catch (_) {}

  if (!constEq(String(body.token || '').trim(), stored)) {
    return json({ ok: false, error: '복구 토큰이 올바르지 않습니다.' }, 403);
  }

  const username = String(body.username || '').trim().toLowerCase().slice(0, 254);
  const password = String(body.password || '');

  const exists = await env.ANALYTICS.get(`admin:${username}`);
  if (!exists) return json({ ok: false, error: '해당 이메일의 관리자 계정이 없습니다.' }, 404);

  if (password.length < 12) return json({ ok: false, error: '비밀번호는 12자 이상이어야 합니다.' }, 400);
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(password)).length;
  if (classes < 3) {
    return json({ ok: false, error: '영대문자·영소문자·숫자·특수문자 중 3종류 이상을 포함해야 합니다.' }, 400);
  }

  await env.ANALYTICS.put(`admin:${username}`, await hashPassword(password));

  // 복구 토큰 1회용 — 즉시 새 값으로 교체 (재사용 차단)
  const fresh = b64url(crypto.getRandomValues(new Uint8Array(24)));
  await env.ANALYTICS.put('meta:recovery_token', fresh);

  // 기존 세션 전부 폐기
  const { keys } = await env.ANALYTICS.list({ prefix: 'sess:', limit: 500 });
  await Promise.all(keys.map(k => env.ANALYTICS.delete(k.name)));

  await resetRateLimit(env, ip);
  const token = await createSession(env, username);
  return json({
    ok: true,
    newRecoveryToken: fresh,   // 화면에 1회만 표시 — 사용자가 다시 보관해야 함
  }, 200, { 'Set-Cookie': sessionCookie(token) });
}
