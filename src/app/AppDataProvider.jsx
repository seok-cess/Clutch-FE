import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  fetchChampionStats,
  fetchLive,
  fetchPlayerKda,
  fetchRecentForm,
  fetchSchedule,
  fetchScoreboard,
  fetchStandings,
} from '../api/index.js';

const META_POLL_MS = 5 * 60 * 1000;
const LIVE_POLL_MS = 1000;
const BOARD_POLL_MS = 5 * 1000;
const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const location = useLocation();
  const [schedule, setSchedule] = useState([]);
  const [standings, setStandings] = useState([]);
  const [recentForm, setRecentForm] = useState({});
  const [playerKda, setPlayerKda] = useState(null);
  const [champions, setChampions] = useState(null);
  const [live, setLive] = useState({ live: false, matches: [] });
  const [scoreboard, setScoreboard] = useState(null);
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
        const [nextSchedule, nextStandings, nextRecentForm, nextKda, nextChampions] = await Promise.all([
          fetchSchedule(),
          fetchStandings(),
          fetchRecentForm(),
          fetchPlayerKda(),
          fetchChampionStats(),
        ]);
        if (cancelled) return;
        setSchedule(nextSchedule ?? []);
        setStandings(nextStandings ?? []);
        setRecentForm(nextRecentForm ?? {});
        setPlayerKda(nextKda);
        setChampions(nextChampions);
        setError(null);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    loadMeta();
    const timer = window.setInterval(loadMeta, META_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLive = async () => {
      try {
        const nextLive = await fetchLive();
        if (!cancelled && nextLive) setLive(nextLive);
      } catch {
        // 라이브 조회는 다음 폴링에서 자동 복구한다.
      }
    };
    loadLive();
    const timer = window.setInterval(loadLive, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const watchableMatchIds = useMemo(() => live.matches
    .filter((match) => {
      const activeGame = match.games.find((game) => game.gameId === match.activeGameId);
      return Boolean(match.activeGameId) && activeGame?.feedFinished !== true;
    })
    .map((match) => match.matchId), [live.matches]);

  const autoWatchMatchId = watchableMatchIds[0] ?? null;

  useEffect(() => {
    setActiveWatchMatchId((currentMatchId) => (
      currentMatchId && watchableMatchIds.includes(currentMatchId)
        ? currentMatchId
        : autoWatchMatchId
    ));
  }, [autoWatchMatchId, watchableMatchIds, userId]);

  useEffect(() => {
    if (!autoWatchMatchId || location.pathname !== '/') {
      setScoreboard(null);
      return undefined;
    }
    const match = live.matches.find((candidate) => candidate.matchId === autoWatchMatchId);
    const gameId = match?.activeGameId;
    if (!gameId) return undefined;

    let cancelled = false;
    const loadBoard = async () => {
      try {
        const nextScoreboard = await fetchScoreboard(gameId);
        if (!cancelled) setScoreboard(nextScoreboard);
      } catch {
        // 아직 프레임이 없으면 다음 폴링에서 다시 시도한다.
      }
    };
    loadBoard();
    const timer = window.setInterval(loadBoard, BOARD_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [autoWatchMatchId, live.matches, location.pathname]);

  const value = useMemo(() => ({
    schedule,
    standings,
    recentForm,
    playerKda,
    champions,
    live,
    scoreboard,
    error,
    userId,
    setUserId,
    activeWatchMatchId,
    setActiveWatchMatchId,
  }), [
    schedule,
    standings,
    recentForm,
    playerKda,
    champions,
    live,
    scoreboard,
    error,
    userId,
    activeWatchMatchId,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData는 AppDataProvider 안에서 사용해야 합니다.');
  return value;
}
