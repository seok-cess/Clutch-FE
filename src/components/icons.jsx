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

/** 억제기 — 원형 배지 안의 보석. currentColor 라 팀 색(블루/레드)을 그대로 받는다 */
export const InhibitorIcon = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 3.5L11.5 8L8 12.5L4.5 8Z" fill="currentColor" stroke="none" />
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

/** 드래곤 — 단순화한 얼굴 실루엣. 바론·타워와 맞춰 팀 색과 무관한 고정 색을 쓴다 */
export const DragonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M4.5 3L6 1.2 8 3 10 1.2 11.5 3 14 8 11 13 8 15 5 13 2 8Z"
      fill="#3FBE7B"
      stroke="#1F8F5F"
      strokeWidth="0.75"
      strokeLinejoin="round"
    />
    <circle cx="6.2" cy="7.6" r="0.9" fill="#0B2E1E" />
    <circle cx="9.8" cy="7.6" r="0.9" fill="#0B2E1E" />
  </svg>
);
