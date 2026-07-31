/* P-001 프로젝트 매니저(pm.rnrsoft.vip) SSO 진입 — GET /api/admin/pm-sso
   홈페이지 관리자 세션이 있어야만 1회용 티켓(60초)을 발급하고 P-001로 302.
   P-001 서버는 /api/admin/pm-verify 로 티켓을 소모 검증한다. 매직링크 재입력 없음.

   hq-sso.js와 같은 패턴이지만 키 공간을 분리했다(pmsso: / meta:pm_origin).
   같은 접두사를 공유하면 한쪽 티켓으로 다른 쪽에 들어갈 수 있다. */
import { getSession } from '../../_auth.js';

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function onRequestGet({ request, env }) {
  if (!env.ANALYTICS) return new Response('kv_unbound', { status: 500 });

  const sess = await getSession(env, request);
  if (!sess) {
    // 세션 없으면 관리자 로그인으로 (로그인 후 다시 진입)
    return Response.redirect(new URL('/admin/', request.url).toString(), 302);
  }

  const ticket = b64url(crypto.getRandomValues(new Uint8Array(24)));
  await env.ANALYTICS.put(`pmsso:${ticket}`,
    JSON.stringify({ u: sess.u, t: Date.now() }), { expirationTtl: 60 });

  const origin = (await env.ANALYTICS.get('meta:pm_origin'))?.trim() || 'https://pm.rnrsoft.vip';
  return Response.redirect(`${origin}/sso?t=${encodeURIComponent(ticket)}`, 302);
}
