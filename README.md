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
  assets/          og-image.png, favicon.svg
design-src/        디자인 원본·의뢰서
  DESIGN-BRIEF.md              홈페이지 재디자인 의뢰서
  DESIGN-BRIEF-brand-assets.md 브랜드 자산(개발자 아이콘/헤더) 의뢰서 ← 진행중
  _incoming/                   디자인팀 시안 원본(.dc.html)
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

## 디자인 토큰 (시안 확정본)

- 배경 #0b0c0e / surface #0c0d10 / 악센트 #c69a6b·#d8b489 (뮤트 앰버) / 라이브 #7fb89a
- 폰트: Pretendard(본문) + Instrument Serif 이탤릭(악센트) + JetBrains Mono(라벨)
- 로고: 이퀄라이저 3바 SVG (viewBox 0 0 34 34), 이모지 🎙️ 폐기

## 진행 상태 / 다음 할 일

- ✅ 홈페이지 6페이지 라이브 (rnrsoft.vip)
- ✅ 구글 플레이 개발자 계정 신원확인 통과 (2026-07-15)
- 🔄 **디자인팀에 브랜드 자산 의뢰 중** — 개발자 아이콘 512×512, 헤더 4096×2304
  → 시안 받으면 `public/assets/`에 넣고 재배포 + Play Console 업로드
  → 의뢰서: `design-src/DESIGN-BRIEF-brand-assets.md`
- ⏳ P-079 받아쓰기 노트 TWA 패키징 (별도 세션, JDK+Android Studio 필요)

## 관련

- 첫 출시 앱: 받아쓰기 노트 (note.rnrsoft.vip)
- 앱화 표준: Capacitor (수익형 앱), 도커 불필요
- 개인정보/약관 URL은 모든 앱 스토어 등록에 재사용: rnrsoft.vip/privacy, /terms

> ⚠️ 이 repo는 P-080 배포본. 전체 AiProject 저장소는 대용량 파일(torch/ffmpeg/mp4)로 GitHub push 불가라 별도 관리.
