/* 배포 전 실행 — JS/CSS 참조에 내용 해시를 붙여 브라우저 캐시를 자동 무효화.
   Cloudflare Pages가 정적 에셋 Cache-Control(max-age=14400)을 강제하므로
   _headers로는 못 막고, 참조 URL을 바꾸는 방식이 확실하다.
   사용법: node _bump.cjs  (배포 직전) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUB = path.join(__dirname, 'public');
// 루트 파일 + 하위 폴더 파일 모두. 새 JS/CSS를 추가하면 여기에도 등록해야
// Cloudflare Pages의 4시간 캐시를 뚫는다 (미등록 시 옛 파일이 계속 서빙됨)
const TARGETS = ['pointer.js', 'analytics.js', 'lang.js', 'brand.css', 'media/note-media.js'];

const hashOf = (f) => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(PUB, f)))
  .digest('hex').slice(0, 8);

const ver = {};
for (const t of TARGETS) {
  if (fs.existsSync(path.join(PUB, t))) ver[t] = hashOf(t);
}

const pages = [];
for (const f of fs.readdirSync(PUB)) {
  if (f.endsWith('.html')) pages.push(f);
}
// 하위 폴더 페이지도 대상에 포함 (새 페이지를 만들면 여기에 등록)
for (const sub of ['admin/index.html', 'admin/check.html', 'apps/note.html']) {
  if (fs.existsSync(path.join(PUB, sub))) pages.push(sub);
}

let changed = 0;
for (const p of pages) {
  const fp = path.join(PUB, p);
  let s = fs.readFileSync(fp, 'utf8');
  const before = s;

  for (const [file, v] of Object.entries(ver)) {
    const esc = file.replace(/\./g, '\\.');
    // "/pointer.js" 또는 "/pointer.js?v=abc12345" -> "/pointer.js?v=<새해시>"
    const re = new RegExp('(["\'])\\/' + esc + '(\\?v=[a-f0-9]+)?\\1', 'g');
    s = s.replace(re, '$1/' + file + '?v=' + v + '$1');
  }

  if (s !== before) {
    fs.writeFileSync(fp, s, 'utf8');
    changed++;
  }
}

console.log('버전 해시:', Object.entries(ver).map(([k, v]) => k + '=' + v).join(' '));
console.log('갱신된 페이지:', changed, '/', pages.length);
