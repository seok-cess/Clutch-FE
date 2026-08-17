import { requestJson } from './client.js';

export const fetchSchedule = () => requestJson('/api/schedule', { allowNotFound: true });
export const fetchStandings = () => requestJson('/api/standings', { allowNotFound: true });
export const fetchLive = () => requestJson('/api/live', { allowNotFound: true });
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
export const fetchHistory = (gameId, lag, step = 10) => requestJson(
  `/api/live/${encodeURIComponent(gameId)}/history?step=${step}${lag != null ? `&lag=${lag}` : ''}`,
  { allowNotFound: true },
);
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
