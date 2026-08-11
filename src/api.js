// 백엔드 /api/* 소비 (Vite dev proxy 경유)

async function getJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

export const fetchSchedule = () => getJson('/api/schedule');
export const fetchStandings = () => getJson('/api/standings');
export const fetchLive = () => getJson('/api/live');
export const fetchMatchGames = (matchId) => getJson(`/api/matches/${matchId}/games`);
// 팀 id 포함 — 스코어보드의 esportsTeamId 와 매칭해 진영(블루/레드)을 판별한다
export const fetchMatchTeams = (matchId) => getJson(`/api/matches/${matchId}/teams`);
// lag: 0 = 최신 우선(피드 물리 하한), N초 = 재생 지연, 생략 = 서버 기본값
export const fetchScoreboard = (gameId, lag) =>
  getJson(`/api/live/${gameId}/scoreboard${lag != null ? `?lag=${lag}` : ''}`);
export const fetchDetails = (gameId, lag) =>
  getJson(`/api/live/${gameId}/details${lag != null ? `?lag=${lag}` : ''}`);
// step: 그래프 해상도(초). 10초면 게임 전체가 200여 점으로 촘촘하게 그려진다
export const fetchHistory = (gameId, lag, step = 10) =>
  getJson(`/api/live/${gameId}/history?step=${step}${lag != null ? `&lag=${lag}` : ''}`);
export const fetchRecentForm = () => getJson('/api/records/recent');
export const fetchHeadToHead = (a, b) =>
  getJson(`/api/records/h2h?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
