/* 지구본용 육지 폴리곤 데이터 생성기
 *   world-atlas(Natural Earth 110m) TopoJSON -> 위경도 폴리곤 -> 압축 JS 배열
 *
 * 왜 필요한가:
 *   손으로 그린 폴리곤과 5도 격자는 둘 다 실제 지형과 어긋났다. 실제 국경 데이터를
 *   쓰되, 외부 CDN은 아티팩트 CSP/오프라인에서 막히므로 좌표를 파일에 내장한다.
 *
 * 출력: public/admin/globe-data.js  (window.GLOBE_LAND = [[[lon,lat],...], ...])
 *
 * 단순화:
 *   지구본은 매 프레임 모든 꼭짓점을 투영하므로 원본 5,127점은 과하다.
 *   Douglas-Peucker 로 줄이고, 너무 작은 섬은 버린다.
 *
 * 실행:
 *   # 원본은 리포에 두지 않는다(108KB, 생성물만 있으면 됨). 먼저 받아온다:
 *   curl -sL -o tools/world110.json \
 *     https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
 *   node tools/gen-globe-data.cjs
 *   (다른 경로의 world-atlas JSON을 인자로 넘길 수도 있다)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, 'world110.json');
const OUT = path.join(__dirname, '..', 'public', 'admin', 'globe-data.js');

const topo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const [sx, sy] = topo.transform.scale;
const [tx, ty] = topo.transform.translate;

// TopoJSON delta 인코딩 -> 절대 좌표 [lon, lat]
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
});

function ringOf(idxs) {
  const out = [];
  for (const i of idxs) {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    for (let k = out.length ? 1 : 0; k < a.length; k++) out.push(a[k]);
  }
  return out;
}

/* Douglas-Peucker. 위경도 평면 거리로 계산 — 지구본 표시용이라 이 정도 근사면 충분.
   내부용: 시작·끝이 다른 열린 선분에만 쓴다 (닫힌 링은 아래 simplifyRing 이 처리). */
function simplifyOpen(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [x1, y1] = pts[s], [x2, y2] = pts[e];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1e-9;
    let far = -1, fd = tol;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i];
      const d = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([s, far], [far, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* 닫힌 링 단순화.
   ⚠ 링을 그대로 Douglas-Peucker에 넣으면 시작점과 끝점이 같아 기준선 길이가 0이 되고,
   모든 수직거리가 0으로 계산돼 링 전체가 2점으로 뭉개진다(육지가 통째로 사라짐).
   그래서 링을 가장 먼 두 점으로 잘라 두 개의 열린 선분으로 나눠 처리한다. */
function simplifyRing(ring, tol) {
  // 마지막 점이 첫 점과 같으면 떼어낸다 (닫힘은 그리는 쪽에서 처리)
  const pts = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1) : ring.slice();
  if (pts.length < 4) return pts;

  // 0번 점에서 가장 먼 점을 반대편 분할점으로
  let opp = 0, best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) { best = d; opp = i; }
  }
  const a = simplifyOpen(pts.slice(0, opp + 1), tol);
  const b = simplifyOpen(pts.slice(opp), tol);
  return a.concat(b.slice(1, -1));   // 이음매 중복 제거
}

// 링의 대략적 크기(경위도 바운딩박스 대각) — 작은 섬 거르기용
function span(ring) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of ring) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return Math.hypot(x1 - x0, y1 - y0);
}

const land = topo.objects.land;
const rings = [];
/* 각 폴리곤의 외곽 링(첫 번째 링)만 취한다 — 내부 구멍(호수 등)은 지구본에선 불필요.
   Polygon.arcs = [링, 구멍...] / MultiPolygon.arcs = [[링, 구멍...], ...] 로 깊이가 다르다. */
const collect = (g) => {
  if (g.type === 'Polygon') rings.push(ringOf(g.arcs[0]));
  else if (g.type === 'MultiPolygon') g.arcs.forEach(p => rings.push(ringOf(p[0])));
};
if (land.type === 'GeometryCollection') land.geometries.forEach(collect); else collect(land);

// 단순화 허용 오차(도). 0.55에선 미 동해안이 안쪽으로 깎여 뉴욕이 바다로 빠졌다.
const TOL = 0.3;
const MIN_SPAN = 3.0;    // 이보다 작은 섬은 버린다 (지구본 크기에서 점 하나도 안 됨)

const before = rings.reduce((s, r) => s + r.length, 0);
/* 남극 대륙 제외.
   원본(Natural Earth)의 남극 링은 위도 -85.6에서 사각형으로 잘려 있어, 지구본에
   올리면 대륙이 아니라 남극점 주변에 뜬 섬처럼 보인다. 방문이 나올 일도 없다. */
const isAntarctica = (r) => r.every(([, lat]) => lat < -55);

const out = rings
  .filter(r => span(r) >= MIN_SPAN && !isAntarctica(r))
  .map(r => simplifyRing(r, TOL))
  .filter(r => r.length >= 4)
  // 좌표를 소수 1자리로 (지구본 반지름 ~200px에서 0.1도 = 0.2px 미만, 눈에 안 보임)
  .map(r => r.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));

const after = out.reduce((s, r) => s + r.length, 0);

const body = 'window.GLOBE_LAND=' + JSON.stringify(out) + ';';
const header =
  '/* 지구본 육지 폴리곤 — Natural Earth 110m(world-atlas) 에서 생성.\n' +
  '   tools/gen-globe-data.cjs 가 만든 파일이다. 직접 고치지 말 것.\n' +
  '   형식: window.GLOBE_LAND = [ [[lon,lat], ...], ... ]  (외곽 링만, 소수 1자리)\n' +
  '   출처: https://github.com/topojson/world-atlas (Natural Earth, public domain) */\n';

fs.writeFileSync(OUT, header + body + '\n');

console.error(`링 ${rings.length} -> ${out.length}, 꼭짓점 ${before} -> ${after}`);
console.error(`출력: ${path.relative(process.cwd(), OUT)} `
  + `(${((header.length + body.length) / 1024).toFixed(1)} KB)`);
