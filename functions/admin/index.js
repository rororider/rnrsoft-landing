/* /admin 게이트 — 로그인 안 됐으면 대시보드 HTML을 아예 내려주지 않는다.
   (클라이언트에서 숨기는 방식은 소스만 봐도 뚫리므로 서버에서 차단) */
import { getSession } from '../_auth.js';

const LOGIN_HTML = (mode) => `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>관리자 — RnR soft</title>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/fav-32.png">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="/brand.css">
<style>
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{width:100%;max-width:400px;background:#141f33;border:1px solid rgba(255,255,255,0.1);
        border-radius:20px;padding:36px 32px;box-shadow:0 20px 60px -24px rgba(0,0,0,.6);animation:rs-rise .5s ease both}
  label{display:block;font-size:12.5px;color:#98a4b6;margin:16px 0 7px;font-weight:500}
  input{width:100%;padding:12px 14px;border-radius:10px;background:#0b1220;color:#eef2f8;
        border:1px solid rgba(255,255,255,0.14);font-size:15px;font-family:inherit}
  input:focus{outline:none;border-color:#2b86f5;box-shadow:0 0 0 3px rgba(43,134,245,.18)}
  button{width:100%;margin-top:22px;padding:13px;border:none;border-radius:11px;cursor:pointer;
         background:linear-gradient(96deg,#1f56dc,#2b86f5);color:#fff;font-size:15px;font-weight:600;font-family:inherit}
  button:disabled{opacity:.6;cursor:not-allowed}
  .err{margin-top:14px;padding:11px 13px;border-radius:9px;background:rgba(220,60,60,.14);
       border:1px solid rgba(220,60,60,.34);color:#ff9b9b;font-size:13px;display:none}
  .hint{margin-top:14px;font-size:12px;color:#7f8b9d;line-height:1.65}
</style></head>
<body>
<div class="card">
  <a href="/" style="display:flex;align-items:flex-end;gap:10px;margin-bottom:26px">
    <img src="/assets/mark.png" alt="" style="height:34px;width:auto;display:block">
    <span style="font-family:'Poppins',sans-serif;font-size:19px;font-weight:600;color:#f2f6fc;line-height:1">RnR <span style="font-weight:300;color:#38c8f0">soft</span></span>
  </a>
  <h1 style="margin:0;font-size:20px;font-weight:600;color:#f2f6fc;letter-spacing:-.02em">${mode === 'setup' ? '관리자 계정 만들기' : '관리자 로그인'}</h1>
  <p style="margin:8px 0 0;font-size:13.5px;color:#98a4b6;line-height:1.6">${mode === 'setup'
    ? '최초 1회만 진행합니다. 비밀번호는 서버에 해시로만 저장됩니다.'
    : '방문자 통계를 보려면 로그인하세요.'}</p>

  <form id="f" autocomplete="off">
    ${mode === 'setup' ? `<label for="tk">설정 토큰</label>
    <input id="tk" type="password" required autocomplete="off" placeholder="배포 시 발급된 토큰">` : ''}
    <label for="u">이메일</label>
    <input id="u" type="email" required autocomplete="username" inputmode="email"
           autocapitalize="off" spellcheck="false" placeholder="name@example.com">
    <label for="p">비밀번호</label>
    <input id="p" type="password" required autocomplete="${mode === 'setup' ? 'new-password' : 'current-password'}" ${mode === 'setup' ? 'placeholder="12자 이상, 3종류 이상 조합"' : ''}>
    <button type="submit" id="b">${mode === 'setup' ? '계정 만들기' : '로그인'}</button>
    <div class="err" id="e"></div>
  </form>
  ${mode === 'setup' ? '<div class="hint">토큰은 Cloudflare 환경변수 SETUP_TOKEN 값입니다. 계정 생성 후에는 이 화면이 사라집니다.</div>' : ''}
</div>
<script>
document.getElementById('f').addEventListener('submit', async function(ev){
  ev.preventDefault();
  var b=document.getElementById('b'), e=document.getElementById('e');
  b.disabled=true; e.style.display='none';
  var payload={ username:document.getElementById('u').value, password:document.getElementById('p').value };
  var tk=document.getElementById('tk'); if(tk) payload.token=tk.value;
  try{
    var r=await fetch('/api/admin/${mode === 'setup' ? 'setup' : 'login'}',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload), credentials:'same-origin'});
    var j=await r.json();
    if(j.ok){ location.href='/admin'; return; }
    e.textContent=j.error||'실패했습니다.'; e.style.display='block';
  }catch(err){ e.textContent='네트워크 오류'; e.style.display='block'; }
  b.disabled=false;
});
</script>
</body></html>`;

export async function onRequestGet({ request, env, next }) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
                    'X-Robots-Tag': 'noindex, nofollow' };

  if (!env.ANALYTICS) return new Response('KV 미바인딩', { status: 500, headers });

  const sess = await getSession(env, request);
  if (sess) return next();   // 로그인됨 -> 정적 대시보드(admin/index.html) 서빙

  // 관리자 계정이 아직 없으면 최초 설정 화면, 있으면 로그인 화면
  const created = await env.ANALYTICS.get('meta:admin_created');
  return new Response(LOGIN_HTML(created ? 'login' : 'setup'), { headers });
}
