/* 사옥 서버가 SSO 티켓을 소모 검증 — POST /api/admin/hq-verify {ticket}
   티켓은 1회용(검증 즉시 삭제) + 60초 TTL. 별도 인증 불필요(티켓 자체가 bearer). */
export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const ticket = String(body.ticket || '').trim();
  if (!/^[\w-]{20,64}$/.test(ticket)) return json({ ok: false }, 400);
  const key = `hqsso:${ticket}`;
  const raw = await env.ANALYTICS.get(key);
  if (!raw) return json({ ok: false }, 401);
  await env.ANALYTICS.delete(key);               // 1회용 — 재사용 차단
  let u = null;
  try { u = JSON.parse(raw).u; } catch (_) {}
  return json({ ok: true, user: u });
}
