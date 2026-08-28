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

/** 타워 — 기존 포탑.png 픽셀(20×24)을 그대로 벡터화. currentColor 라 팀 색(블루/레드)을 그대로 받는다 */
export const TowerIcon = () => (
  <svg width="12.5" height="15" viewBox="0 0 20 24" fill="currentColor" aria-hidden="true">
    <rect x="7" y="1" width="6" height="1" /><rect x="7" y="2" width="6" height="1" />
    <rect x="7" y="3" width="2" height="1" /><rect x="11" y="3" width="2" height="1" />
    <rect x="7" y="4" width="2" height="1" /><rect x="11" y="4" width="2" height="1" />
    <rect x="4" y="5" width="2" height="1" /><rect x="7" y="5" width="2" height="1" />
    <rect x="11" y="5" width="2" height="1" /><rect x="14" y="5" width="2" height="1" />
    <rect x="3" y="6" width="14" height="1" /><rect x="2" y="7" width="16" height="1" />
    <rect x="2" y="8" width="16" height="1" /><rect x="3" y="9" width="14" height="1" />
    <rect x="3" y="10" width="5" height="1" /><rect x="12" y="10" width="5" height="1" />
    <rect x="4" y="11" width="5" height="1" /><rect x="11" y="11" width="5" height="1" />
    <rect x="5" y="12" width="10" height="1" /><rect x="7" y="13" width="6" height="1" />
    <rect x="9" y="14" width="2" height="1" /><rect x="6" y="15" width="1" height="1" />
    <rect x="13" y="15" width="1" height="1" /><rect x="6" y="16" width="3" height="1" />
    <rect x="11" y="16" width="3" height="1" /><rect x="6" y="17" width="8" height="1" />
    <rect x="6" y="18" width="8" height="1" /><rect x="7" y="19" width="6" height="1" />
    <rect x="7" y="20" width="6" height="1" /><rect x="5" y="21" width="10" height="1" />
    <rect x="5" y="22" width="10" height="1" />
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
