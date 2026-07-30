/* 가상 사옥(hq.rnrsoft.vip) SSO 진입 — GET /api/admin/hq-sso
   홈페이지 관리자 세션이 있어야만 1회용 티켓(60초)을 발급하고 사옥으로 302.
   사옥 서버는 /api/admin/hq-verify 로 티켓을 소모 검증한다. 비밀번호 재입력 없음.

   보완 (2026-07-30):
   - 티켓을 base64url로 생성 (기존 replace(/[+/=]/g,'')는 길이가 들쭉날쭉해지고
     엔트로피가 줄어듦 — 문자를 지우는 게 아니라 치환해야 한다)
   - 사옥 주소를 KV(meta:hq_origin)에서 읽어 하드코딩 제거 */
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
  await env.ANALYTICS.put(`hqsso:${ticket}`,
    JSON.stringify({ u: sess.u, t: Date.now() }), { expirationTtl: 60 });

  const origin = (await env.ANALYTICS.get('meta:hq_origin'))?.trim() || 'https://hq.rnrsoft.vip';
  return Response.redirect(`${origin}/sso?t=${encodeURIComponent(ticket)}`, 302);
}
