import { useMemo, useState } from 'react';
import BettingPanel from '../betting/BettingPanel.jsx';

const STATE_LABEL = {
  unstarted: '예정',
  inProgress: 'LIVE',
  completed: '종료',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

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

function yearOf(startTime) {
  return new Date(startTime).getFullYear();
}

function monthOf(startTime) {
  return new Date(startTime).getMonth() + 1;
}

/** 일정에 등장하는 연도 목록 (최신 연도가 앞) */
function yearsOf(schedule) {
  return [...new Set(schedule.map((ev) => yearOf(ev.startTime)))].sort((a, b) => b - a);
}

/**
 * 진행 중이거나 가장 가까운 경기가 있는 연·월 — 처음 열었을 때 보여줄 기본값.
 * 미래·라이브 경기가 없으면 가장 최근에 열렸던 경기의 연·월을 대신 보여준다.
 */
function defaultYearMonth(schedule) {
  const live = schedule.find((ev) => ev.state === 'inProgress');
  if (live) return { year: yearOf(live.startTime), month: monthOf(live.startTime) };

  const now = Date.now();
  const upcoming = schedule
    .filter((ev) => new Date(ev.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
  if (upcoming) return { year: yearOf(upcoming.startTime), month: monthOf(upcoming.startTime) };

  const latest = [...schedule].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
  return latest ? { year: yearOf(latest.startTime), month: monthOf(latest.startTime) } : null;
}

/**
 * 연도 아래 월을 두는 일정 목록. 열린 세트 배팅이 있는 경기는 행 안에 승부예측
 * 버튼을 노출하고, 누르면 별도 페이지로 이동하지 않고 그 자리에서 펼쳐진다.
 * 두 팀이 가운데 스코어를 향해 마주보는 대칭 배치 — 좌측 팀은 우측 정렬, 우측 팀은 좌측 정렬.
 */
export default function ScheduleList({
  schedule,
  onSelect,
  onGoLive,
  live,
  bettingCandidates = [],
  userId,
}) {
  const years = useMemo(() => yearsOf(schedule), [schedule]);
  const [yearMonth, setYearMonth] = useState(null);
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  // 홈 화면과 같은 기준(/api/live)으로 판단한다 — 라이브 보기를 눌렀을 때 실제로 볼 것이 있게.
  // 종료된 매치는 한동안 /api/live에 더 남아있으므로(다시보기 유예), matchFinished로 걸러야
  // 경기가 끝나는 즉시 "기록 보기"로 돌아온다.
  const liveMatchIds = useMemo(
    () => new Set(
      (live?.matches ?? []).filter((match) => !match.matchFinished).map((match) => match.matchId),
    ),
    [live],
  );

  // 일정이 처음 도착했을 때만 기본 연·월을 잡는다 (이후 사용자의 선택을 덮어쓰지 않게)
  const active = yearMonth ?? (years.length ? defaultYearMonth(schedule) : null);

  // 선택한 연도에 실제 경기가 있는 월 — 나머지 월은 탭에서 비활성으로 표시한다
  const monthsWithData = useMemo(() => {
    if (!active) return new Set();
    return new Set(
      schedule
        .filter((ev) => yearOf(ev.startTime) === active.year)
        .map((ev) => monthOf(ev.startTime)),
    );
  }, [schedule, active?.year]);

  const visible = useMemo(
    () => (active
      ? schedule.filter((ev) => yearOf(ev.startTime) === active.year && monthOf(ev.startTime) === active.month)
      : schedule),
    [schedule, active],
  );

  // /api/schedule 의 예정 경기는 팀 id 가 비어 있어 그대로 넘기면 배팅 패널이 팀 이름을
  // 표시하지 못한다. 같은 경기를 가리키는 배팅 후보 쪽 팀 id 를 우선 사용한다.
  const bettingCandidatesByMatchId = useMemo(
    () => new Map(bettingCandidates.map((candidate) => [candidate.matchId, candidate])),
    [bettingCandidates],
  );

  if (!schedule.length) {
    return <p className="muted">일정 데이터 없음 (백엔드 첫 폴링 대기 중일 수 있음)</p>;
  }

  const activeYearIndex = years.indexOf(active.year);

  return (
    <div className="schedule">
      <div className="year-nav">
        <button
          type="button"
          className="year-nav-btn"
          aria-label="이전 연도"
          disabled={activeYearIndex >= years.length - 1}
          onClick={() => setYearMonth({ year: years[activeYearIndex + 1], month: active.month })}
        >
          ‹
        </button>
        <span className="year-nav-label">{active.year}년</span>
        <button
          type="button"
          className="year-nav-btn"
          aria-label="다음 연도"
          disabled={activeYearIndex <= 0}
          onClick={() => setYearMonth({ year: years[activeYearIndex - 1], month: active.month })}
        >
          ›
        </button>
        <button
          type="button"
          className="year-nav-latest"
          onClick={() => setYearMonth(defaultYearMonth(schedule))}
        >
          최신
        </button>
      </div>

      <div className="month-tabs" role="tablist" aria-label="월 선택">
        {MONTHS.map((m) => {
          const hasData = monthsWithData.has(m);
          const isActive = active.month === m;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`month-tab ${isActive ? 'active' : ''}`}
              disabled={!hasData}
              onClick={() => setYearMonth({ year: active.year, month: m })}
            >
              {m}월
            </button>
          );
        })}
      </div>

      {groupByDate(visible).map(({ date, events }) => (
        <section key={date.toISOString()} className="date-group">
          <h3 className="date-header">{fmtDateHeader(date)}</h3>

          {events.map((ev) => {
            const [home, away] = ev.teams;
            const started = ev.state !== 'unstarted';
            const isExpanded = expandedMatchId === ev.matchId;
            const bettingCandidate = bettingCandidatesByMatchId.get(ev.matchId);
            // 배팅 후보에서 막 빠져도(마감) 펼쳐진 패널은 유지해 결과·내 배팅 상태를 계속 보여준다
            const canPredict = Boolean(bettingCandidate) || isExpanded;
            const isLive = liveMatchIds.has(ev.matchId);
            const goToRow = () => (isLive ? onGoLive?.() : onSelect?.(ev));

            return (
              <div key={ev.matchId} className="match-row-group">
                <div
                  className={`match-row ${ev.state}`}
                  role="button"
                  tabIndex={0}
                  onClick={goToRow}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToRow()}
                >
                  <span className="match-time">{fmtTime(new Date(ev.startTime))}</span>
                  <span className={`match-state ${ev.state}`}>
                    {STATE_LABEL[ev.state] ?? ev.state}
                  </span>
                  <span className="match-block">{ev.blockName}</span>

                  {/* 홈 — 우측 정렬로 가운데를 향한다 */}
                  <span className={`side home ${home?.outcome === 'win' ? 'winner' : ''}`}>
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
                  </span>

                  {canPredict && (
                    <button
                      type="button"
                      className={`predict-toggle ${isExpanded ? 'active' : ''}`}
                      aria-expanded={isExpanded}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedMatchId((current) => (current === ev.matchId ? null : ev.matchId));
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      승부예측
                    </button>
                  )}
                  <span className="match-go">{isLive ? '라이브 보기' : '기록 보기'}</span>
                </div>

                {isExpanded && (
                  <div className="match-predict-panel">
                    <BettingPanel match={bettingCandidate ?? ev} userId={userId} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
