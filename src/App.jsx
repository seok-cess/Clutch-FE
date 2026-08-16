import { useEffect, useState } from 'react';
import {
  fetchSchedule, fetchStandings, fetchLive, fetchRecentForm,
  fetchPlayerKda, fetchChampionStats, fetchScoreboard,
} from './api.js';
import './mainScreen.css';
import MainScreen from './components/MainScreen.jsx';
import ScheduleList from './components/ScheduleList.jsx';
import StandingsTable from './components/StandingsTable.jsx';
import LiveScoreboard from './components/LiveScoreboard.jsx';
import DebugPanel from './components/DebugPanel.jsx';
import MatchGamesPanel from './components/MatchGamesPanel.jsx';
import MyPagePanel from './components/MyPagePanel.jsx';
import { LIVE_PREVIEW_GAME, LIVE_PREVIEW_MATCH } from './preview/livePreviewData.js';

const META_POLL_MS = 5 * 60 * 1000; // 일정/순위/시즌 집계 갱신
const LIVE_POLL_MS = 1000;          // 세트 시작·종료 상태 갱신
const BOARD_POLL_MS = 5 * 1000;     // 홈 히어로의 스코어 갱신

const TABS = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'live', label: '라이브', icon: 'live' },
  { id: 'schedule', label: '일정', icon: 'schedule' },
  { id: 'standings', label: '순위', icon: 'standings' },
  { id: 'my', label: '내 정보', icon: 'reward' },
  { id: 'diagnostics', label: '진단', icon: 'debug' },
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
  const [playerKda, setPlayerKda] = useState(null); // 시즌 누적 KDA 상위
  const [champions, setChampions] = useState(null); // 시즌 챔피언 픽률·승률
  const [live, setLive] = useState({ live: false, matches: [] });
  const [scoreboard, setScoreboard] = useState(null); // 홈 히어로용 진행 중 세트 스코어
  const [tab, setTab] = useState('home');
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
        const [s, st, rf, kda, ch] = await Promise.all([
          fetchSchedule(), fetchStandings(), fetchRecentForm(),
          fetchPlayerKda(), fetchChampionStats(),
        ]);
        if (cancelled) return;
        setSchedule(s ?? []);
        setStandings(st ?? []);
        setRecentForm(rf ?? {});
        setPlayerKda(kda);
        setChampions(ch);
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

  // 홈 히어로의 킬·타워·골드차. 홈 탭에서 진행 중인 세트가 있을 때만 폴링한다.
  useEffect(() => {
    if (!autoWatchMatchId || tab !== 'home') { setScoreboard(null); return undefined; }
    const gameId = live.matches.find((m) => m.matchId === autoWatchMatchId)?.activeGameId;
    if (!gameId) { setScoreboard(null); return undefined; }

    let cancelled = false;
    const load = async () => {
      try {
        const sb = await fetchScoreboard(gameId);
        if (!cancelled) setScoreboard(sb);
      } catch {
        // 프레임이 아직 없을 수 있다 — 다음 폴링에서 다시 시도
      }
    };
    load();
    const t = setInterval(load, BOARD_POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [autoWatchMatchId, live.matches, tab]);

  const header = (
    <Header
      tab={tab}
      onTab={(id) => { setSelectedMatch(null); setTab(id); }}
      hasLive={live.live}
      userId={userId}
      onUserIdChange={setUserId}
    />
  );

  // ---- 경기 상세 화면 (목록을 대체) ----
  if (selectedMatch) {
    return (
      <div className="cl">
        {header}
        <div className="app">
          <MatchGamesPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
        </div>
      </div>
    );
  }

  // ---- 홈: 새 메인 화면 ----
  if (tab === 'home') {
    return (
      <div className="cl">
        {header}
        <main className="cl-page">
          {error && <div className="cl-error">데이터를 불러오지 못했습니다: {error}</div>}
          <MainScreen
            live={live}
            schedule={schedule}
            standings={standings}
            recentForm={recentForm}
            playerKda={playerKda}
            champions={champions}
            scoreboard={scoreboard}
            onOpenMatch={openMatch}
            onGoLive={() => setTab('live')}
            onGoSchedule={() => setTab('schedule')}
          />
        </main>
      </div>
    );
  }

  // ---- 그 밖의 탭: 기존 화면을 그대로 유지한다 ----
  return (
    <div className="cl">
      {header}
      <div className="app">
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
    </div>
  );
}

/** 라이브 경기의 시청 포인트와 배팅 흐름을 데이터 없이 체험하는 개발용 화면. */
function LiveFeaturePreview() {
  const [userId, setUserId] = useState('900001');

  return (
    <div className="app">
      <header className="header">
        <h1>LCK LIVE TELEMETRY</h1>
        <span className="badge live">LIVE</span>
        <UserIdField userId={userId} onUserIdChange={setUserId} className="header-user" />
      </header>
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

function Header({ tab, onTab, hasLive, userId, onUserIdChange }) {
  return (
    <header className="cl-top">
      <div className="cl-brand">CLUTCH<i /></div>
      <nav className="cl-tabs" aria-label="주요 메뉴">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => onTab(t.id)}
          >
            <TabIcon name={t.icon} />
            {t.label}
            {/* 중계 중일 때만 켜져 홈에서도 경기 진행 여부가 보인다 */}
            {t.id === 'live' && hasLive && <i className="cl-livedot" title="경기 진행 중" />}
          </button>
        ))}
      </nav>
      <div className="cl-util">
        {/* 인증이 붙기 전까지 시청 포인트·배팅 흐름을 확인하려면 사용자 전환이 필요하다 */}
        <UserIdField userId={userId} onUserIdChange={onUserIdChange} className="cl-userid" />
        <button className="cl-bell" aria-label="알림">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 19a2 2 0 0 0 4 0" />
          </svg>
        </button>
        <div className="cl-profile"><span className="cl-avatar">CL</span></div>
      </div>
    </header>
  );
}

function UserIdField({ userId, onUserIdChange, className }) {
  return (
    <label className={className}>
      <span>USER ID</span>
      <input
        type="number"
        min="1"
        value={userId}
        onChange={(event) => onUserIdChange(event.target.value)}
        aria-label="사용자 ID"
      />
    </label>
  );
}

function TabIcon({ name }) {
  const paths = {
    home: 'M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1H15V15H9v5.5H4.5a1 1 0 0 1-1-1Z',
    live: 'M4 11a8 8 0 0 1 16 0M7.5 8.5a4.5 4.5 0 0 1 9 0M12 21v-9M9 21h6',
    schedule: 'M3.5 9.5h17M8 3v4M16 3v4M5 5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 5Z',
    standings: 'M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4ZM6 6H3.5a2.5 2.5 0 0 0 2.5 4M18 6h2.5a2.5 2.5 0 0 1-2.5 4',
    reward: 'M20 12v8H4v-8M2 8h20v4H2zM12 8v12M12 8c-1.2-2.6-3-4-4.6-4C5.8 4 5 5 5 6.2 5 7.6 6.4 8 8 8h4ZM12 8c1.2-2.6 3-4 4.6-4C18.2 4 19 5 19 6.2 19 7.6 17.6 8 16 8h-4Z',
    debug: 'M9 6h6M8 10h8M6 14h12M9 18h6',
  };
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] ?? paths.home} />
    </svg>
  );
}
