/* 회전하는 3D 지구본 — 외부 라이브러리 없이 Canvas 2D + 직교(orthographic) 투영.
 *
 *   구 위의 점(위도 φ, 경도 λ)을 회전 후 화면에 정사영한다.
 *   지구 뒤편(z < 0)은 보이지 않으므로 잘라낸다.
 *
 * 데이터: globe-data.js 의 window.GLOBE_LAND (실제 Natural Earth 육지 폴리곤)
 * 사용:   window.mountGlobe(container, countries) -> { destroy() }
 *
 * 성능:
 *   Canvas 2D + DPR 스케일. 폴리곤 2,000여 점을 매 프레임 투영하는데,
 *   SVG로 하면 노드 재생성 비용이 커서 Canvas를 택했다.
 *   탭이 백그라운드면 rAF가 멈추고, prefers-reduced-motion 이면 자동 회전을 끈다.
 */
(function () {
  'use strict';

  var DEG = Math.PI / 180;

  /* 국가 대표 좌표(위도, 경도) + 한글명. worldmap.js 와 같은 표를 쓴다 —
     여기 없는 국가 코드는 지구본에 찍지 않는다(화이트리스트 = XSS 방어도 겸함). */
  var C = {
    KR:[37.5,127.0,'대한민국'], JP:[36.2,138.3,'일본'], CN:[35.9,104.2,'중국'],
    TW:[23.7,121.0,'대만'], HK:[22.3,114.2,'홍콩'], SG:[1.35,103.8,'싱가포르'],
    TH:[15.9,101.0,'태국'], VN:[14.1,108.3,'베트남'], PH:[12.9,121.8,'필리핀'],
    ID:[-0.8,113.9,'인도네시아'], MY:[4.2,101.98,'말레이시아'], IN:[20.6,79.0,'인도'],
    US:[39.8,-98.6,'미국'], CA:[56.1,-106.3,'캐나다'], MX:[23.6,-102.6,'멕시코'],
    BR:[-14.2,-51.9,'브라질'], AR:[-38.4,-63.6,'아르헨티나'], CL:[-35.7,-71.5,'칠레'],
    GB:[55.4,-3.4,'영국'], IE:[53.4,-8.2,'아일랜드'], FR:[46.2,2.2,'프랑스'],
    DE:[51.2,10.5,'독일'], NL:[52.1,5.3,'네덜란드'], BE:[50.5,4.5,'벨기에'],
    ES:[40.5,-3.7,'스페인'], PT:[39.4,-8.2,'포르투갈'], IT:[41.9,12.6,'이탈리아'],
    CH:[46.8,8.2,'스위스'], AT:[47.5,14.6,'오스트리아'], SE:[60.1,18.6,'스웨덴'],
    NO:[60.5,8.5,'노르웨이'], FI:[61.9,25.7,'핀란드'], DK:[56.3,9.5,'덴마크'],
    PL:[51.9,19.1,'폴란드'], CZ:[49.8,15.5,'체코'], RO:[45.9,24.97,'루마니아'],
    RU:[61.5,105.3,'러시아'], UA:[48.4,31.2,'우크라이나'], TR:[38.96,35.24,'튀르키예'],
    IL:[31.05,34.85,'이스라엘'], AE:[23.4,53.85,'아랍에미리트'], SA:[23.9,45.08,'사우디'],
    EG:[26.8,30.8,'이집트'], ZA:[-30.6,22.9,'남아공'], NG:[9.08,8.68,'나이지리아'],
    KE:[-0.02,37.9,'케냐'], AU:[-25.3,133.8,'호주'], NZ:[-40.9,174.9,'뉴질랜드']
  };
  window.COUNTRY_NAMES = Object.keys(C).reduce(function (o, k) { o[k] = C[k][2]; return o; }, {});

  /* 위경도 -> 회전된 3D 단위벡터.
     rot = 지구를 서→동으로 돌린 각도(라디안), tilt = 시점 기울기(북반구를 위로) */
  function toXYZ(lat, lon, rot, tilt) {
    var p = lat * DEG, l = lon * DEG + rot;
    var cp = Math.cos(p);
    var x = cp * Math.sin(l);
    var y = Math.sin(p);
    var z = cp * Math.cos(l);
    // X축 기준 기울기 — y,z 평면 회전
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    return [x, y * ct - z * st, y * st + z * ct];
  }

  window.mountGlobe = function (el, countries) {
    if (!el) return null;

    var list = (countries || []).filter(function (c) { return C[c.name]; });
    var LAND = window.GLOBE_LAND || [];

    // 데이터가 없으면 조용히 실패하지 말고 이유를 남긴다
    if (!LAND.length) {
      el.innerHTML = '<div class="muted" style="padding:40px 0;text-align:center">'
                   + '지도 데이터를 불러오지 못했습니다.</div>';
      return null;
    }

    var cv = document.createElement('canvas');
    cv.style.cssText = 'width:100%;height:100%;display:block;cursor:grab';
    el.innerHTML = '';
    el.appendChild(cv);
    var ctx = cv.getContext('2d');

    // 방문 수 툴팁을 띄울 요소
    var tip = document.createElement('div');
    tip.className = 'globe-tip';
    tip.style.display = 'none';
    el.appendChild(tip);

    var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
    function resize() {
      var b = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, b.width); H = Math.max(1, b.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.44;
      cx = W / 2; cy = H / 2;
    }

    /* 초기 시점: 동아시아(경도 ~127°)를 정면 중앙에.
       toXYZ 의 λ = lon*DEG + rot 이므로 정면(λ=0)에 오게 하려면 rot = -lon*DEG.
       tilt 는 양수일 때 북반구가 화면 위로 온다 (음수면 남반구가 올라와 호주가 정면에 온다). */
    var rot = -127 * DEG;
    var tilt = 0.32;
    var dragging = false, lastX = 0, lastY = 0, vel = 0.0016;
    var reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var auto = !reduce;
    var hot = null;              // 마우스가 올라간 국가

    var max = list.reduce(function (m, c) { return Math.max(m, +c.count || 0); }, 1);
    max = Math.max(max, 10);     // 1회짜리 국가가 최대 크기로 그려지지 않게

    // 마우스 위치 — draw()가 마커 호버 판정에 쓰므로 그 앞에서 선언한다
    var pointer = { x: 0, y: 0, on: false };

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // --- 바다(구체) + 가장자리 빛번짐
      var oc = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.1, cx, cy, R);
      oc.addColorStop(0, '#1b3057');
      oc.addColorStop(0.62, '#132444');
      oc.addColorStop(1, '#0c182e');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fillStyle = oc; ctx.fill();

      // --- 경위도 격자 (은은하게)
      ctx.strokeStyle = 'rgba(120,170,235,0.10)'; ctx.lineWidth = 0.7;
      for (var la = -60; la <= 60; la += 30) {      // 위선
        ctx.beginPath(); var on = false;
        for (var lo = -180; lo <= 180; lo += 4) {
          var v = toXYZ(la, lo, rot, tilt);
          if (v[2] < 0) { on = false; continue; }
          var px = cx + v[0] * R, py = cy - v[1] * R;
          if (!on) { ctx.moveTo(px, py); on = true; } else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      for (var lo2 = -180; lo2 < 180; lo2 += 30) {  // 경선
        ctx.beginPath(); var on2 = false;
        for (var la2 = -88; la2 <= 88; la2 += 4) {
          var v2 = toXYZ(la2, lo2, rot, tilt);
          if (v2[2] < 0) { on2 = false; continue; }
          var px2 = cx + v2[0] * R, py2 = cy - v2[1] * R;
          if (!on2) { ctx.moveTo(px2, py2); on2 = true; } else ctx.lineTo(px2, py2);
        }
        ctx.stroke();
      }

      /* --- 육지
         구 뒤편(z<0) 점을 그냥 건너뛰고 closePath 하면, 끊긴 양 끝이 직선으로 이어져
         지구를 가로지르는 가짜 띠가 생긴다. 그래서 앞면 구간(z>=0)만 모아
         '구간별로' 따로 그린다. 각 구간은 지구 가장자리에서 시작해 가장자리에서 끝나므로
         닫아도 대륙 형태를 벗어나지 않는다. */
      ctx.fillStyle = '#2f4a72';
      ctx.strokeStyle = 'rgba(150,200,255,0.30)';
      ctx.lineWidth = 0.6;
      for (var i = 0; i < LAND.length; i++) {
        var ring = LAND[i];
        var seg = [], segs = [];
        for (var j = 0; j < ring.length; j++) {
          var p = toXYZ(ring[j][1], ring[j][0], rot, tilt);
          if (p[2] < 0) {                      // 뒤편 -> 현재 구간을 끊는다
            if (seg.length > 2) segs.push(seg);
            seg = [];
            continue;
          }
          seg.push([cx + p[0] * R, cy - p[1] * R]);
        }
        if (seg.length > 2) segs.push(seg);

        /* 링 전체가 앞면이면(끊긴 적 없음) 원래의 닫힌 폴리곤 하나다.
           여러 구간으로 끊겼다면 각각 독립적으로 채운다. */
        for (var s = 0; s < segs.length; s++) {
          var pts = segs[s];
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0], pts[q][1]);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // --- 방문 국가 마커 (앞면만)
      hot = null;
      var mk = [];
      for (var k = 0; k < list.length; k++) {
        var g = C[list[k].name];
        var v3 = toXYZ(g[0], g[1], rot, tilt);
        if (v3[2] < 0.02) continue;                       // 가장자리 너머는 생략
        var cnt = +list[k].count || 0;
        var r = 3.5 + Math.sqrt(cnt / max) * (R * 0.055);
        mk.push({ x: cx + v3[0] * R, y: cy - v3[1] * R, r: r, z: v3[2],
                  label: g[2] + ' · ' + cnt.toLocaleString('ko-KR') + '회' });
      }
      mk.sort(function (a, b) { return a.z - b.z; });     // 뒤쪽부터 그려 겹침 자연스럽게
      for (var m = 0; m < mk.length; m++) {
        var d = mk[m];
        var halo = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3.4);
        halo.addColorStop(0, 'rgba(90,190,255,0.42)');
        halo.addColorStop(1, 'rgba(90,190,255,0)');
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 3.4, 0, 6.2832);
        ctx.fillStyle = halo; ctx.fill();

        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832);
        var gd = ctx.createRadialGradient(d.x - d.r * 0.4, d.y - d.r * 0.4, 0, d.x, d.y, d.r);
        gd.addColorStop(0, '#bfe6ff'); gd.addColorStop(1, '#1f7fe0');
        ctx.fillStyle = gd; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.1; ctx.stroke();

        if (pointer.on && Math.hypot(pointer.x - d.x, pointer.y - d.y) <= d.r + 7) hot = d;
      }

      // --- 대기광(구 바깥쪽 얇은 빛)
      var atm = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.13);
      atm.addColorStop(0, 'rgba(80,170,255,0.20)');
      atm.addColorStop(1, 'rgba(80,170,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.13, 0, 6.2832);
      ctx.fillStyle = atm; ctx.fill();

      // --- 툴팁
      if (hot) {
        tip.textContent = hot.label;
        tip.style.display = 'block';
        tip.style.left = Math.round(hot.x) + 'px';
        tip.style.top = Math.round(hot.y - hot.r - 10) + 'px';
      } else {
        tip.style.display = 'none';
      }
      cv.style.cursor = dragging ? 'grabbing' : (hot ? 'pointer' : 'grab');
    }

    var raf = 0, alive = true;

    function frame() {
      if (!alive) return;
      if (auto && !dragging) rot += vel;
      draw();
      raf = requestAnimationFrame(frame);
    }

    // --- 드래그로 직접 돌리기
    function down(e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
    }
    function move(e) {
      var b = cv.getBoundingClientRect();
      pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.on = true;
      if (!dragging) return;
      rot += (e.clientX - lastX) * 0.006;
      // 기울기는 극이 뒤집히지 않게 제한
      tilt = Math.max(-1.1, Math.min(1.1, tilt + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    }
    function up() { dragging = false; }
    function leave() { pointer.on = false; dragging = false; }

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', leave);

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { resize(); });
      ro.observe(el);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();
    frame();

    return {
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        cv.removeEventListener('pointerdown', down);
        cv.removeEventListener('pointermove', move);
        cv.removeEventListener('pointerup', up);
        cv.removeEventListener('pointercancel', up);
        cv.removeEventListener('pointerleave', leave);
        el.innerHTML = '';
      }
    };
  };
})();
