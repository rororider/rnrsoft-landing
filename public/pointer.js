/* 포인터 반응 모션 — 홈 히어로 전용
   배경(매트릭스 레인·신호 곡선·그리드)과 같은 언어로:
   1) 커서를 따라오는 시안 빛 웅덩이 (lerp로 부드럽게 지연)
   2) 커서 주변에서만 밝아지는 그리드 (mask로 국소 발광)
   3) 신호 곡선이 커서 쪽으로 미세하게 휘는 시차 효과
   저사양·모션 민감 사용자 배려: 터치 기기·reduced-motion에서는 동작하지 않음 */
(function () {
  var hero = document.querySelector('.rs-hero');
  var main = hero && hero.closest('main');
  if (!main) return;

  // 마우스가 있는 환경에서만 (터치 전용 기기 제외)
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 1) 빛 웅덩이
  var glow = document.createElement('div');
  glow.style.cssText = [
    'position:absolute', 'width:520px', 'height:520px', 'left:0', 'top:0',
    'margin:-260px 0 0 -260px', 'border-radius:50%', 'pointer-events:none',
    'background:radial-gradient(circle,rgba(56,200,240,0.13),rgba(43,134,245,0.06) 42%,rgba(43,134,245,0) 70%)',
    'opacity:0', 'transition:opacity .45s ease', 'will-change:transform', 'z-index:1',
  ].join(';');
  main.appendChild(glow);

  // 2) 커서 주변만 밝아지는 그리드 (기존 .rs-grid-bg 위에 겹침)
  var grid = document.createElement('div');
  grid.style.cssText = [
    'position:absolute', 'inset:0', 'pointer-events:none', 'z-index:1',
    'background-image:linear-gradient(rgba(120,205,255,0.30) 1px,transparent 1px),' +
      'linear-gradient(90deg,rgba(120,205,255,0.30) 1px,transparent 1px)',
    'background-size:56px 56px',
    'opacity:0', 'transition:opacity .45s ease', 'will-change:mask-position',
  ].join(';');
  main.appendChild(grid);

  var svg = main.querySelector('svg[viewBox="0 0 1440 420"]');

  var tx = 0, ty = 0, cx = 0, cy = 0, active = false, raf = null;

  function onMove(e) {
    var r = main.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!active) {
      active = true;
      cx = tx; cy = ty;                    // 첫 진입은 점프 없이 그 자리에서 시작
      glow.style.opacity = '1';
      grid.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(loop);
    }
  }

  function onLeave() {
    active = false;
    glow.style.opacity = '0';
    grid.style.opacity = '0';
    if (svg) svg.style.transform = '';
  }

  function loop() {
    // lerp — 커서를 살짝 뒤따라오는 관성
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;

    glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';

    var m = 'radial-gradient(220px circle at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px,'
          + '#000 0%,rgba(0,0,0,0.55) 38%,transparent 72%)';
    grid.style.webkitMaskImage = m;
    grid.style.maskImage = m;

    // 3) 신호 곡선 시차 — 커서 반대쪽으로 아주 미세하게
    if (svg) {
      var r = main.getBoundingClientRect();
      var dx = (cx / Math.max(r.width, 1) - 0.5) * -14;
      var dy = (cy / Math.max(r.height, 1) - 0.5) * -7;
      svg.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
    }

    if (active || Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }

  main.addEventListener('mousemove', onMove, { passive: true });
  main.addEventListener('mouseleave', onLeave, { passive: true });
})();
