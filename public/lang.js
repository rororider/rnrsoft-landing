/* rnrsoft — 공통 언어 토글 (KO/EN) + 헤더 스크롤 블러
   data-en 속성이 있는 요소를 KO↔EN 스왑. localStorage로 페이지 간 유지. */
(function () {
  var KEY = 'rnr-lang';
  function getLang() { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }
  function apply(lang) {
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (!el.dataset.ko) el.dataset.ko = el.innerHTML;
      el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.ko;
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-langlabel]').forEach(function (b) {
      b.textContent = lang === 'ko' ? 'EN' : '한국어';
    });
    window.__rnrLang = lang;
    if (typeof window.__rnrOnLang === 'function') window.__rnrOnLang(lang);
  }
  window.rnrToggleLang = function () {
    var next = getLang() === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
  };
  // 초기 적용
  window.__rnrLang = getLang();
  document.addEventListener('DOMContentLoaded', function () {
    apply(getLang());
    // 헤더 스크롤 블러 (sticky 헤더 페이지)
    var hdr = document.querySelector('[data-scroll-header]');
    if (hdr) {
      var onScroll = function () {
        if (window.scrollY > 24) {
          hdr.style.background = 'rgba(11,12,14,0.78)';
          hdr.style.backdropFilter = 'blur(14px)';
          hdr.style.webkitBackdropFilter = 'blur(14px)';
          hdr.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
        } else {
          hdr.style.background = 'transparent';
          hdr.style.backdropFilter = 'none';
          hdr.style.webkitBackdropFilter = 'none';
          hdr.style.borderBottom = '1px solid transparent';
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  });
})();
