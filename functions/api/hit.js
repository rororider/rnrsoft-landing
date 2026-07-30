/* 방문 집계 — POST /api/hit
   KV에 일별/페이지별/리퍼러별 카운터를 누적한다.
   개인정보는 저장하지 않는다 (IP 원문·UA 원문 미저장, 방문자 구분은 일일 익명 해시). */

const KST_OFFSET = 9 * 60 * 60 * 1000;

function kstDate(ts) {
  return new Date(ts + KST_OFFSET).toISOString().slice(0, 10); // YYYY-MM-DD (KST)
}

// IP+UA+날짜+솔트 -> 익명 해시. 날짜가 바뀌면 값도 바뀌므로 추적 불가(일일 UV 근사용).
async function dailyHash(ip, ua, day, salt) {
  const buf = new TextEncoder().encode(`${ip}|${ua}|${day}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|monitor|uptime|curl|wget|python-requests|axios|lighthouse|pagespeed|gtmetrix/i;

async function bump(kv, key, by = 1) {
  const cur = parseInt(await kv.get(key) || '0', 10);
  await kv.put(key, String(cur + by));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (o, s = 200) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const ua = request.headers.get('User-Agent') || '';
  // 봇은 집계에서 제외 (숫자 왜곡 방지)
  if (BOT_RE.test(ua)) return json({ ok: true, skipped: 'bot' });

  let body = {};
  try { body = await request.json(); } catch (_) {}

  // 경로 정규화 — 화이트리스트 밖은 'other'로 (KV 키 폭증 방지)
  const KNOWN = ['/', '/index.html', '/apps', '/apps.html', '/about', '/about.html',
                 '/contact', '/contact.html', '/privacy', '/privacy.html', '/terms', '/terms.html'];
  let path = String(body.p || '/').split('?')[0].slice(0, 64);
  if (!KNOWN.includes(path)) path = 'other';
  path = path.replace(/\.html$/, '').replace(/^\/$/, '/') || '/';
  if (path === '/index') path = '/';

  const now = Date.now();
  const day = kstDate(now);
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const country = request.cf?.country || 'XX';

  // 리퍼러는 호스트만 (경로엔 개인정보가 섞일 수 있음)
  let ref = 'direct';
  try {
    const r = String(body.r || '');
    if (r) {
      const h = new URL(r).hostname.replace(/^www\./, '');
      if (h && h !== 'rnrsoft.vip') ref = h.slice(0, 48);
      else ref = 'internal';
    }
  } catch (_) {}

  const kv = env.ANALYTICS;
  const salt = (await kv.get('meta:hash_salt'))?.trim() || env.HASH_SALT || 'rnr-default-salt';
  const visitor = await dailyHash(ip, ua, day, salt);

  // 같은 방문자 같은 날 첫 방문인지 (UV 판정) — 48h TTL
  const uvKey = `uv:${day}:${visitor}`;
  const seen = await kv.get(uvKey);
  const isNewVisitor = !seen;
  if (isNewVisitor) await kv.put(uvKey, '1', { expirationTtl: 60 * 60 * 48 });

  await Promise.all([
    bump(kv, `pv:${day}`),                        // 일별 PV
    bump(kv, `pv:${day}:${path}`),                // 일별 페이지별 PV
    bump(kv, 'pv:total'),                         // 누적 PV
    isNewVisitor ? bump(kv, `uvc:${day}`) : null, // 일별 UV
    isNewVisitor ? bump(kv, 'uvc:total') : null,  // 누적 UV
    ref !== 'internal' ? bump(kv, `ref:${day}:${ref}`) : null,
    bump(kv, `geo:${day}:${country}`),
  ].filter(Boolean));

  // 최근 활동 날짜 목록 (대시보드가 어떤 날을 읽을지 알기 위함)
  const daysRaw = await kv.get('meta:days');
  const days = daysRaw ? JSON.parse(daysRaw) : [];
  if (!days.includes(day)) {
    days.push(day);
    await kv.put('meta:days', JSON.stringify(days.slice(-120))); // 최근 120일 유지
  }

  return json({ ok: true });
}
