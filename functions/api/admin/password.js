/* 비밀번호 변경 — POST /api/admin/password  (로그인 필수)
   body: { current, next }
   - 현재 비밀번호를 반드시 재확인 (세션 탈취만으로 비밀번호를 못 바꾸게)
   - 변경 성공 시 기존 세션 전부 무효화하고 새 세션 발급 */
import { verifyPassword, hashPassword, getSession, createSession, sessionCookie,
         destroySession, rateLimit, resetRateLimit } from '../../_auth.js';

function checkStrength(pw) {
  if (pw.length < 12) return '비밀번호는 12자 이상이어야 합니다.';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(pw)).length;
  if (classes < 3) return '영대문자·영소문자·숫자·특수문자 중 3종류 이상을 포함해야 합니다.';
  return null;
}

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const sess = await getSession(env, request);
  if (!sess) return json({ ok: false, error: '로그인이 필요합니다.' }, 401);

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!await rateLimit(env, ip)) {
    return json({ ok: false, error: '시도가 많아 잠시 제한되었습니다. 15분 후 다시 시도해 주세요.' }, 429);
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const current = String(body.current || '');
  const next = String(body.next || '');

  const stored = await env.ANALYTICS.get(`admin:${sess.u}`);
  if (!stored) return json({ ok: false, error: '계정을 찾을 수 없습니다.' }, 404);

  if (!await verifyPassword(current, stored)) {
    return json({ ok: false, error: '현재 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const bad = checkStrength(next);
  if (bad) return json({ ok: false, error: bad }, 400);

  if (await verifyPassword(next, stored)) {
    return json({ ok: false, error: '기존 비밀번호와 다르게 설정해 주세요.' }, 400);
  }

  await env.ANALYTICS.put(`admin:${sess.u}`, await hashPassword(next));

  // 기존 세션 전부 폐기 (다른 기기 로그아웃) 후 현재 브라우저만 새 세션
  const { keys } = await env.ANALYTICS.list({ prefix: 'sess:', limit: 500 });
  await Promise.all(keys.map(k => env.ANALYTICS.delete(k.name)));

  await resetRateLimit(env, ip);
  const token = await createSession(env, sess.u);
  return json({ ok: true, message: '비밀번호를 변경했습니다. 다른 기기는 로그아웃되었습니다.' },
    200, { 'Set-Cookie': sessionCookie(token) });
}
