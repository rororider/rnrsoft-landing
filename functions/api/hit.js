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

/* IP 마스킹 — 원문은 저장하지 않는다.
   IPv4: 마지막 옥텟 제거 (203.0.113.45 -> 203.0.113.*)
   IPv6: '::'를 0으로 전개한 뒤 앞 3그룹(/48)만 (2001:db8:1:... -> 2001:db8:1::*)

   ⚠ 과거 결함: filter(Boolean)으로 '::'를 그냥 삭제해 뒤쪽 호스트 그룹이 앞으로
   당겨졌다. 그 결과 fe80::(MAC 파생 인터페이스 ID)나 ::ffff:1.2.3.4(IPv4 원문)가
   마스킹 없이 남았다. 반드시 0 그룹으로 복원한 뒤 잘라야 한다.
   /64가 아니라 /48로 자르는 이유: /64는 통상 가구·회선 단위라 식별성이 남는다. */
function maskIp(ip) {
  const s = String(ip || '').trim().toLowerCase();
  if (!s) return 'unknown';

  if (s.includes(':')) {
    // IPv4-mapped(::ffff:a.b.c.d)는 IPv4 규칙으로 처리
    const m = s.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (m) return maskIp(m[1]);

    let groups;
    const zi = s.indexOf('::');
    if (zi === -1) {
      groups = s.split(':');
    } else {
      const head = s.slice(0, zi).split(':').filter(Boolean);
      const tail = s.slice(zi + 2).split(':').filter(Boolean);
      const fill = 8 - head.length - tail.length;
      if (fill < 0) return 'unknown';
      groups = [...head, ...Array(fill).fill('0'), ...tail];
    }
    if (groups.length !== 8 || !groups.every(g => /^[0-9a-f]{1,4}$/.test(g))) return 'unknown';
    return groups.slice(0, 3).join(':') + '::*';
  }

  const p = s.split('.');
  if (p.length !== 4 || !p.every(o => /^\d{1,3}$/.test(o) && +o <= 255)) return 'unknown';
  return `${p[0]}.${p[1]}.${p[2]}.*`;
}

/* 카운터 증가.
   일자별 키는 TTL을 건다 — 대시보드는 최대 90일만 조회하는데(stats.js)
   TTL이 없으면 그 뒤로 읽히지도 않는 키가 KV에 영구 누적된다.
   누적 카운터(pv:total 등)는 ttl=0으로 호출해 영구 보관. */
async function bump(kv, key, by = 1, ttl = 60 * 60 * 24 * 120) {
  const cur = parseInt(await kv.get(key) || '0', 10);
  await kv.put(key, String(cur + by), ttl ? { expirationTtl: ttl } : undefined);
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

  // 도시 — Cloudflare가 제공. 개인 식별 불가 수준의 지역 정보
  const city = (request.cf?.city || '').slice(0, 40);
  const cityKey = city ? `${country}|${city}` : null;

  await Promise.all([
    bump(kv, `pv:${day}`),                        // 일별 PV
    bump(kv, `pv:${day}:${path}`),                // 일별 페이지별 PV
    bump(kv, 'pv:total', 1, 0),                         // 누적 PV
    isNewVisitor ? bump(kv, `uvc:${day}`) : null, // 일별 UV
    isNewVisitor ? bump(kv, 'uvc:total', 1, 0) : null,  // 누적 UV
    ref !== 'internal' ? bump(kv, `ref:${day}:${ref}`) : null,
    bump(kv, `geo:${day}:${country}`),
    cityKey ? bump(kv, `city:${day}:${cityKey}`) : null,
  ].filter(Boolean));

  /* 최근 방문 목록 — 마스킹 IP·시각·페이지·위치. 최근 100건만 순환 보관.
     IP 원문은 어디에도 저장하지 않는다(마스킹 후에만 기록).

     재식별 방지: 개별 필드는 익명이어도 조합하면 특정이 가능하다.
     - 시각은 10분 단위로 절삭 (초 단위 정밀도는 통계에 기여가 없고 식별성만 올림)
     - region은 저장하지 않음 (city와 중복이고 조합 식별성만 증가)
     - 보존 14일 (100건 순환이라 트래픽이 적으면 소수 기록이 오래 남는 게 더 위험) */
  try {
    const recRaw = await kv.get('rec:list');
    const rec = recRaw ? JSON.parse(recRaw) : [];
    const coarse = Math.floor(now / 600000) * 600000;   // 10분 단위
    rec.unshift({
      t: new Date(coarse + KST_OFFSET).toISOString().replace('T', ' ').slice(0, 16),
      ip: maskIp(ip),
      p: path,
      c: country,
      city: city || '',
      ref: ref === 'internal' ? '' : ref,
      new: isNewVisitor ? 1 : 0,
    });
    await kv.put('rec:list', JSON.stringify(rec.slice(0, 100)),
      { expirationTtl: 60 * 60 * 24 * 14 });   // 14일 후 자동 삭제
  } catch (_) {}

  // 최근 활동 날짜 목록 (대시보드가 어떤 날을 읽을지 알기 위함)
  const daysRaw = await kv.get('meta:days');
  const days = daysRaw ? JSON.parse(daysRaw) : [];
  if (!days.includes(day)) {
    days.push(day);
    await kv.put('meta:days', JSON.stringify(days.slice(-120))); // 최근 120일 유지
  }

  return json({ ok: true });
}
