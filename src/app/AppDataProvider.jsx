import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  fetchBettingCandidates,
  fetchChampionStats,
  fetchLive,
  fetchPlayerKda,
  fetchRecentForm,
  fetchSchedule,
  fetchScoreboard,
  fetchTeamStandings,
} from '../api/index.js';

const META_POLL_MS = 5 * 60 * 1000;

/**
 * 순위 집계에 넣을 LCK 2026 대회(스플릿).
 *
 * 시즌이 스플릿 3개로 나뉘는데 1스플릿은 성격이 다른 컵 대회라
 * (2025 년에는 이름도 lck_cup 이었다) 정규 순위에서 제외한다.
 * 네이버·FlashScore 도 같은 기준으로 2·3스플릿만 합산한다.
 */
const LCK_2026_TOURNAMENTS = [
  '115548128960088078', // split 2
  '115548147890329817', // split 3
];
const LIVE_POLL_MS = 1000;
const BETTING_CANDIDATE_POLL_MS = 5 * 1000;
const BOARD_POLL_MS = 1000;
const AppDataContext = createContext(null);

const EMPTY_LIVE = { live: false, matches: [] };

/**
 * 라이브 응답을 화면이 기대하는 모양으로 맞춘다.
 *
 * `matches` 와 `games` 는 소비하는 쪽에서 곧바로 `filter`·`find` 를 부른다. 응답에
 * 이 배열이 없으면 렌더 도중 TypeError 가 나고, 이 Provider 가 사용자 페이지 전체를
 * 감싸고 있어 경기와 무관한 화면(샘플·일정·리워드)까지 같이 빈 화면이 된다.
 * 실패를 여기서 흡수해 라이브만 비어 보이게 한다.
 */
function normalizeLive(payload) {
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  return {
    live: payload?.live === true,
    matches: matches.map((match) => ({
      ...match,
      games: Array.isArray(match?.games) ? match.games : [],
    })),
  };
}

export function AppDataProvider({ children }) {
  const location = useLocation();
  const [schedule, setSchedule] = useState([]);
  const [teamStandings, setTeamStandings] = useState(null);
  const [recentForm, setRecentForm] = useState({});
  const [playerKda, setPlayerKda] = useState(null);
  const [champions, setChampions] = useState(null);
  const [live, setLive] = useState(EMPTY_LIVE);
  const [bettingCandidates, setBettingCandidates] = useState([]);
  const [scoreboard, setScoreboard] = useState(null);
  const [error, setError] = useState(null);
  const [activeWatchMatchId, setActiveWatchMatchId] = useState(null);
  const [userId, setUserId] = useState(
    () => window.localStorage.getItem('clutch-user-id') ?? '900001',
  );

  useEffect(() => {
    window.localStorage.setItem('clutch-user-id', userId);
  }, [userId]);

  const refreshLive = useCallback(async () => {
    try {
      const nextLive = await fetchLive();
      if (nextLive) setLive(normalizeLive(nextLive));
    } catch {
      // 라이브 조회는 다음 폴링에서 자동 복구한다.
    }
  }, []);

  const refreshBettingCandidates = useCallback(async () => {
    try {
      const nextCandidates = await fetchBettingCandidates();
      setBettingCandidates(nextCandidates ?? []);
    } catch {
      // 배팅 후보 조회는 다음 주기에서 자동 복구한다.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        const [nextSchedule, nextTeamStandings, nextRecentForm, nextKda, nextChampions] = await Promise.all([
          fetchSchedule(),
          fetchTeamStandings({ tournamentIds: LCK_2026_TOURNAMENTS }),
          fetchRecentForm(),
          fetchPlayerKda(),
          fetchChampionStats(),
        ]);
        if (cancelled) return;
        setSchedule(nextSchedule ?? []);
        setTeamStandings(nextTeamStandings?.groups ?? []);
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
    refreshLive();
    const timer = window.setInterval(refreshLive, LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshLive]);

  useEffect(() => {
    refreshBettingCandidates();
    const timer = window.setInterval(refreshBettingCandidates, BETTING_CANDIDATE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshBettingCandidates]);

  const watchableMatchIds = useMemo(() => live.matches
    .filter((match) => {
      const activeGame = match.games.find((game) => game.gameId === match.activeGameId);
      return Boolean(match.activeGameId) && activeGame?.feedFinished !== true;
    })
    .map((match) => match.matchId), [live.matches]);

  const autoWatchMatchId = watchableMatchIds[0] ?? null;

  useEffect(() => {
    // 최초 진입 때만 진행 중인 첫 경기를 선택한다. 세트가 종료됐다는 이유로
    // 사용자가 선택한 경기를 다른 경기로 바꾸면 시청 세션까지 의도치 않게 전환된다.
    setActiveWatchMatchId((currentMatchId) => currentMatchId ?? autoWatchMatchId);
  }, [autoWatchMatchId]);

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
    teamStandings,
    recentForm,
    playerKda,
    champions,
    live,
    bettingCandidates,
    scoreboard,
    error,
    refreshLive,
    refreshBettingCandidates,
    userId,
    setUserId,
    activeWatchMatchId,
    setActiveWatchMatchId,
  }), [
    schedule,
    teamStandings,
    recentForm,
    playerKda,
    champions,
    live,
    bettingCandidates,
    scoreboard,
    error,
    refreshLive,
    refreshBettingCandidates,
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
