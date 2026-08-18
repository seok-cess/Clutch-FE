import { useRef, useState } from 'react';
import { dragonName, dragonDesc, objectiveIcon } from '../ddragon.js';

/**
 * 좌표계 크기.
 * 폭을 꽉 채우려면 preserveAspectRatio="none" 이 필요한데, 그러면 내용이 가로로 늘어난다.
 * 그래서 뷰박스 폭을 실제 렌더 폭에 가깝게 잡아 왜곡 자체를 줄이고,
 * 마커 원·글자는 SVG 스케일을 받지 않는 방식(벡터 이펙트·고정 크기)으로 그린다.
 */
const W = 1500;
const H = 270;
// 하단 여백 = 오브젝트 마커 한 줄 + 시간 라벨. 마커는 HTML 이라
// viewBox 단위가 아닌 실제 px 로 얹히므로, 여기서는 자리만 비워 둔다.
const PAD = { top: 16, right: 16, bottom: 66, left: 56 };

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

/**
 * 골드차 추이 그래프 — 1px 헤어라인 라인 차트.
 * 0선을 기준으로 위(블루 우세)·아래(레드 우세)를 팀 색으로 칠하고,
 * 마우스를 올리면 해당 시점의 팀별 골드·킬·골드차를 보여준다.
 */
/**
 * 그래프에 표시할 오브젝트 — 대형 오브젝트만.
 * 타워·억제기는 수가 많아(경기당 20개 내외) 마커가 축을 뒤덮어 제외했다.
 */
const OBJ_MARK = {
  dragon: { mark: 'D', label: '드래곤' },
  baron: { mark: 'B', label: '바론' },
};

export default function GoldChart({ points, objectives }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { i, px, py }
  const [objHover, setObjHover] = useState(null);

  if (!points || points.length < 2) {
    return <p className="muted">추이 데이터가 아직 충분하지 않습니다.</p>;
  }

  const times = points.map((p) => p.gameTimeSeconds ?? 0);
  const diffs = points.map((p) => p.goldDiff ?? 0);

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  // 0을 항상 세로 중앙에 두기 위해 최대 절대값 기준 대칭 스케일
  const maxAbs = Math.max(1000, ...diffs.map(Math.abs));

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (t) => PAD.left + (tMax === tMin ? 0 : ((t - tMin) / (tMax - tMin)) * plotW);
  const y = (d) => PAD.top + plotH / 2 - (d / maxAbs) * (plotH / 2);

  const zeroY = y(0);
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(times[i]).toFixed(1)},${y(diffs[i]).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(tMax).toFixed(1)},${zeroY.toFixed(1)} L${x(tMin).toFixed(1)},${zeroY.toFixed(1)} Z`;

  // 세로 눈금: 5분 간격
  const ticks = [];
  for (let t = Math.ceil(tMin / 300) * 300; t <= tMax; t += 300) ticks.push(t);

  const last = diffs[diffs.length - 1];

  // 표시할 오브젝트 (대형만) — 마커는 SVG 밖 HTML 로 그려 가로 왜곡을 피한다
  const marks = (objectives ?? [])
    .filter((o) => OBJ_MARK[o.type] && o.gameTimeSeconds >= tMin && o.gameTimeSeconds <= tMax)
    .map((o) => ({ ...o, cx: x(o.gameTimeSeconds) }));

  /** 마우스 x좌표에서 가장 가까운 데이터 점 찾기 */
  const onMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    // 화면 좌표 → 뷰박스 좌표. SVG 변환 행렬을 쓰면 확대 방식과 무관하게 정확하다.
    let vx;
    if (svg.createSVGPoint && svg.getScreenCTM()) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      vx = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
    } else {
      const rect = svg.getBoundingClientRect();
      vx = ((e.clientX - rect.left) / rect.width) * W;
    }
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < times.length; i++) {
      const d = Math.abs(x(times[i]) - vx);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover({ i: best, px: x(times[best]), py: y(diffs[best]) });
  };

  // 오브젝트 마커에 올렸을 때는 골드 툴팁을 숨긴다 (둘이 겹쳐 읽기 어려움)
  const hp = hover && !objHover ? points[hover.i] : null;
  // 툴팁이 오른쪽 끝에서 잘리지 않게 방향 전환
  const tipFlip = hover && hover.px > W - 210;

  return (
    <div className="gold-chart">
      {/* 마커·툴팁은 이 박스 기준으로 얹는다. 범례까지 포함한 바깥 div 를 기준으로
          삼으면 bottom 이 범례 아래에서 계산돼 그래프 밖으로 밀린다. */}
      <div className="chart-box">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="골드차 추이 그래프"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {/* 0선 위는 블루, 아래는 레드 */}
          <clipPath id="clip-blue"><rect x="0" y="0" width={W} height={zeroY} /></clipPath>
          <clipPath id="clip-red"><rect x="0" y={zeroY} width={W} height={H - zeroY} /></clipPath>
        </defs>

        {/* 가로 헤어라인 그리드 */}
        {[-1, -0.5, 0.5, 1].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right}
                y1={y(maxAbs * f)} y2={y(maxAbs * f)} className="chart-grid" />
        ))}

        {/* 세로 시간 눈금 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.top} y2={H - PAD.bottom} className="chart-grid" />
            <text x={x(t)} y={H - 6} textAnchor="middle" className="chart-label">{fmtClock(t)}</text>
          </g>
        ))}

        <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} className="chart-zero" />

        <path d={area} className="chart-area blue" clipPath="url(#clip-blue)" />
        <path d={area} className="chart-area red" clipPath="url(#clip-red)" />
        <path d={line} className="chart-line blue" clipPath="url(#clip-blue)" />
        <path d={line} className="chart-line red" clipPath="url(#clip-red)" />

        {/* Y축 라벨 */}
        <text x={PAD.left - 8} y={y(maxAbs) + 4} textAnchor="end" className="chart-label">
          {Math.round(maxAbs / 1000)}k
        </text>
        <text x={PAD.left - 8} y={zeroY + 4} textAnchor="end" className="chart-label">0</text>
        <text x={PAD.left - 8} y={y(-maxAbs) + 4} textAnchor="end" className="chart-label">
          {Math.round(maxAbs / 1000)}k
        </text>

        {/* 오브젝트 획득 시점 지시선 (마커 자체는 SVG 밖 HTML — 늘어남 방지) */}
        {marks.map((o, i) => (
          <line key={i} x1={o.cx} x2={o.cx} y1={PAD.top} y2={H - PAD.bottom} className="obj-line" />
        ))}

        {/* 호버 지시선 + 포인트 */}
        {hover && !objHover && (
          <g className="chart-hover">
            <line x1={hover.px} x2={hover.px} y1={PAD.top} y2={H - PAD.bottom} />
            <circle cx={hover.px} cy={hover.py} r="3"
                    className={diffs[hover.i] >= 0 ? 'blue' : 'red'} />
          </g>
        )}
      </svg>

      {/* 오브젝트 마커 — HTML 이라 SVG 가로 확대의 영향을 받지 않는다 */}
      <div className="obj-marks">
        {marks.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`obj-mark ${o.side} ${o.type}`}
            style={{ left: `${(o.cx / W) * 100}%` }}
            onMouseEnter={() => setObjHover(o)}
            onMouseLeave={() => setObjHover(null)}
            onFocus={() => setObjHover(o)}
            onBlur={() => setObjHover(null)}
            aria-label={`${fmtClock(o.gameTimeSeconds)} ${o.side === 'blue' ? '블루' : '레드'} ${
              o.type === 'dragon' ? dragonName(o.subtype) : OBJ_MARK[o.type].label}`}
          >
            {objectiveIcon(o.type, o.subtype)
              ? (
                <img
                  src={objectiveIcon(o.type, o.subtype)}
                  alt=""
                  className="obj-ico"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )
              : OBJ_MARK[o.type].mark}
          </button>
        ))}
      </div>

      {/* 오브젝트 툴팁 — 마커 아래에 "시각 · 이름" 한 줄로 작게 */}
      {objHover && (
        <div
          className="obj-tip"
          style={{
            left: `${(objHover.cx / W) * 100}%`,
            // 좌우 끝에서 잘리지 않게 방향 전환
            transform: objHover.cx > W - 120
              ? 'translateX(-100%) translateX(12px)'
              : (objHover.cx < 120 ? 'translateX(-12px)' : 'translateX(-50%)'),
          }}
        >
          <span className="obj-tip-time">{fmtClock(objHover.gameTimeSeconds)}</span>
          <span className={objHover.side === 'blue' ? 'blue-text' : 'red-text'}>
            {objHover.type === 'dragon'
              ? dragonName(objHover.subtype)
              : OBJ_MARK[objHover.type]?.label}
          </span>
        </div>
      )}

      {/* 툴팁 — SVG 밖 HTML 로 그려 폰트가 찌그러지지 않게 */}
      {hp && (
        <div
          className="chart-tip"
          style={{
            left: `${(hover.px / W) * 100}%`,
            transform: tipFlip ? 'translateX(-100%) translateX(-12px)' : 'translateX(12px)',
          }}
        >
          <div className="tip-time">{fmtClock(hp.gameTimeSeconds ?? 0)}</div>
          <div className="tip-row">
            <span className="blue-text">BLUE</span>
            <b>{(hp.blueGold ?? 0).toLocaleString()}</b>
            <span className="muted">{hp.blueKills ?? 0} kills</span>
          </div>
          <div className="tip-row">
            <span className="red-text">RED</span>
            <b>{(hp.redGold ?? 0).toLocaleString()}</b>
            <span className="muted">{hp.redKills ?? 0} kills</span>
          </div>
          <div className={`tip-diff ${hp.goldDiff >= 0 ? 'blue-text' : 'red-text'}`}>
            {hp.goldDiff === 0
              ? '동률'
              : `${hp.goldDiff > 0 ? 'BLUE' : 'RED'} +${Math.abs(hp.goldDiff).toLocaleString()}`}
          </div>
        </div>
      )}

      </div>

      <div className="chart-legend">
        <span className="blue-text">■ 블루 우세</span>
        <span className="red-text">■ 레드 우세</span>
        <span className="muted">
          {points.length}개 지점 · 현재{' '}
          {last === 0 ? '동률' : `${last > 0 ? '블루' : '레드'} +${Math.abs(last).toLocaleString()}`}
        </span>
      </div>
    </div>
  );
}
