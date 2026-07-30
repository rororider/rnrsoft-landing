/* 받아쓰기 노트 — 미디어 목록
   ★ 스크린샷/GIF/영상을 추가하려면 이 파일만 고치면 된다. HTML은 손댈 필요 없다.

   준비 방법:
   1) 폰이나 PC에서 note.rnrsoft.vip 에 로그인해 화면 캡처
   2) 이미지를 public/media/img/ 에 넣는다 (파일명은 자유, 아래 src와 맞추기만)
   3) 아래 SHOTS 배열에 { src, alt, caption } 추가하고 placeholder:true 제거
   4) node _bump.cjs && wrangler pages deploy public ...

   권장 규격:
   - 스크린샷: 세로 폰 비율(9:19.5). 폭 720px 이상이면 충분. PNG 또는 WebP
   - GIF: 폭 480~720px, 8초 이내, 5MB 이하 (넘으면 WebP 애니 또는 mp4 권장)
   - 유튜브: 영상 ID만 넣으면 된다 (URL 전체 아님)
*/
window.NOTE_MEDIA = {
  // 앱 스크린샷 · GIF — 순서대로 갤러리에 표시된다
  shots: [
    { placeholder: true, caption: '홈 — 녹음 시작',      hint: '앱 첫 화면' },
    { placeholder: true, caption: '받아쓰는 중',          hint: '말하면 실시간으로 글이 쌓이는 화면' },
    { placeholder: true, caption: 'AI 정리 결과',         hint: '요약·질문이 생성된 화면' },
    { placeholder: true, caption: '학습카드',             hint: '카드로 바뀐 화면' },
    // 실제 예시:
    // { src: '/media/img/note-home.png',    alt: '받아쓰기 노트 홈 화면', caption: '홈 — 녹음 시작' },
    // { src: '/media/img/note-record.gif',  alt: '받아쓰는 모습',        caption: '말하면 자동으로 받아적힙니다' },
  ],

  // 유튜브 소개 영상 — 영상 ID만 (예: 'dQw4w9WgXcQ')
  // 비워두면 영상 섹션이 통째로 숨겨진다
  youtube: null,
  youtubeTitle: '받아쓰기 노트 소개 영상',
};
