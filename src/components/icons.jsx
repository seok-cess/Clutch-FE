/**
 * 1.25px 스트로크 라인 아이콘 — 계측·엔지니어링 모티프.
 * 면 아이콘·이모지 금지 (디자인 팩 규칙).
 */
const base = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** 타워 — 계측 눈금 형태의 구조물 */
export const TowerIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M5 14V6l3-3 3 3v8" />
    <path d="M3 14h10M5 9h6" />
  </svg>
);

/** 억제기 — 캘리퍼로 잰 코어 */
export const InhibitorIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M8 2l4 3v6l-4 3-4-3V5z" />
    <path d="M8 6v4" />
  </svg>
);

/** 바론 — 게이지 아크 */
export const BaronIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M2 11a6 6 0 0 1 12 0" />
    <path d="M8 11L11 7" />
    <path d="M2 13h12" />
  </svg>
);

/** 펼침 표시 — 계측 포인터 (열림 시 90도 회전) */
export const ChevronIcon = ({ open }) => (
  <svg
    {...base}
    width="10"
    height="10"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1)' }}
    aria-hidden="true"
  >
    <path d="M6 3l5 5-5 5" />
  </svg>
);

/** 드래곤 — 각진 측정 도형 */
export const DragonIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M2 8l3-4 3 4-3 4z" />
    <path d="M8 8l3-4 3 4-3 4z" />
  </svg>
);
