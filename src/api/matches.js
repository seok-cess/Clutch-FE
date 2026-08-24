import { requestJson } from './client.js';

export const fetchSchedule = () => requestJson('/api/schedule', { allowNotFound: true });
export const fetchStandings = () => requestJson('/api/standings', { allowNotFound: true });
export const fetchLive = () => requestJson('/api/live', { allowNotFound: true });

/**
 * 팀 순위표 (매치 기준 승·패·승률·세트 득실).
 *
 * LCK 는 한 시즌이 여러 스플릿으로 나뉘고, 무엇을 합쳐 보여줄지는 화면 판단이라
 * 대회 id 목록을 넘긴다. 미지정이면 서버가 현재 대회 하나만 집계한다.
 */
export const fetchTeamStandings = ({ season, leagueId, tournamentIds } = {}) => {
  const params = new URLSearchParams();
  if (season) params.set('season', season);
  if (leagueId) params.set('leagueId', leagueId);
  if (tournamentIds?.length) params.set('tournamentIds', tournamentIds.join(','));
  const query = params.toString();
  return requestJson(`/api/standings/teams${query ? `?${query}` : ''}`, { allowNotFound: true });
};
export const fetchMatchGames = (matchId) => (
  requestJson(`/api/matches/${encodeURIComponent(matchId)}/games`, { allowNotFound: true })
);
export const fetchMatchTeams = (matchId) => (
  requestJson(`/api/matches/${encodeURIComponent(matchId)}/teams`, { allowNotFound: true })
);
export const fetchScoreboard = (gameId, lag) => requestJson(
  `/api/live/${encodeURIComponent(gameId)}/scoreboard${lag != null ? `?lag=${lag}` : ''}`,
  { allowNotFound: true },
);
export const fetchDetails = (gameId, lag) => requestJson(
  `/api/live/${encodeURIComponent(gameId)}/details${lag != null ? `?lag=${lag}` : ''}`,
  { allowNotFound: true },
);
export const fetchHistory = (gameId, lag, step) => {
  const params = new URLSearchParams();
  if (step != null) params.set('step', String(step));
  if (lag != null) params.set('lag', String(lag));
  const query = params.toString();
  return requestJson(
    `/api/live/${encodeURIComponent(gameId)}/history${query ? `?${query}` : ''}`,
    { allowNotFound: true },
  );
};
export const fetchRecentForm = () => requestJson('/api/records/recent', { allowNotFound: true });
export const fetchHeadToHead = (firstTeam, secondTeam) => requestJson(
  `/api/records/h2h?a=${encodeURIComponent(firstTeam)}&b=${encodeURIComponent(secondTeam)}`,
  { allowNotFound: true },
);
export const fetchPlayerKda = (limit = 5) => (
  requestJson(`/api/stats/players/kda?limit=${limit}`, { allowNotFound: true })
);
export const fetchChampionStats = (limit = 5) => (
  requestJson(`/api/stats/champions?limit=${limit}`, { allowNotFound: true })
);
