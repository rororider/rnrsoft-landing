# rnrsoft 개발자 홈페이지 (P-080)

`https://rnrsoft.vip` — rnrsoft 앱 스튜디오 공식 홈페이지. Cloudflare Pages 배포.

## 구조

```
public/            ← 배포 대상 (Cloudflare Pages)
  index.html       홈 (1화면 + 매트릭스 레인 + flow 빔 + 공지 티커)
  apps.html        앱 진열
  about.html       소개
  contact.html     문의
  privacy.html     개인정보처리방침
  terms.html       이용약관
  lang.js          공통 KO/EN 토글 + 헤더 스크롤 블러
  brand.css        공통 브랜드 토큰(CSS 변수) + rs-* 애니메이션 + 반응형
  assets/          mark(헤더 로고) · mark-white(푸터) · app-note(받아쓰기 앱)
                   fav-16/32/180/192(파비콘) · og-image
design-src/        디자인 원본·의뢰서
  DESIGN-BRIEF.md              홈페이지 재디자인 의뢰서
  DESIGN-BRIEF-brand-assets.md 브랜드 자산(개발자 아이콘/헤더) 의뢰서
  _incoming/                   디자인팀 시안 원본(.dc.html)
  2026-07-27_brand-rnr-blue/   ★ 확정 브랜드 원본(전 에셋 + logo/명함/히어로 탐색안)
```

## 젠북에서 이어작업 시작

```bash
git clone https://github.com/rororider/rnrsoft-landing.git
cd rnrsoft-landing
```

## 배포 방법

```bash
# Cloudflare 로그인 (젠북에서 최초 1회 — 브라우저 OAuth)
npx wrangler login          # 계정: madrex1090@gmail.com

# 배포
npx wrangler pages deploy public --project-name=rnrsoft-landing --branch=main --commit-dirty=true
```

- Pages 프로젝트명: **rnrsoft-landing** (계정 madrex1090@gmail.com, account id c39e6cf45019de85f5264d41fcbe27cc)
- 커스텀 도메인 rnrsoft.vip 연결됨 (루트 CNAME → rnrsoft-landing.pages.dev)

### ⚠️ 배포 시 캐시 무효화 (필수)

Cloudflare Pages는 정적 에셋에 `Cache-Control: max-age=14400`(4시간)을 강제한다.
`_headers`로 덮으려 해도 무시되므로, **JS/CSS를 수정했으면 배포 전에 반드시** 실행:

```bash
node _bump.cjs   # JS/CSS 참조에 내용 해시(?v=xxxxxxxx) 부착
npx wrangler pages deploy public --project-name=rnrsoft-landing --branch=main --commit-dirty=true
```

안 하면 방문자가 강력 새로고침(Ctrl+Shift+R)을 해야 변경이 보인다.

## 디자인 토큰 (2026-07-27 현행 — 디자인팀 최종 시안 기준)

브랜드명 **RnR soft** · 태그라인 "Connecting Ideas, Delivering Future"

- 배경 `#0b1220` / surface `#141f33` / footer `#070e1a`
- 악센트 `#2b86f5`(주) · `#1f56dc`(딥) · `#38c8f0`(하이라이트) / 링크 `#5aa9ff` → hover `#7fc4ff`
- 그라디언트(헤드라인·버튼·CTA) `linear-gradient(96deg,#1f56dc,#2b86f5 55%,#38c8f0)`
- 폰트: **Poppins**(워드마크·라벨·숫자) + Pretendard(본문) + JetBrains Mono(모노 뱃지)
- 애니메이션 `rs-*` 6종: rise / drift / dash(빔) / tick(티커) / scan(스캔라인) / flick
- 매트릭스 레인은 `index.html` 인라인 `startRain()` (canvas, opacity 0.3)
- 전 페이지 공통 토큰은 `public/brand.css` — 색 변경은 여기 한 곳만

### 파비콘 (2026-07-27 재제작)

디자인팀 원본 아이콘 2종(흰 타일 `icon-*`, 네이비 타일 `fav-*`) **모두 탭 16px에서
RnR 판독 불가**였음 — 마크가 타일의 55%로 작고, 파란 마크 x 네이비 배경 대비 부족.

배포본은 `mark.png`(원본 마크)를 재조합해 생성:

- 마크를 타일의 **90%**까지 확대 + **흰색 실루엣**으로 반전 (대비 확보)
- 배경 그라디언트 `#14284d → #1f56dc` (딥네이비→브랜드블루)
- 16 / 32 / 48 / 180 / 192 / 512 생성, `rx`는 크기의 약 20%
- 로고 **형태는 원본 그대로** — 크기·색만 조정 (브랜드 가이드 형태 변경 금지 준수)

원본 아이콘 세트는 `design-src/2026-07-27_brand-rnr-blue/assets/`에 보존.

### 앱 아이콘 (진열되는 앱마다 자기 아이콘)

⚠️ 시안은 앱 카드 자리에도 **회사 마크(`tile-navy.png`)** 를 넣어놨지만, 그건
디자인팀이 앱 아이콘을 안 갖고 있어서 임시로 채운 것이다. **진열대이므로 앱마다
자기 아이콘이 들어가야 한다.**

- 받아쓰기 노트 → `app-note.png` — note.rnrsoft.vip의 `manifest.json`이 가리키는
  `icons/icon-512.png`를 받아 160px로 리사이즈 (마이크+노트 라인, 차콜 배경 + 레드 악센트)
- 사용처 3곳: `index.html`(44px) · `apps.html`(76px) · `contact.html`(48px)
- 새 앱을 진열할 때도 같은 방식 — 그 앱 manifest에서 아이콘을 받아 `app-<이름>.png`로 저장

> ⚠️ **디자인팀 ZIP은 폴더마다 세대가 다르다.** ZIP 루트 `*.dc.html`이 최종본이고,
> `design_handoff_rnrsoft_site/design/`은 구버전(앰버 시대)이다. 새 ZIP을 받으면
> `diff`로 루트 vs 하위폴더를 먼저 비교할 것. `rnrsoft Hero Directions.dc.html`은
> 탐색 기록(Turn 3~8, "골라주세요"로 끝남)이지 배포 대상이 아니다.

## 앱 상세 페이지 · 미디어 갤러리

앱마다 스크린샷·GIF·유튜브 영상을 보여주는 전용 페이지. 현재 `/apps/note` 1개.

**미디어를 추가할 때 HTML은 건드리지 않는다.** `public/media/note-media.js` 한 파일만 고친다:

1. `note.rnrsoft.vip` 로그인 → 화면 캡처
2. 이미지를 `public/media/img/` 에 넣기
3. `note-media.js` 의 `shots` 배열에 `{ src, alt, caption }` 추가하고,
   그 자리의 `{ placeholder: true, ... }` 줄은 삭제
4. 유튜브는 `youtube: '영상ID'` (URL 전체가 아니라 ID만). `null`이면 영상 섹션이 통째로 숨겨진다
5. `node _bump.cjs` 후 배포

규격: 스크린샷 세로 폰 비율(9:19.5) 폭 720px 이상 / GIF 폭 480~720px · 8초 이내 · 5MB 이하

> ⚠️ **`public/apps/` 안에 `.js`나 이미지를 두지 말 것.** `apps.html`과 이름이 겹쳐
> `/apps/xxx.js` 요청이 홈 HTML로 폴백된다(실측). 그래서 미디어는 `public/media/` 에 둔다.

유튜브는 클릭 전까지 썸네일만 로드하고(`youtube-nocookie`), 스크린샷은 클릭 시 라이트박스로 확대된다.

## 가상 사옥(hq.rnrsoft.vip) SSO

홈페이지 관리자 세션 → 사옥 자동 로그인. 비밀번호 재입력 없음.

| 구성 | 위치 |
|---|---|
| 진입 | 대시보드 "가상 사옥 관제" 버튼 → `GET /api/admin/hq-sso` |
| 티켓 | KV `hqsso:<ticket>` · 1회용 · 60초 TTL · base64url 24바이트 |
| 검증 | 사옥이 `POST /api/admin/hq-verify` 호출 → 소모 후 사용자 반환 |
| 사옥 코드 | `Project-080-DEV-Virtual_Company_Ops/server/server.js` (`/sso` 핸들러) |
| 실서버 | Flip4 `~/aiproject/download/project080-hq/` (PM2 `p080-hq`) · PC는 5080 |

### 상호 인증 (2026-07-30 활성화)

`hq-verify`는 원래 무인증 공개 엔드포인트였으므로 두 겹으로 보호한다:

- **공유 비밀** — 사옥이 `X-HQ-Secret` 헤더로 신원을 증명.
  홈페이지는 KV `meta:hq_shared_secret`, 사옥은 `data/hq-shared-secret.txt` (양쪽 동일 값).
  상수시간 비교하며, 누락·불일치 시 403.
- **rate limit** — IP당 5분 30회. 무작위 티켓 대입 차단.

> ⚠️ 비밀을 교체할 때는 **사옥 파일 → 사옥 재시작 → KV** 순서로 한다.
> 사옥 서버는 시작 시 파일을 1회만 읽으므로, KV를 먼저 바꾸면 재시작 전까지 403으로 막힌다.

검증 (값을 출력하지 않는 방법):

```bash
# 헤더 없이 호출 -> 403 이어야 정상 (상호 인증이 켜져 있다는 뜻)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://rnrsoft.vip/api/admin/hq-verify \
  -H "Content-Type: application/json" -d '{"ticket":"aaaaaaaaaaaaaaaaaaaaaaaa"}'

# 사옥 서버에서 실행 -> 401 이어야 정상 (인증 통과, 가짜 티켓만 거부)
# 403이 나오면 비밀 불일치 또는 사옥 재시작 누락
```

## 진행 상태 / 다음 할 일

- ✅ 홈페이지 6페이지 라이브 (rnrsoft.vip)
- ✅ 구글 플레이 개발자 계정 신원확인 통과 (2026-07-15)
- ✅ **디자인팀 최종 시안 6페이지 전면 반영 (2026-07-27)**
  매트릭스 레인 · 스캔라인 · flow-line 빔 · 티커 · Poppins 락업까지 시안과 대조 검증 완료
- ✅ 파비콘 재제작 (탭 16px 판독성 확보, 딥네이비 배경 + 흰 마크)
- ⏳ 앱 스크린샷 삽입 (apps.html `.rs-shot` 플레이스홀더 자리)
- ⏳ Play Console에 새 브랜드 아이콘 업로드 (`fav-512.png` 또는 원본 `icon-512.png`)
- ⏳ P-079 받아쓰기 노트 TWA 패키징 (별도 세션, JDK+Android Studio 필요)

## 관련

- 첫 출시 앱: 받아쓰기 노트 (note.rnrsoft.vip)
- 앱화 표준: Capacitor (수익형 앱), 도커 불필요
- 개인정보/약관 URL은 모든 앱 스토어 등록에 재사용: rnrsoft.vip/privacy, /terms

> ⚠️ 이 repo는 P-080 배포본. 전체 AiProject 저장소는 대용량 파일(torch/ffmpeg/mp4)로 GitHub push 불가라 별도 관리.
