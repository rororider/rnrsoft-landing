여기에 앱 스크린샷 / GIF 를 넣으세요.

1) note.rnrsoft.vip 에 로그인해서 화면 캡처
2) 이미지를 이 폴더에 넣기 (파일명 자유)
3) ../note-media.js 파일을 열어 shots 배열에 추가
     { src: '/media/img/파일명.png', alt: '설명', caption: '화면 이름' }
   그리고 그 자리의 { placeholder: true, ... } 줄은 지우기
4) 배포:  node _bump.cjs  후  wrangler pages deploy public ...

권장 크기
- 스크린샷: 세로 폰 비율(9:19.5), 폭 720px 이상, PNG 또는 WebP
- GIF: 폭 480~720px, 8초 이내, 5MB 이하

유튜브 영상은 note-media.js 의 youtube 항목에 "영상 ID"만 넣으면 됩니다.
  예)  youtube: 'dQw4w9WgXcQ'
