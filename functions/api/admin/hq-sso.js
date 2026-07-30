/* 가상 사옥(hq.rnrsoft.vip) SSO 진입 — GET /api/admin/hq-sso
   홈페이지 관리자 세션이 있어야만 1회용 티켓(60초)을 발급하고 사옥으로 302.
   사옥 서버는 /api/admin/hq-verify 로 티켓을 소모 검증한다. 비밀번호 재입력 없음. */
import { getSession } from '../../_auth.js';

export async function onRequestGet({ request, env }) {
  if (!env.ANALYTICS) return new Response('kv_unbound', { status: 500 });
  const sess = await getSession(env, request);
  if (!sess) {
    // 세션 없으면 관리자 로그인으로 (로그인 후 다시 진입)
    return Response.redirect(new URL('/admin/', request.url).toString(), 302);
  }
  const buf = crypto.getRandomValues(new Uint8Array(24));
  const ticket = btoa(String.fromCharCode(...buf)).replace(/[+/=]/g, '');
  await env.ANALYTICS.put(`hqsso:${ticket}`, JSON.stringify({ u: sess.u, t: Date.now() }), { expirationTtl: 60 });
  return Response.redirect('https://hq.rnrsoft.vip/sso?t=' + ticket, 302);
}
