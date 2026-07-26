# rnrsoft 개발자 홈페이지 (P-080)

`https://rnrsoft.vip` — rnrsoft 앱 스튜디오 공식 홈페이지. Cloudflare Pages 배포.

## 구조

```
public/            ← 배포 대상 (Cloudflare Pages)
  index.html       홈 (1화면 + 공지 티커 + 사운드 토이)
  apps.html        앱 진열
  about.html       소개
  contact.html     문의
  privacy.html     개인정보처리방침
  terms.html       이용약관
  lang.js          공통 KO/EN 토글 + 헤더 스크롤 블러
  brand.css        공통 브랜드 토큰(CSS 변수)·애니메이션·모바일
  assets/          mark-72(헤더 로고) · tile-navy-160(앱 타일)
                   icon-32/192(파비콘) · fav-180(apple-touch) · og-image
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

## 디자인 토큰 (2026-07-27 블루 리브랜드 — 현행)

브랜드명 **RnR soft** · 태그라인 "Connecting Ideas, Delivering Future"

- 배경 `#0d1524` / surface `#0f1828` / footer `#0a1120`
- 악센트 `#1f5be0`(주) · `#2b86f5`(밝은) · `#38c8f0`(하이라이트) / 링크 `#6fb4ff`
- 로고 그라디언트 `#173a86 → #1f7ccb → #2fd3e6` (logo-vec.svg stop과 동일)
- 라이브 배지 `#6fe0b4` / 점 `#4fd39c`
- 폰트: Pretendard(본문) + JetBrains Mono(라벨). **Instrument Serif 폐기**
  (한글에 이탤릭 세리프가 적용되지 않아 헤드라인 2번째 줄은 블루 그라디언트 텍스트로 대체)
- 로고: 파란 리본형 RnR 마크. **옛 앰버 이퀄라이저 3바 SVG 폐기**
- 전 페이지 공통 토큰은 `public/brand.css`의 CSS 변수로 관리 — 색 변경은 여기 한 곳만

> ⚠️ `design-src/_incoming/design_handoff_rnrsoft_site/README.md`는 **옛 앰버 시안** 기준 문서다.
> 색·로고·폰트는 위 블루 토큰이 최신이며, 그 README의 레이아웃·카피·인터랙션 스펙만 유효하다.

## 진행 상태 / 다음 할 일

- ✅ 홈페이지 6페이지 라이브 (rnrsoft.vip)
- ✅ 구글 플레이 개발자 계정 신원확인 통과 (2026-07-15)
- ✅ **브랜드 자산 수령 + 블루 리브랜드 전면 적용 (2026-07-27)**
  전 6페이지 색·로고·파비콘·OG 교체, 에셋 4MB → 164KB 최적화
- ⏳ 앱 스크린샷 삽입 (apps.html 플레이스홀더 자리)
- ⏳ Play Console에 새 브랜드 아이콘 업로드 (icon-512 원본은 design-src에 보관)
- ⏳ 히어로 방향안 선택 — `design-src/2026-07-27_brand-rnr-blue/rnrsoft Hero Directions.dc.html`
  (디자인팀이 "골라주세요"로 남긴 미결 사항: 은은한 기울기 vs 뚜렷한 아이소)
- ⏳ P-079 받아쓰기 노트 TWA 패키징 (별도 세션, JDK+Android Studio 필요)

## 관련

- 첫 출시 앱: 받아쓰기 노트 (note.rnrsoft.vip)
- 앱화 표준: Capacitor (수익형 앱), 도커 불필요
- 개인정보/약관 URL은 모든 앱 스토어 등록에 재사용: rnrsoft.vip/privacy, /terms

> ⚠️ 이 repo는 P-080 배포본. 전체 AiProject 저장소는 대용량 파일(torch/ffmpeg/mp4)로 GitHub push 불가라 별도 관리.
