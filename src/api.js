// 백엔드 /api/* 소비 (Vite dev proxy 경유)

async function getJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

/**
 * 사용자 식별이 필요한 API를 호출하고 백엔드 오류 메시지를 그대로 전달한다.
 *
 * @param {string} url 호출할 API 경로
 * @param {{userId: string|number, method?: string, body?: object}} options 요청 옵션
 * @returns {Promise<object>} JSON 응답
 */
async function requestAsUser(url, { userId, method = 'GET', body } = {}) {
  const headers = { 'X-User-Id': String(userId) };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.message ?? `${url} → HTTP ${res.status}`);
  }
  return payload;
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

/** 현재 매치에서 노출할 배팅 이벤트와 사용자의 참여 상태를 조회한다. */
export const fetchCurrentBettingEvent = (matchId, userId) =>
  requestAsUser(`/api/matches/${encodeURIComponent(matchId)}/betting-events/current`, { userId });

/** 선택한 팀과 포인트로 현재 사용자의 배팅을 등록한다. */
export const placeBet = (bettingEventId, userId, selectedTeamId, amount) =>
  requestAsUser(`/api/betting-events/${bettingEventId}/bets`, {
    userId,
    method: 'POST',
    body: { selectedTeamId, amount },
  });

/** 현재 사용자의 보유 포인트를 조회한다. */
export const fetchMyPoint = (userId) =>
  requestAsUser('/api/users/me/points', { userId });

/** 현재 사용자의 전체 배팅 이력을 최신 순서로 조회한다. */
export const fetchMyBets = (userId) =>
  requestAsUser('/api/users/me/bets', { userId });

/** 선택한 라이브 매치의 실제 시청 세션을 시작하거나 이어받는다. */
export const startWatchSession = (userId, matchId) =>
  requestAsUser(
    `/api/users/${encodeURIComponent(userId)}/matches/${encodeURIComponent(matchId)}/watch-sessions`,
    { userId, method: 'POST' },
  );

/** 서버가 안내한 순번으로 시청 중 heartbeat를 전송한다. */
export const sendWatchHeartbeat = (userId, sessionKey, sequence) =>
  requestAsUser(
    `/api/users/${encodeURIComponent(userId)}/watch-sessions/${encodeURIComponent(sessionKey)}/heartbeat`,
    { userId, method: 'POST', body: { sequence } },
  );

/** 현재 수령 가능 회차의 시청 포인트를 지급받는다. */
export const claimWatchPoint = (userId, sessionKey, rewardSequence) =>
  requestAsUser(
    `/api/users/${encodeURIComponent(userId)}/watch-sessions/${encodeURIComponent(sessionKey)}/point-claims`,
    { userId, method: 'POST', body: { rewardSequence } },
  );
