/* 포인터 반응 모션 — 매트릭스 컨셉, 즉각 반응
   설계 원칙(Apple 'Designing Fluid Interfaces'):
   - 커서 추종은 지연 0 (1:1). 뒤따라오는 lerp는 "느리다"는 인상만 준다.
   - 잔상·궤적은 커서가 아니라 '흔적'에만 적용 — 반응은 즉시, 여운은 뒤에.

   효과:
   1) 커서 위치 글리치 코드 컬럼 — 지나간 자리에 카타카나가 순간 점등 후 소멸
   2) 커서 주변 그리드 국소 발광 (즉시)
   3) 커서를 향해 수렴하는 스캔 십자선 (얇은 시안 라인)
   4) 빠르게 움직이면 속도에 비례해 잔상 트레일 + 밝기 증가
   5) 클릭 시 링 펄스 확산
*/
(function () {
  var hero = document.querySelector('.rs-hero');
  var main = hero && hero.closest('main');
  if (!main) return;
  if (!window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var GLYPHS = 'ｦｱｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789<>[]{}/\\|=+*#$%&@'.split('');
  var rnd = function (a) { return a[(Math.random() * a.length) | 0]; };

  // ---- 레이어 (모두 pointer-events:none, 히어로 콘텐츠 아래 z-index:1) ----
  var layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden';
  main.appendChild(layer);

  // 커서 광원 — transform만 갱신하므로 지연 없음
  var glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;left:0;top:0;width:340px;height:340px;margin:-170px 0 0 -170px;' +
    'border-radius:50%;pointer-events:none;opacity:0;transition:opacity .25s ease;will-change:transform;' +
    'background:radial-gradient(circle,rgba(120,255,214,0.16),rgba(56,200,240,0.08) 40%,rgba(43,134,245,0) 70%)';
  layer.appendChild(glow);

  // 국소 발광 그리드
  var grid = document.createElement('div');
  grid.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s ease;' +
    'background-image:linear-gradient(rgba(120,255,214,0.34) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(120,255,214,0.34) 1px,transparent 1px);background-size:56px 56px';
  layer.appendChild(grid);

  // 스캔 십자선
  var vLine = document.createElement('div');
  vLine.style.cssText = 'position:absolute;top:0;bottom:0;width:1px;pointer-events:none;opacity:0;' +
    'transition:opacity .3s ease;will-change:transform;' +
    'background:linear-gradient(180deg,transparent,rgba(120,255,214,0.5) 45%,rgba(120,255,214,0.5) 55%,transparent)';
  var hLine = document.createElement('div');
  hLine.style.cssText = 'position:absolute;left:0;right:0;height:1px;pointer-events:none;opacity:0;' +
    'transition:opacity .3s ease;will-change:transform;' +
    'background:linear-gradient(90deg,transparent,rgba(120,255,214,0.42) 45%,rgba(120,255,214,0.42) 55%,transparent)';
  layer.appendChild(vLine); layer.appendChild(hLine);

  var svg = main.querySelector('svg[viewBox="0 0 1440 420"]');

  // ---- 글리치 글리프 풀 (재사용해서 DOM 생성 비용 억제) ----
  var POOL = 56, pool = [], pi = 0;
  for (var i = 0; i < POOL; i++) {
    var g = document.createElement('span');
    g.style.cssText = "position:absolute;font-family:'JetBrains Mono',monospace;font-size:13px;" +
      'pointer-events:none;opacity:0;will-change:transform,opacity;text-shadow:0 0 8px currentColor';
    layer.appendChild(g);
    pool.push(g);
  }

  function spawnGlyph(x, y, hot) {
    var el = pool[pi]; pi = (pi + 1) % POOL;
    var sx = x + (Math.random() * 44 - 22);
    var sy = y + (Math.random() * 32 - 16);
    el.textContent = rnd(GLYPHS);
    el.style.color = hot ? '#d8fff0' : (Math.random() < 0.45 ? '#78ffd6' : '#4ae0b0');
    el.style.fontSize = (hot ? 15 : 12.5) + 'px';
    el.style.transition = 'none';
    el.style.transform = 'translate3d(' + sx.toFixed(0) + 'px,' + sy.toFixed(0) + 'px,0)';
    el.style.opacity = hot ? '1' : '0.85';
    // 다음 프레임에 소멸 트랜지션 (강제 리플로우로 전환 보장)
    void el.offsetWidth;
    // 매트릭스처럼 아래로 흘러내리며 서서히 소멸 — 궤적이 눈에 남도록 길게
    el.style.transition = 'opacity 1.15s ease-out, transform 1.15s linear';
    el.style.opacity = '0';
    el.style.transform = 'translate3d(' + sx.toFixed(0) + 'px,' + (sy + 46).toFixed(0) + 'px,0)';
  }

  // ---- 상태 ----
  var x = 0, y = 0, px = 0, py = 0, active = false, raf = null, lastSpawn = 0;

  function render() {
    raf = null;
    // 커서 요소는 지연 없이 즉시 현재 좌표로
    glow.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    vLine.style.transform = 'translate3d(' + x + 'px,0,0)';
    hLine.style.transform = 'translate3d(0,' + y + 'px,0)';

    var m = 'radial-gradient(200px circle at ' + x + 'px ' + y + 'px,#000 0%,rgba(0,0,0,.5) 40%,transparent 72%)';
    grid.style.webkitMaskImage = m;
    grid.style.maskImage = m;

    if (svg) {
      var r = main.getBoundingClientRect();
      var dx = (x / Math.max(r.width, 1) - 0.5) * -18;
      var dy = (y / Math.max(r.height, 1) - 0.5) * -9;
      svg.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
    }
  }

  function onMove(e) {
    var r = main.getBoundingClientRect();
    var nx = e.clientX - r.left, ny = e.clientY - r.top;
    var speed = Math.hypot(nx - x, ny - y);
    px = x; py = y; x = nx; y = ny;

    if (!active) {
      active = true;
      glow.style.opacity = '1'; grid.style.opacity = '1';
      vLine.style.opacity = '1'; hLine.style.opacity = '1';
    }
    // 속도에 비례한 글리치 — 빠를수록 더 자주, 더 밝게
    var now = performance.now();
    var gap = speed > 60 ? 14 : speed > 22 ? 28 : 70;
    if (now - lastSpawn > gap) {
      lastSpawn = now;
      spawnGlyph(x, y, speed > 60);
      if (speed > 45) spawnGlyph(px + (x - px) * 0.5, py + (y - py) * 0.5, speed > 90); // 잔상 보간
      if (speed > 110) spawnGlyph(px + (x - px) * 0.25, py + (y - py) * 0.25, true);
    }
    glow.style.opacity = String(Math.min(1, 0.6 + speed / 90));

    if (!raf) raf = requestAnimationFrame(render);
  }

  function onLeave() {
    active = false;
    glow.style.opacity = '0'; grid.style.opacity = '0';
    vLine.style.opacity = '0'; hLine.style.opacity = '0';
    if (svg) svg.style.transform = '';
  }

  // 클릭 — 링 펄스
  function onDown(e) {
    var r = main.getBoundingClientRect();
    var cx = e.clientX - r.left, cy = e.clientY - r.top;
    var ring = document.createElement('div');
    ring.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;' +
      'border-radius:50%;border:1.5px solid rgba(120,255,214,0.85);pointer-events:none;' +
      'transform:translate3d(' + cx + 'px,' + cy + 'px,0) scale(0.4);opacity:.9;will-change:transform,opacity';
    layer.appendChild(ring);
    requestAnimationFrame(function () {
      ring.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1), opacity .55s ease-out';
      ring.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) scale(7)';
      ring.style.opacity = '0';
    });
    setTimeout(function () { ring.remove(); }, 650);
    for (var k = 0; k < 5; k++) spawnGlyph(cx, cy, true);
  }

  main.addEventListener('mousemove', onMove, { passive: true });
  main.addEventListener('mouseleave', onLeave, { passive: true });
  main.addEventListener('mousedown', onDown, { passive: true });
})();
