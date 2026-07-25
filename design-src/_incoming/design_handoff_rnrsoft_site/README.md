# Handoff: rnrsoft — App Studio 홈페이지

## Overview
rnrsoft(소문자 워드마크)는 생산성·학습 앱을 만드는 스튜디오입니다. 이 디자인은 스튜디오 공식 홈페이지로, 방문자(사용자·구글 심사자·잠재 협업자)에게 "감각 있는 개발자"라는 신뢰를 주고 앱을 진열하는 것이 목표입니다. 정적 사이트로 Cloudflare Pages에 배포됩니다.

구성 페이지: **홈(1화면 고정)**, **앱**, **소개**, **문의**, **개인정보처리방침**, **이용약관**, 그리고 **브랜드 가이드**.

## About the Design Files
이 번들의 `design/*.dc.html` 파일들은 **HTML로 제작한 디자인 레퍼런스(프로토타입)** 입니다 — 의도한 룩앤필과 동작을 보여주는 것이지, 그대로 배포할 프로덕션 코드가 아닙니다. `.dc.html`은 이 도구의 내부 컴포넌트 포맷이므로, **대상 코드베이스 환경에서 다시 구현**해야 합니다.

목표 배포는 **정적 사이트(HTML/CSS + 최소 JS)** 이므로, 별도 프레임워크 없이 순수 HTML/CSS/JS로 옮기는 것을 권장합니다(원한다면 Astro/11ty 등 정적 사이트 생성기도 무방). 파일명은 배포 시 `index.html`, `apps.html`, `about.html`, `contact.html`, `privacy.html`, `terms.html`로 하고, 페이지 간 링크(`*.dc.html` → `*.html`)를 맞추세요.

각 `.dc.html`은 `<x-dc>` 안의 마크업(템플릿)과 `class Component` 로직(JS)으로 나뉘어 있습니다. 인라인 스타일이 곧 스펙입니다. 로직 클래스의 메서드(언어 토글, 스크롤 블러, 티커, 사운드 토이)는 아래 "Interactions & Behavior"대로 바닐라 JS로 재구현하면 됩니다.

## Fidelity
**High-fidelity (hifi)** — 최종 색·타이포·간격·모션까지 확정된 시안입니다. 아래 디자인 토큰과 각 페이지 스펙 그대로 픽셀 단위로 재현하세요.

## Design Tokens

### Colors
- `--bg` 페이지 배경: `#0b0c0e`
- `--surface` 섹션/카드 배경: `#0c0d10`
- `--surface-2` 푸터/티커: `#08090b`
- `--card` 카드 채움: `rgba(255,255,255,0.025)` / dashed 카드 `rgba(255,255,255,0.015)`
- `--border` 기본 보더: `rgba(255,255,255,0.08)` (헤어라인 0.07)
- `--accent` 주 악센트: `#c69a6b` (뮤트 앰버)
- `--accent-lt` 밝은 악센트/링크: `#d8b489` · 링크 hover `#e7c9a6`
- `--accent-btn` 주 버튼 배경: `#e7ceb0`, 텍스트 `#1c150c`
- 앱 아이콘 그라디언트: `linear-gradient(155deg,#d8b489,#b98a55)`, 아이콘 내부 글리프 `#221a10`
- `--live` 상태 배지(서비스 중): 텍스트 `#8fc7ab`, 점 `#7fb89a`, 배경 `rgba(127,184,154,0.14)`
- 텍스트: 헤딩 `#f3f4f6`, 기본 `#eceef1`, 본문 `#9498a1`, 보조 `#a1a5ae`, 흐림 `#7d818a`, 더 흐림 `#565a63`, 메뉴 `#c8ccd3`
- 선택 영역: `rgba(198,154,107,0.28)`

### Typography
- 본문/헤드라인: **Pretendard** (웹폰트 CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`). 본문에 `letter-spacing:-0.011em`.
- 악센트(영문 이탤릭): **Instrument Serif** (Google Fonts), `font-style:italic; font-weight:400`. 히어로 2번째 줄, 페이지 헤드라인 2번째 줄에만 사용.
- 라벨/메타/코드: **JetBrains Mono** (Google Fonts). eyebrow는 `font-size:12px; letter-spacing:0.14~0.15em; text-transform:uppercase; color:#8a8e97`.
- 히어로 h1: `clamp(34px,5.6vw,60px)`, `font-weight:600`, `line-height:1.07`, `letter-spacing:-0.04em`.
- 섹션 h2/페이지 h1: `clamp(27~30px,4~4.6vw,38~54px)`, `font-weight:600`, `letter-spacing:-0.035~-0.04em`.
- 본문 p: 15~17px, `line-height:1.7~1.75`.

### Radius / Shadow / Spacing
- Radius: 버튼 10px · 카드 16~18px · 아이콘 타일 18~24px · 로고 심볼 rx 10(34뷰박스) · 배지/태그 6px · pill 999px.
- 컨테이너 max-width: 1120px(홈/앱/소개/문의) · 820px(약관/개인정보 문서). 좌우 패딩 32px.
- 카드 그림자(앱 아이콘): `0 16px 34px -14px rgba(185,138,85,0.6)`.
- 도크 패널 그림자: `0 40px 90px -34px rgba(0,0,0,0.8)`, 배경 `rgba(255,255,255,0.045)`, 보더 `rgba(255,255,255,0.09)`, `backdrop-filter:blur(16px)`.

## Logo / Brand Mark
- 심볼: **둥근 사각(앱 타일) + 이퀄라이저 3바**. viewBox `0 0 34 34`.
  - 아웃라인형(헤더/푸터): `<rect x="1" y="1" width="32" height="32" rx="10" fill="none" stroke="#c69a6b" stroke-width="1.4"/>` + 3바 `fill="#d8b489"`.
  - 채움형(앱 아이콘): 라운드 사각 배경 amber 그라디언트 + 3바 `fill="#221a10"`.
  - 3바 좌표(공통): `rect x=9.5 y=13 w=3 h=8 rx=1.5` · `x=15.5 y=9 w=3 h=16 rx=1.5` · `x=21.5 y=11.5 w=3 h=11 rx=1.5`.
- 워드마크: `rnrsoft` 소문자, `font-weight:600`, `letter-spacing:-0.02~-0.03em`.
- 이모지 로고(🎙️)는 폐기, 위 SVG 마크로 대체 확정.

## Screens / Views

### 1) 홈 (index) — **한 화면 고정(스크롤 없음)**
- **Purpose**: 첫인상·신뢰. 스튜디오 한 줄 소개 + 앱 진열 진입.
- **Layout**: 최상위 `height:100vh; display:flex; flex-direction:column; overflow:hidden`, `body{overflow:hidden}`. 위에서부터 헤더 → main(flex:1, 중앙정렬) → 하단 공지 티커(고정 높이 52px).
- **Header**(투명, 스크롤 시 블러 아님 — 홈은 스크롤이 없음): 좌 로고+`rnrsoft`, 우 네비 `앱`(apps) `소개`(about) `문의`(contact) + 언어 토글 버튼(`EN`/`한국어`).
- **Hero(중앙)**: eyebrow(`App Studio · rnrsoft.vip`, 앞에 5px 앰버 점) → h1 2줄(1줄 Pretendard, 2줄 Instrument Serif 이탤릭) → 본문 p(max 440px) → 버튼 2개(주: `앱 보기`→apps.html, 보조 아웃라인: `스튜디오`→about.html). 버튼은 `white-space:nowrap; flex:0 0 auto` 필수.
- **Compact dock**: `perspective(1500px) rotateX(12deg)` 기울인 도크. 라이브 앱 아이콘(78px, amber, `note.rnrsoft.vip` 링크, `y축 float` 애니메이션) + 준비중 dashed 타일 2개. **세로 760px 이하 뷰포트에서는 `display:none`(미디어쿼리)** — 짧은 화면에서 티커에 안 잘리도록.
- **배경 장식**: 좌상/우하 앰버·블루 블러 원(drift 애니메이션), 하단 원근 그리드(`perspective(760px) rotateX(62deg)`, 위쪽 페이드 마스크).
- 카피(KO): h1 "생각을 정리하는 / 도구를 만듭니다" · 본문 "웹과 모바일에서 쓰는 작고 분명한 앱을 만드는 스튜디오. 지금 한 개를 운영하고, 다음을 준비하는 중입니다."
- 카피(EN): "Software for / thinking & learning." · "A studio building small, focused apps for the web and mobile. One is in service now — the next is on the way."

### 2) 앱 (apps)
- **Purpose**: 앱 진열대. 앱이 늘어도 유지되는 카드 시스템.
- **Layout**: sticky 블러 헤더 → 섹션(max 1120px, 패딩 104/32/100) → 푸터. 세로로 자연 스크롤.
- **헤더 소개**: eyebrow `Apps`, h1 "지금 만드는 것", 본문.
- **라이브 앱 카드**(가로 flex, `note.rnrsoft.vip` 링크, hover 시 보더/배경 앰버로): 좌 70px amber 아이콘 → 중앙(이름 `받아쓰기 노트` + 상태 배지 `서비스 중` + 설명 + 기능 태그 4개[`음성 받아쓰기`/`AI 정리`/`학습카드`/`4개 언어`] + `note.rnrsoft.vip ↗`) → 우 176px **스크린샷 플레이스홀더**(dashed, "스크린샷 자리(추후 삽입)"). hover: `border-color:rgba(216,180,137,0.4); background:rgba(216,180,137,0.05)`.
- **준비 중 슬롯**: dashed 카드 2개(52px 빈 타일 + "새 앱 / 준비 중"). 그리드 `repeat(auto-fit,minmax(280px,1fr))` — 앱 추가 시 카드만 늘리면 됨.
- 라이브 앱 설명(KO): "말하면 자동으로 받아적히는 음성 메모·학습 노트. AI가 내용을 정리하고 질문을 만들며 학습카드로 바꿔줍니다. 4개 언어 지원." (EN 문구는 파일 `data-en` 참조.)

### 3) 소개 (about)
- **Layout**: sticky 헤더 → intro(max 820px: eyebrow `About`, h1 2줄["거창한 미션은 없습니다." / 이탤릭 "앱을, 정성껏 만들 뿐."], 본문) → 4블록 그리드(1px gap로 구분선 효과, `repeat(auto-fit,minmax(232px,1fr))`) → CTA 배너(문의 유도) → 푸터.
- **4블록**: 01 무엇을 만드나 / 02 개인정보 존중 / 03 기술(웹·PWA·AI) / 04 플랫폼(웹·모바일·Google Play). 각 블록 번호는 mono 앰버.

### 4) 문의 (contact)
- **Layout**: sticky 헤더 → 섹션(max 820px): eyebrow `Contact`, h1 "편하게 연락 주세요.", 본문 → 카드 2개(가로 flex): (1) **이메일** 카드 `mailto:contact@rnrsoft.vip`(앰버 톤, hover 강조), (2) **서비스 중인 앱** 카드 `note.rnrsoft.vip`.
- 연락처: `contact@rnrsoft.vip` — 반드시 유지.

### 5) 개인정보처리방침 (privacy) / 6) 이용약관 (terms)
- **Layout**: sticky 블러 헤더(로고+네비) → 타이틀 블록(max 820px, eyebrow `Legal`, h1, "최종 업데이트: 2026-07-14 · rnrsoft (rnrsoft.vip)") → 본문 섹션들(각 h2에 하단 헤어라인, 15.5px 본문) → 푸터.
- 내용은 **표준 초안**입니다. 실제 운영 문구가 있으면 교체하세요. 링크(개인정보/약관/문의)는 반드시 유지(구글 심사 필수).

### 7) 브랜드 가이드 (brand) — 내부 참고용
- 로고 락업(다크/라이트), 앱아이콘·아웃라인·글리프·파비콘, 컬러 팔레트, 타이포, OG 이미지(1200×630)를 정리한 보드. 배포 대상은 아니고 참고 자료입니다.

## Interactions & Behavior
- **언어 토글 (KO/EN)**: 모든 번역 대상 요소에 `data-en="..."` 속성(현재 innerHTML이 한글). 토글 시 처음 한 번 `data-ko`에 원문 저장 후 `innerHTML`을 `data-en`↔`data-ko`로 스왑. 선택값은 `localStorage['rnr-lang']`에 저장하여 **페이지 간 유지**, 로드 시 복원. `document.documentElement.lang`도 갱신. 즉시 페인트를 위해 마크업 기본값은 한글(홀/치환 아님).
- **헤더 스크롤 블러**(앱/소개/문의/약관 등 스크롤 페이지): 스크롤>24px면 `background:rgba(11,12,14,0.78); backdrop-filter:blur(14px); border-bottom:1px solid rgba(255,255,255,0.08)`, 아니면 투명. (홈은 스크롤 없어 항상 투명.)
- **공지 티커(홈 하단)**: 우→좌 무한 마퀴. 좌측 고정 `공지` 라벨(앰버 점+mono). 트랙은 동일 목록을 2벌 이어 붙이고 `@keyframes translateX(0 → -50%)` `34s linear infinite`. **마우스 오버 시 일시정지**(`animation-play-state:paused`). 항목 = 날짜(mono) + 제목 + `/` 구분. 목록은 KO/EN 각각(로직 `notices` 객체 참조) — 샘플이므로 실제 공지로 교체.
- **사운드 토이(홈, 특수 장치)**: 티커 우측 `♪ 사운드` 토글. 켜면 **Web Audio**로 제너러티브 앰비언트 재생 — 로우패스(950Hz) 통과한 사인 패드 3음(110/164.81/220Hz) + 540ms마다 랜덤 트라이앵글 아르페지오(펜타토닉 440~880Hz, 0.02s attack / 0.95s exp decay). 마스터는 `AnalyserNode(fftSize 64)`로 분석하고, 도크 라이브 아이콘의 **이퀄라이저 3바(`[data-eqbar]`)를 `scaleY(0.35 + v*1.25)`로 실시간 반응**(rAF). 각 rect는 `transform-box:fill-box; transform-origin:center bottom`. **기본 꺼짐**, 끄면 페이드아웃 후 `AudioContext.close()`, 바 리셋. 외부 에셋 없음.
- **hover 상태**: 앱 카드/이메일 카드 보더·배경 트랜지션(.3s). 링크 `#d8b489`→`#e7c9a6`.
- **모션 강도**: 스크롤 리빌 대신 진입 시 `rnr-rise`(20px 상승 페이드) 순차 딜레이. 저사양 배려 — 무거운 라이브러리 없이 CSS/Web Audio만.

## State Management
- `lang`: 'ko' | 'en' — localStorage 동기화, 페이지 로드 시 복원.
- `sound`: boolean(홈만) — AudioContext/analyser/rAF/interval 라이프사이클 관리(언마운트 시 정리).
- `scrolled`: boolean(스크롤 페이지) — 헤더 블러 토글.
- 데이터 페칭 없음(정적).

## 반응형
- 데스크탑 1440 기준 + 1024 대응. 모바일 390 기준: 네비 축소(필요 시 햄버거로), 앱 카드 1열, 도크는 소형/생략. 홈은 짧은 세로 화면에서 도크 숨김(`@media (max-height:760px)`).
- 히트 타깃 최소 44px, 다크모드 대비 확보(본문 `#9498a1` 이상).

## Assets
- `design/assets/og-image.png` — 소셜/OG 이미지(1200×630, 캔버스 생성). 배포 시 각 페이지 `<head>`의 `og:image`를 절대 URL(`https://rnrsoft.vip/assets/og-image.png`)로 연결. OG 태그라인은 폰트 안정성 때문에 영문. 한글 OG가 필요하면 별도 제작.
- 파비콘: 앰버 채움 앱아이콘(brand 가이드 참조)으로 생성 권장.
- 앱 스크린샷은 미포함(플레이스홀더 자리). 실제 이미지는 추후 삽입.
- 폰트는 전부 CDN(Pretendard, Instrument Serif, JetBrains Mono).

## Files
- `design/index.dc.html` — 홈(1화면 + 티커 + 사운드 토이)
- `design/apps.dc.html` — 앱 진열
- `design/about.dc.html` — 소개(4블록)
- `design/contact.dc.html` — 문의
- `design/privacy.dc.html` — 개인정보처리방침(초안)
- `design/terms.dc.html` — 이용약관(초안)
- `design/brand.dc.html` — 브랜드 가이드(참고용)
- `design/assets/og-image.png` — OG 이미지

## 주의(금지/필수)
- 콘텐츠(앱 정보·연락처·개인정보/약관 링크)는 유지·개선만. 반드시 남길 것.
- 다크모드 대비/가독성 확보. 과한 애니메이션 지양(저사양 모바일도 부드럽게).
- "개발자스러움 ≠ 촌스러움". 절제된 편집형 톤 유지.
