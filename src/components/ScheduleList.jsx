const STATE_LABEL = {
  unstarted: '예정',
  inProgress: 'LIVE',
  completed: '종료',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "08월 08일 (토)" — 날짜 그룹 헤더 */
function fmtDateHeader(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}월 ${dd}일 (${WEEKDAYS[d.getDay()]})`;
}

/** "17:00" */
function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 날짜(로컬 기준)별로 경기를 묶는다 */
function groupByDate(schedule) {
  const groups = new Map();
  for (const ev of schedule) {
    const d = new Date(ev.startTime);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) groups.set(key, { date: d, events: [] });
    groups.get(key).events.push(ev);
  }
  return [...groups.values()];
}

/**
 * 날짜별로 묶인 경기 일정.
 * 두 팀이 가운데 스코어를 향해 마주보는 대칭 배치 — 좌측 팀은 우측 정렬, 우측 팀은 좌측 정렬.
 */
/** 최근 5경기 폼 — W/L 를 팀 색 점으로 (최신이 오른쪽) */
function Form({ matches, side }) {
  if (!matches?.length) return <span className="form" />;
  const ordered = [...matches].reverse(); // 오래된 것부터 → 최신이 오른쪽
  return (
    <span className={`form ${side}`}>
      {ordered.map((m, i) => (
        <span
          key={i}
          className={`form-dot ${m.outcome === 'win' ? 'win' : 'loss'}`}
          title={`${m.opponentCode} 전 ${m.outcome === 'win' ? '승' : '패'} (${m.gameWins}:${m.opponentGameWins})`}
        >
          {m.outcome === 'win' ? 'W' : 'L'}
        </span>
      ))}
    </span>
  );
}

export default function ScheduleList({ schedule, onSelect, recentForm }) {
  if (!schedule.length) {
    return <p className="muted">일정 데이터 없음 (백엔드 첫 폴링 대기 중일 수 있음)</p>;
  }

  return (
    <div className="schedule">
      {groupByDate(schedule).map(({ date, events }) => (
        <section key={date.toISOString()} className="date-group">
          <h3 className="date-header">{fmtDateHeader(date)}</h3>

          {events.map((ev) => {
            const [home, away] = ev.teams;
            const started = ev.state !== 'unstarted';
            return (
              <div
                key={ev.matchId}
                className={`match-row ${ev.state}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(ev)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(ev)}
              >
                <span className="match-time">{fmtTime(new Date(ev.startTime))}</span>
                <span className={`match-state ${ev.state}`}>
                  {STATE_LABEL[ev.state] ?? ev.state}
                </span>
                <span className="match-block">{ev.blockName}</span>

                {/* 홈 — 우측 정렬로 가운데를 향한다 */}
                <span className={`side home ${home?.outcome === 'win' ? 'winner' : ''}`}>
                  <Form matches={recentForm?.[home?.code]} side="home" />
                  <span className="side-name">{home?.name ?? 'TBD'}</span>
                  {home?.image && <img src={home.image} alt="" className="team-logo" />}
                </span>

                <span className="match-score">
                  {started ? (
                    <>
                      <b className={home?.outcome === 'win' ? 'winner' : ''}>{home?.gameWins ?? 0}</b>
                      <span className="sep">:</span>
                      <b className={away?.outcome === 'win' ? 'winner' : ''}>{away?.gameWins ?? 0}</b>
                    </>
                  ) : (
                    <span className="sep">vs</span>
                  )}
                </span>

                {/* 어웨이 — 좌측 정렬 */}
                <span className={`side away ${away?.outcome === 'win' ? 'winner' : ''}`}>
                  {away?.image && <img src={away.image} alt="" className="team-logo" />}
                  <span className="side-name">{away?.name ?? 'TBD'}</span>
                  <Form matches={recentForm?.[away?.code]} side="away" />
                </span>

                <span className="match-go">기록 보기</span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
