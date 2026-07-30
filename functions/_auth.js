/* 관리자 인증 공통 모듈
   - 비밀번호는 PBKDF2-SHA256(31만 회) 해시로만 KV에 저장. 평문은 저장/로깅하지 않는다.
   - 세션은 HttpOnly + Secure + SameSite=Strict 쿠키. 값은 KV에 있는 랜덤 토큰. */

const ITER = 310000;
const SESSION_TTL = 60 * 60 * 12; // 12시간

/* 이메일 형식 검증 — 실무에서 통용되는 범위로 검사
   (RFC 완전 준수 정규식은 과도하게 복잡해 실익이 없음) */
export function isEmail(v) {
  const s = String(v || '');
  if (s.length < 6 || s.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+$/.test(s)) return false;          // @ 정확히 1개, 공백 없음
  const [local, domain] = s.split('@');
  if (!local || local.length > 64) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(domain)) return false;  // 점 1개 이상 필수
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  const tld = domain.split('.').pop();
  return /^[a-zA-Z]{2,}$/.test(tld);                        // TLD는 영문 2자 이상
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export async function hashPassword(password, saltBytes) {
  const salt = saltBytes || crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, iter, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'pbkdf2') return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: parseInt(iter, 10) }, key, 256);
    // 타이밍 공격 방지 — 상수 시간 비교
    const a = new Uint8Array(bits), b = unb64(hashB64);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch (_) { return false; }
}

export function parseCookies(request) {
  const out = {};
  const raw = request.headers.get('Cookie') || '';
  raw.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export async function createSession(env, username) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, '');
  await env.ANALYTICS.put(`sess:${token}`, JSON.stringify({ u: username, t: Date.now() }),
    { expirationTtl: SESSION_TTL });
  return token;
}

export async function getSession(env, request) {
  const token = parseCookies(request).rnr_admin;
  if (!token) return null;
  const raw = await env.ANALYTICS.get(`sess:${token}`);
  if (!raw) return null;
  try { return { token, ...JSON.parse(raw) }; } catch (_) { return null; }
}

export async function destroySession(env, token) {
  if (token) await env.ANALYTICS.delete(`sess:${token}`);
}

export function sessionCookie(token, maxAge = SESSION_TTL) {
  return `rnr_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export const clearCookie = () => 'rnr_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

/* 로그인 시도 제한 — IP 기준 15분 10회 */
export async function rateLimit(env, ip) {
  const key = `rl:${ip}`;
  const n = parseInt(await env.ANALYTICS.get(key) || '0', 10);
  if (n >= 10) return false;
  await env.ANALYTICS.put(key, String(n + 1), { expirationTtl: 900 });
  return true;
}
