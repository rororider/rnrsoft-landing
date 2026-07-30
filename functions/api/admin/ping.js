/* 연결 진단용 헬스체크 — GET /api/admin/ping
   rate limit을 소모하지 않고 "/api/admin/* 경로가 도달 가능한가"만 확인한다.
   민감 정보 없음. */
export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    kv: !!env.ANALYTICS,
    adminReady: !!(env.ANALYTICS && await env.ANALYTICS.get('meta:admin_created')),
  }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
