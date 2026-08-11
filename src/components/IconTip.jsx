import { useRef, useState } from 'react';
import { parseDescription } from '../ddragonText.js';

/**
 * 아이콘 위에 이름·설명을 띄우는 툴팁.
 *
 * 브라우저 기본 title 속성은 표시까지 1초 이상 걸리고 스타일을 맞출 수 없어 직접 구현했다.
 * 표 안에서 쓰이므로 position:fixed 로 띄워 overflow 잘림을 피하고,
 * 화면 밖으로 나가지 않도록 위치를 보정한다.
 */
export default function IconTip({ label, sub, description, children }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null); // { x, y, flipY }

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // 위쪽 공간이 부족하면 아이콘 아래로 띄운다
    setTip({ x: r.left + r.width / 2, y: r.top, bottom: r.bottom, flipY: r.top < 260 });
  };

  const tokens = description ? parseDescription(description) : [];

  return (
    <span
      ref={ref}
      className="icon-tip-anchor"
      onMouseEnter={show}
      onMouseLeave={() => setTip(null)}
      onFocus={show}
      onBlur={() => setTip(null)}
      tabIndex={0}
    >
      {children}
      {tip && (
        <span
          className={`icon-tip ${tip.flipY ? 'below' : ''}`}
          style={{ left: tip.x, top: tip.flipY ? tip.bottom : tip.y }}
          role="tooltip"
        >
          <span className="icon-tip-head">
            <span className="icon-tip-name">{label}</span>
            {sub && <span className="icon-tip-sub">{sub}</span>}
          </span>

          {tokens.length > 0 && (
            <span className="icon-tip-desc">
              {tokens.map((t, i) => {
                if (t.kind === 'break') return <br key={i} />;
                if (t.kind === 'em') return <b key={i} className="tip-em">{t.text}</b>;
                if (t.kind === 'head') return <b key={i} className="tip-head">{t.text}</b>;
                return <span key={i}>{t.text}</span>;
              })}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
