import { useEffect, useRef } from 'react';
import SeasonSummary from './SeasonSummary.jsx';

/**
 * 홈(메인) 화면.
 *
 * 진행 중인 경기를 맨 위에 두고, 그 아래로 다음 경기 · 순위 · 일정 · 시즌 요약을 쌓는다.
 * 모든 값은 /api/* 응답에서 오며, 없는 값은 감추지 않고 대시나 빈 상태로 남긴다
 * (자리가 사라지면 폴링으로 값이 들어올 때 화면이 흔들린다).
 */
export default function MainScreen({
  live, schedule, teamStandings, recentForm, playerKda, champions,
  scoreboard, onOpenMatch, onGoLive, onGoSchedule,
}) {
  const liveMatch = live?.matches?.find((m) => !m.matchFinished) ?? live?.matches?.[0] ?? null;
  const upcoming = upcomingMatches(schedule);

  return (
    <>
      <Reveal className="cl-board">
        {liveMatch
          ? <LiveHero match={liveMatch} scoreboard={scoreboard} onGoLive={onGoLive} />
          : <NextHero match={upcoming[0]} onGoSchedule={onGoSchedule} />}
        <NextMatchCard
          upcoming={liveMatch ? upcoming : upcoming.slice(1)}
          featured={liveMatch ? upcoming[0] : upcoming[1]}
          onOpenMatch={onOpenMatch}
          onGoSchedule={onGoSchedule}
        />
      </Reveal>

      <Reveal className="cl-schedgrid">
        <StandingsCard teamStandings={teamStandings} />
        <ScheduleCard schedule={schedule} onOpenMatch={onOpenMatch} />
      </Reveal>

      <Reveal className="cl-c3">
        <SeasonSummary playerKda={playerKda} champions={champions} recentForm={recentForm} />
      </Reveal>

      <p className="cl-foot">
        <b>CLUTCH</b> · 표시되는 경기 정보는 LoL Esports 피드에서 수집합니다.
      </p>
    </>
  );
}

/* ── 진행 중인 경기 ── */

function LiveHero({ match, scoreboard, onGoLive }) {
  const [a, b] = match.teams ?? [];
  // 스코어보드의 진영은 팀 id 로만 판별된다. 매칭이 안 되면 킬 스코어를 감춘다.
  const blueIsA = scoreboard?.blue?.esportsTeamId && a?.id
    ? scoreboard.blue.esportsTeamId === a.id
    : null;
  const sideOf = (team) => {
    if (blueIsA === null || !scoreboard) return null;
    const isA = team === a;
    return (isA === blueIsA) ? scoreboard.blue : scoreboard.red;
  };
  const sa = sideOf(a);
  const sb = sideOf(b);
  const activeGame = match.games?.find((g) => g.gameId === match.activeGameId);
  const goldDiff = sa && sb && sa.totalGold != null && sb.totalGold != null
    ? sa.totalGold - sb.totalGold
    : null;

  return (
    <section className="cl-hero">
      <div className="wm">{a?.code ?? ''} VS {b?.code ?? ''}</div>
      <div className="band l" /><div className="band r" />
      <div className="in">
        <div className="cl-hbar">
          <span className="cl-tag"><i />LIVE</span>
          <span className="cl-hmeta">
            {[match.leagueName, match.blockName].filter(Boolean).join(' · ')}
          </span>
          <span className="cl-setsc">
            세트 <b>{a?.gameWins ?? 0}</b><span className="c">:</span><b>{b?.gameWins ?? 0}</b>
          </span>
        </div>

        <div className="cl-hrow">
          <TeamBlock team={a} tone="b" />
          <div>
            {sa && sb ? (
              <div className="cl-hsc">
                <span>{sa.totalKills ?? 0}</span>
                <span className="c">:</span>
                <span>{sb.totalKills ?? 0}</span>
              </div>
            ) : (
              <div className="cl-hsc solo">—</div>
            )}
            <div className="cl-hlbl">KILLS</div>
            <div className="cl-hclk">
              {activeGame?.number ? `GAME ${activeGame.number}` : '경기 중'}
              {scoreboard?.gameTimeSeconds != null && ` · ${clock(scoreboard.gameTimeSeconds)}`}
            </div>
          </div>
          <TeamBlock team={b} tone="rd" align="r" />
        </div>

        <div className="cl-hstrip">
          <span className="cl-os b">
            <span>타워<b>{sa?.towers ?? '—'}</b></span>
            <span>드래곤<b>{sa?.dragons?.length ?? '—'}</b></span>
          </span>
          <span className="cl-gd">
            골드<b>{goldDiff == null ? '—' : `${goldDiff >= 0 ? '+' : ''}${goldDiff.toLocaleString()}`}</b>
          </span>
          <span className="cl-os r">
            <span>타워<b>{sb?.towers ?? '—'}</b></span>
            <span>드래곤<b>{sb?.dragons?.length ?? '—'}</b></span>
          </span>
        </div>

        <button className="cl-cta" onClick={onGoLive}>
          라이브 중계 보기 <Chevron />
        </button>
      </div>
    </section>
  );
}

/** 진행 중인 경기가 없을 때의 히어로 — 다음 경기를 크게 보여준다 */
function NextHero({ match, onGoSchedule }) {
  const [a, b] = match?.teams ?? [];
  return (
    <section className="cl-hero">
      <div className="wm">{a?.code ?? 'CLUTCH'} {b ? `VS ${b.code}` : ''}</div>
      <div className="band l" /><div className="band r" />
      <div className="in">
        <div className="cl-hbar">
          <span className="cl-tag up">UP NEXT</span>
          <span className="cl-hmeta">
            {match ? [match.blockName, kickoff(match.startTime)].filter(Boolean).join(' · ')
                   : '예정된 경기가 없습니다'}
          </span>
        </div>

        {match ? (
          <>
            <div className="cl-hrow">
              <TeamBlock team={a} tone="b" />
              <div>
                <div className="cl-hsc solo">VS</div>
                <div className="cl-hlbl">KICKOFF</div>
                <div className="cl-hclk">{kickoff(match.startTime)}</div>
              </div>
              <TeamBlock team={b} tone="rd" align="r" />
            </div>
            <div className="cl-hstrip">
              <span className="cl-os b"><span>시즌 전적<b>{record(a)}</b></span></span>
              <span className="cl-gd">{match.bestOf ? `BO${match.bestOf}` : ''}</span>
              <span className="cl-os r"><span>시즌 전적<b>{record(b)}</b></span></span>
            </div>
          </>
        ) : (
          <p className="cl-empty">일정이 수집되면 이곳에 다음 경기가 표시됩니다.</p>
        )}

        <button className="cl-cta" onClick={onGoSchedule}>
          전체 일정 보기 <Chevron />
        </button>
      </div>
    </section>
  );
}

function TeamBlock({ team, tone, align }) {
  return (
    <div className={`cl-htm ${tone} ${align === 'r' ? 'r' : ''}`}>
      {team?.image
        ? <img className="cl-hlg" src={team.image} alt="" loading="lazy" />
        : <Crest size={50} tone={tone} />}
      <div className="cl-hcd">{team?.code ?? '—'}</div>
      <div className="cl-hsub">{record(team)}</div>
    </div>
  );
}

/* ── 다음 경기 카드 ── */

function NextMatchCard({ upcoming, featured, onOpenMatch, onGoSchedule }) {
  const rest = upcoming.filter((m) => m !== featured).slice(0, 3);
  const [a, b] = featured?.teams ?? [];

  return (
    <section className="cl-card cl-nextcard">
      <div className="cl-ch"><h3>다음 경기</h3></div>

      {featured ? (
        <div className="cl-next">
          <div className="cl-nx">
            {a?.image ? <img className="cl-nxlg" src={a.image} alt="" /> : <Crest size={36} tone="b" />}
            <span className="cl-nxcd">{a?.code ?? '—'}</span>
            <span className="cl-nxrec">{record(a)}</span>
          </div>
          <div className="cl-nxmid">
            <div className="cl-nxvs">VS</div>
            <div className="cl-nxin">{kickoff(featured.startTime)}</div>
            <div className="cl-nxsub">{dayLabel(featured.startTime)}</div>
          </div>
          <div className="cl-nx">
            {b?.image ? <img className="cl-nxlg" src={b.image} alt="" /> : <Crest size={36} tone="rd" />}
            <span className="cl-nxcd">{b?.code ?? '—'}</span>
            <span className="cl-nxrec">{record(b)}</span>
          </div>
        </div>
      ) : (
        <p className="cl-empty">예정된 경기가 없습니다.</p>
      )}

      {rest.length > 0 && (
        <>
          <div className="cl-uphead">이후 일정</div>
          <div className="cl-upnext">
            {rest.map((m) => {
              const [x, y] = m.teams ?? [];
              return (
                <button key={m.matchId} className="cl-up" onClick={() => onOpenMatch?.(m)}>
                  <span className="cl-upteams">
                    {x?.image && <img className="mini" src={x.image} alt="" />}
                    {x?.code ?? '—'}
                    <span className="vs">VS</span>
                    {y?.image && <img className="mini" src={y.image} alt="" />}
                    {y?.code ?? '—'}
                  </span>
                  <span className="cl-uptime">{shortWhen(m.startTime)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button className="cl-allsched" onClick={onGoSchedule}>
        전체 일정 보기 <Chevron />
      </button>
    </section>
  );
}

/* ── 순위 ── */

function StandingsCard({ teamStandings }) {
  // 그룹이 여럿이면 첫 그룹만 보여준다 (메인은 요약 카드라 전체는 순위 페이지에서 본다)
  const group = teamStandings?.find((g) => g.rows?.length > 0);
  const rows = group?.rows ?? [];

  return (
    <section className="cl-card">
      <div className="cl-ch">
        <h3>순위</h3>
        {group?.groupName && <span className="s">{group.groupName}</span>}
      </div>

      {rows.length === 0 ? (
        <p className="cl-empty">순위 데이터를 불러오는 중입니다.</p>
      ) : (
        <>
          <div className="cl-rkhead">
            <span>순위</span><span /><span>팀</span>
            <span className="rt">승-패</span><span className="rt">승률</span>
          </div>
          {rows.map((t, i) => {
            // 서버가 0~1 로 주므로 화면 표기(%)에 맞춰 환산한다
            const rate = t.winRate == null ? null : t.winRate * 100;
            return (
              <div key={t.teamCode} className={`cl-rk ${i < 3 ? 'top' : ''}`}>
                <span className="cl-rkn">{t.rank ?? i + 1}</span>
                {t.teamImageUrl
                  ? <img className="cl-rklg" src={t.teamImageUrl} alt="" loading="lazy" />
                  : <Crest size={22} tone={i < 3 ? 'b' : ''} />}
                <span className="cl-rkt">{t.teamCode}</span>
                <span className="cl-rkw">{t.wins}-{t.losses}</span>
                <span className="cl-rkp">
                  {rate == null ? '—' : rate.toFixed(1)}<span className="u">%</span>
                </span>
                <span className="cl-rkbar"><i style={{ width: `${rate ?? 0}%` }} /></span>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

/* ── 일정 ── */

function ScheduleCard({ schedule, onOpenMatch }) {
  const groups = groupByDay(nearbyMatches(schedule));

  return (
    <section className="cl-card">
      <div className="cl-ch"><h3>일정</h3><span className="s">최근 · 예정</span></div>

      {groups.length === 0 ? (
        <p className="cl-empty">일정을 불러오는 중입니다.</p>
      ) : groups.map((g) => (
        <div key={g.key}>
          <div className="cl-dayh"><b>{g.label}</b>{g.sub}</div>
          {g.items.map((m) => {
            const [a, b] = m.teams ?? [];
            const done = m.state === 'completed';
            const now = m.state === 'inProgress';
            return (
              <button
                key={m.matchId}
                className={`cl-ev ${now ? 'now' : ''}`}
                onClick={() => onOpenMatch?.(m)}
              >
                <span className="cl-evt">{time(m.startTime)}</span>
                <span className={`cl-eva ${done && a?.outcome === 'loss' ? 'dim' : ''}`}>
                  {a?.code ?? '—'}
                </span>
                {done || now ? (
                  <span className="cl-evs">
                    {a?.gameWins ?? 0}<span className="c">:</span>{b?.gameWins ?? 0}
                  </span>
                ) : (
                  <span className="cl-evvs">VS</span>
                )}
                <span className={`cl-evb ${done && b?.outcome === 'loss' ? 'dim' : ''}`}>
                  {b?.code ?? '—'}
                </span>
                <span className="cl-evg"><Chevron /></span>
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}

/* ── 공용 ── */

function Reveal({ className, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.06 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`cl-reveal ${className}`}>{children}</div>;
}

/** 팀 로고가 없을 때 쓰는 대체 크레스트 */
function Crest({ size, tone }) {
  const color = tone === 'b' ? 'var(--cl-blue)' : tone === 'rd' ? 'var(--cl-red)' : 'var(--cl-mu)';
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M26 3 47 11v14c0 14-9 21-21 24C14 46 5 39 5 25V11Z" fill={color} opacity=".13" />
      <path d="M26 3 47 11v14c0 14-9 21-21 24C14 46 5 39 5 25V11Z" fill="none" stroke={color} strokeWidth="2.2" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="13" height="13">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── 값 가공 ── */

const record = (t) =>
  t && t.wins != null && t.losses != null
    ? `${t.wins}–${t.losses}${winRate(t.wins, t.losses) != null ? ` · ${winRate(t.wins, t.losses).toFixed(1)}%` : ''}`
    : '전적 없음';

function winRate(wins, losses) {
  if (wins == null || losses == null) return null;
  const total = wins + losses;
  return total > 0 ? (wins / total) * 100 : 0;
}

/** 경과 초 → M:SS */
function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const parse = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d; };

function time(iso) {
  const d = parse(iso);
  return d ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
}

function kickoff(iso) {
  const d = parse(iso);
  if (!d) return '시각 미정';
  return `${relativeDay(d) ?? d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${time(iso)}`;
}

function shortWhen(iso) {
  const d = parse(iso);
  if (!d) return '미정';
  const rel = relativeDay(d);
  return rel ? `${rel} ${time(iso)}` : `${d.getMonth() + 1}/${d.getDate()} ${time(iso)}`;
}

/** 오늘/내일/모레만 상대 표기하고 그 밖은 null */
function relativeDay(d) {
  const days = dayDiff(d);
  return days === 0 ? '오늘' : days === 1 ? '내일' : days === 2 ? '모레' : null;
}

function dayDiff(d) {
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((startOf(d) - startOf(new Date())) / 86400000);
}

function dayLabel(iso) {
  const d = parse(iso);
  if (!d) return '';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

const isMatch = (m) => Array.isArray(m?.teams) && m.teams.length >= 2;

function upcomingMatches(schedule) {
  return (schedule ?? [])
    .filter((m) => isMatch(m) && m.state === 'unstarted')
    .sort((x, y) => new Date(x.startTime) - new Date(y.startTime));
}

/**
 * 일정 카드에 담을 범위.
 * 전체를 그리면 수백 건이라 카드가 끝없이 늘어난다 — 최근 완료 몇 건과 앞으로의 일정만 남긴다.
 */
function nearbyMatches(schedule) {
  const all = (schedule ?? []).filter(isMatch);
  const past = all
    .filter((m) => m.state === 'completed')
    .sort((x, y) => new Date(y.startTime) - new Date(x.startTime))
    .slice(0, 3)
    .reverse();
  const nowPlaying = all.filter((m) => m.state === 'inProgress');
  const next = upcomingMatches(all).slice(0, 5);
  return [...past, ...nowPlaying, ...next];
}

function groupByDay(matches) {
  const out = [];
  for (const m of matches) {
    const d = parse(m.startTime);
    const key = d ? d.toDateString() : 'unknown';
    let g = out.find((x) => x.key === key);
    if (!g) {
      const rel = d ? relativeDay(d) : null;
      g = {
        key,
        label: rel ?? (d ? d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '미정'),
        sub: d ? d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : '',
        items: [],
      };
      // 상대 표기를 쓴 날은 부제에 날짜를 남기고, 아니면 요일만 남긴다
      if (!rel && d) g.sub = d.toLocaleDateString('ko-KR', { weekday: 'short' });
      out.push(g);
    }
    g.items.push(m);
  }
  return out;
}
