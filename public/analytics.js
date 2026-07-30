/* 방문 집계 — 개인정보 미수집(경로·리퍼러 호스트만 전송) */
(function () {
  try {
    if (location.pathname.indexOf('/admin') === 0) return;   // 관리자 페이지는 집계 제외
    if (navigator.webdriver) return;                          // 자동화 브라우저 제외
    var send = function () {
      fetch('/api/hit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: location.pathname, r: document.referrer || '' }),
        keepalive: true,
      }).catch(function () {});
    };
    if (document.readyState === 'complete') send();
    else window.addEventListener('load', send, { once: true });
  } catch (e) {}
})();
