import { useEffect, useState } from 'react';
import { fetchSchedule, fetchStandings, fetchLive, fetchRecentForm } from './api.js';
import ScheduleList from './components/ScheduleList.jsx';
import StandingsTable from './components/StandingsTable.jsx';
import LiveScoreboard from './components/LiveScoreboard.jsx';
import DebugPanel from './components/DebugPanel.jsx';
import MatchGamesPanel from './components/MatchGamesPanel.jsx';
import MyPagePanel from './components/MyPagePanel.jsx';
import { LIVE_PREVIEW_GAME, LIVE_PREVIEW_MATCH } from './preview/livePreviewData.js';

const META_POLL_MS = 5 * 60 * 1000; // 일정/순위 갱신
const LIVE_POLL_MS = 1000;          // 세트 시작·종료 상태 갱신

const TABS = [
  { id: 'live', label: '라이브' },
  { id: 'schedule', label: '일정 · 결과' },
  { id: 'standings', label: '순위' },
  { id: 'my', label: '내 정보' },
  { id: 'diagnostics', label: '진단' },
];

export default function App() {
  const preview = new URLSearchParams(window.location.search).get('preview') === 'live';
  if (preview) {
    return <LiveFeaturePreview />;
  }
  return <LiveApplication />;
}

/** 실제 백엔드 데이터를 사용하는 기본 애플리케이션. */
function LiveApplication() {
  const [schedule, setSchedule] = useState([]);
  const [standings, setStandings] = useState([]);
  const [recentForm, setRecentForm] = useState({}); // 팀코드 → 최근 5경기
  const [live, setLive] = useState({ live: false, matches: [] });
  const [tab, setTab] = useState('live');
  const [selectedMatch, setSelectedMatch] = useState(null); // 설정 시 상세 화면으로 전환
  const [error, setError] = useState(null);
  const [activeWatchMatchId, setActiveWatchMatchId] = useState(null);
  const [userId, setUserId] = useState(
    () => window.localStorage.getItem('clutch-user-id') ?? '900001',
  );

  useEffect(() => {
    window.localStorage.setItem('clutch-user-id', userId);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        const [s, st, rf] = await Promise.all([fetchSchedule(), fetchStandings(), fetchRecentForm()]);
        if (cancelled) return;
        setSchedule(s ?? []);
        setStandings(st ?? []);
        setRecentForm(rf ?? {});
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };
    loadMeta();
    const t = setInterval(loadMeta, META_POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLive = async () => {
      try {
        const l = await fetchLive();
        if (!cancelled && l) setLive(l);
      } catch {
        // 라이브 목록 조회 실패는 조용히 다음 폴링에서 재시도
      }
    };
    loadLive();
    const t = setInterval(loadLive, LIVE_POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // 상세로 이동하면 화면 상단부터 보이게
  const openMatch = (match) => {
    setSelectedMatch(match);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const autoWatchMatchId = live.matches.find((match) => {
    const activeGame = match.games.find((game) => game.gameId === match.activeGameId);
    return Boolean(match.activeGameId) && activeGame?.feedFinished !== true;
  })?.matchId;

  useEffect(() => {
    const watchableMatchIds = live.matches
      .filter((match) => {
        const activeGame = match.games.find((game) => game.gameId === match.activeGameId);
        return Boolean(match.activeGameId) && activeGame?.feedFinished !== true;
      })
      .map((match) => match.matchId);

    setActiveWatchMatchId((currentMatchId) => (
      currentMatchId && watchableMatchIds.includes(currentMatchId)
        ? currentMatchId
        : (autoWatchMatchId ?? null)
    ));
  }, [autoWatchMatchId, live.matches, userId]);

  // ---- 경기 상세 화면 (목록을 대체) ----
  if (selectedMatch) {
    return (
      <div className="app">
        <Header live={live.live} userId={userId} onUserIdChange={setUserId} />
        <MatchGamesPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </div>
    );
  }

  // ---- 메인 화면 ----
  return (
    <div className="app">
      <Header live={live.live} userId={userId} onUserIdChange={setUserId} />

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="error">데이터를 불러오지 못했습니다: {error}</div>}

      {tab === 'live' && (
        live.live
          ? live.matches.map((m) => (
            <LiveScoreboard
              key={m.matchId}
              match={m}
              userId={userId}
              watchRewardActive={m.matchId === activeWatchMatchId}
              onWatchMatchChange={setActiveWatchMatchId}
            />
          ))
          : (
            <section className="panel cropmarks">
              <span className="kicker">LIVE TELEMETRY</span>
              <h2>현재 진행 중인 경기가 없습니다.</h2>
            </section>
          )
      )}

      {tab === 'schedule' && (
        <section className="panel cropmarks">
          <span className="kicker">SCHEDULE / RESULTS</span>
          <h2>일정 · 결과 <span className="muted">경기를 선택하면 세트별 기록으로 이동합니다</span></h2>
          <ScheduleList schedule={schedule} onSelect={openMatch} recentForm={recentForm} />
        </section>
      )}

      {tab === 'standings' && (
        <section className="panel cropmarks">
          <span className="kicker">STANDINGS</span>
          <h2>순위</h2>
          <StandingsTable standings={standings} />
        </section>
      )}

      {tab === 'my' && (
        <MyPagePanel
          userId={userId}
          matches={[...live.matches, ...schedule]}
        />
      )}

      {tab === 'diagnostics' && <DebugPanel />}
    </div>
  );
}

/** 라이브 경기의 시청 포인트와 배팅 흐름을 데이터 없이 체험하는 개발용 화면. */
function LiveFeaturePreview() {
  const [userId, setUserId] = useState('900001');

  return (
    <div className="app">
      <Header live userId={userId} onUserIdChange={setUserId} />
      <div className="preview-notice">
        <strong>INTERACTIVE PREVIEW</strong>
        <span>실제 포인트나 배팅 데이터는 변경되지 않습니다.</span>
      </div>
      <LiveScoreboard
        match={LIVE_PREVIEW_MATCH}
        userId={userId}
        preview
        gamePreview={LIVE_PREVIEW_GAME}
      />
    </div>
  );
}

function Header({ live, userId, onUserIdChange }) {
  return (
    <header className="header">
      <h1>LCK LIVE TELEMETRY</h1>
      {live ? <span className="badge live">LIVE</span> : <span className="badge">NO LIVE MATCH</span>}
      <label className="header-user">
        <span>USER ID</span>
        <input
          type="number"
          min="1"
          value={userId}
          onChange={(event) => onUserIdChange(event.target.value)}
          aria-label="사용자 ID"
        />
      </label>
    </header>
  );
}
