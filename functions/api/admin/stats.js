/* 통계 조회 — GET /api/admin/stats?days=30   (로그인 필수) */
import { getSession } from '../../_auth.js';

const KST_OFFSET = 9 * 60 * 60 * 1000;
const kstDate = (ts) => new Date(ts + KST_OFFSET).toISOString().slice(0, 10);

export async function onRequestGet({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), {
    status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

  if (!env.ANALYTICS) return json({ ok: false, error: 'kv_unbound' }, 500);

  const sess = await getSession(env, request);
  if (!sess) return json({ ok: false, error: 'unauthorized' }, 401);

  const kv = env.ANALYTICS;
  const url = new URL(request.url);
  const nDays = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10), 1), 90);

  // 최근 N일 (KST)
  const today = Date.now();
  const days = [];
  for (let i = nDays - 1; i >= 0; i--) days.push(kstDate(today - i * 86400000));

  const PAGES = ['/', '/apps', '/about', '/contact', '/privacy', '/terms', 'other'];

  const [totalPv, totalUv, daily, pages] = await Promise.all([
    kv.get('pv:total').then(v => parseInt(v || '0', 10)),
    kv.get('uvc:total').then(v => parseInt(v || '0', 10)),
    Promise.all(days.map(async d => ({
      date: d,
      pv: parseInt(await kv.get(`pv:${d}`) || '0', 10),
      uv: parseInt(await kv.get(`uvc:${d}`) || '0', 10),
    }))),
    Promise.all(PAGES.map(async p => {
      const counts = await Promise.all(days.map(d => kv.get(`pv:${d}:${p}`).then(v => parseInt(v || '0', 10))));
      return { path: p, pv: counts.reduce((a, b) => a + b, 0) };
    })),
  ]);

  // 리퍼러·국가는 최근 14일만 (KV list 비용 절약)
  const recent = days.slice(-14);
  const agg = async (prefix) => {
    const map = {};
    for (const d of recent) {
      const { keys } = await kv.list({ prefix: `${prefix}:${d}:`, limit: 200 });
      for (const k of keys) {
        const name = k.name.split(':').slice(2).join(':');
        map[name] = (map[name] || 0) + parseInt(await kv.get(k.name) || '0', 10);
      }
    }
    return Object.entries(map).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 12);
  };

  const [referrers, countries] = await Promise.all([agg('ref'), agg('geo')]);

  return json({
    ok: true,
    user: sess.u,
    totals: { pv: totalPv, uv: totalUv },
    daily,
    pages: pages.filter(p => p.pv > 0).sort((a, b) => b.pv - a.pv),
    referrers,
    countries,
    generatedAt: new Date(Date.now() + KST_OFFSET).toISOString().replace('T', ' ').slice(0, 19) + ' KST',
  });
}
