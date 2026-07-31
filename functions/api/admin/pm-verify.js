/* P-001 서버가 SSO 티켓을 소모 검증 — POST /api/admin/pm-verify {ticket}
   티켓은 1회용(검증 즉시 삭제) + 60초 TTL.

   hq-verify.js와 동일한 보안 설계:
   - 무작위 티켓 대입을 막기 위해 IP당 rate limit (5분 30회)
   - 공유 비밀(meta:pm_shared_secret)을 X-PM-Secret 헤더로 요구.
     설정돼 있으면 P-001 서버만 호출 가능 — 티켓을 가로채도 제3자는 소모 못 함.
     (미설정이면 하위 호환으로 통과시키되, 설정을 권고)
   - 티켓·비밀 비교는 상수 시간 */

function constEq(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  // 무작위 대입 차단 — IP당 5분 30회
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const rlKey = `pmrl:${ip}`;
  const n = parseInt(await env.ANALYTICS.get(rlKey) || '0', 10);
  if (n >= 30) return json({ ok: false, error: 'rate_limited' }, 429);
  await env.ANALYTICS.put(rlKey, String(n + 1), { expirationTtl: 300 });

  // P-001 서버 신원 확인 (공유 비밀이 설정된 경우)
  const secret = (await env.ANALYTICS.get('meta:pm_shared_secret'))?.trim();
  if (secret && !constEq(request.headers.get('X-PM-Secret') || '', secret)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const ticket = String(body.ticket || '').trim();
  if (!/^[\w-]{20,64}$/.test(ticket)) return json({ ok: false }, 400);

  const key = `pmsso:${ticket}`;
  const raw = await env.ANALYTICS.get(key);
  if (!raw) return json({ ok: false }, 401);
  await env.ANALYTICS.delete(key);               // 1회용 — 재사용 차단

  let u = null;
  try { u = JSON.parse(raw).u; } catch (_) {}
  return json({ ok: true, user: u });
}
