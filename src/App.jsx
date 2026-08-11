import { useEffect, useState } from 'react';
import { fetchSchedule, fetchStandings, fetchLive, fetchRecentForm } from './api.js';
import ScheduleList from './components/ScheduleList.jsx';
import StandingsTable from './components/StandingsTable.jsx';
import LiveScoreboard from './components/LiveScoreboard.jsx';
import DebugPanel from './components/DebugPanel.jsx';
import MatchGamesPanel from './components/MatchGamesPanel.jsx';

const META_POLL_MS = 5 * 60 * 1000; // 일정/순위 갱신
const LIVE_POLL_MS = 30 * 1000;     // 라이브 매치 목록 갱신

const TABS = [
  { id: 'schedule', label: '일정 · 결과' },
  { id: 'standings', label: '순위' },
  { id: 'diagnostics', label: '진단' },
];

export default function App() {
  const [schedule, setSchedule] = useState([]);
  const [standings, setStandings] = useState([]);
  const [recentForm, setRecentForm] = useState({}); // 팀코드 → 최근 5경기
  const [live, setLive] = useState({ live: false, matches: [] });
  const [tab, setTab] = useState('schedule');
  const [selectedMatch, setSelectedMatch] = useState(null); // 설정 시 상세 화면으로 전환
  const [error, setError] = useState(null);

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

  // ---- 경기 상세 화면 (목록을 대체) ----
  if (selectedMatch) {
    return (
      <div className="app">
        <Header live={live.live} />
        <MatchGamesPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </div>
    );
  }

  // ---- 메인 화면 ----
  return (
    <div className="app">
      <Header live={live.live} />

      {error && <div className="error">데이터를 불러오지 못했습니다: {error}</div>}

      {live.live && live.matches.map((m) => (
        <LiveScoreboard key={m.matchId} match={m} />
      ))}

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

      {tab === 'diagnostics' && <DebugPanel />}
    </div>
  );
}

function Header({ live }) {
  return (
    <header className="header">
      <h1>LCK LIVE TELEMETRY</h1>
      {live ? <span className="badge live">LIVE</span> : <span className="badge">NO LIVE MATCH</span>}
    </header>
  );
}
