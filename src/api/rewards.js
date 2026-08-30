import { requestAsUser, requestJson } from './client.js';

export const fetchMyPoint = (userId) => requestAsUser('/api/users/me/points', userId, {
  fallbackMessage: '포인트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
});
export const fetchMyBets = (userId) => requestAsUser('/api/users/me/bets', userId, {
  fallbackMessage: '배팅 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
});

export const fetchMyPointSummary = (userId) => requestAsUser('/api/users/me/point-summary', userId, {
  fallbackMessage: '포인트 요약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
});
export const fetchMyPointRanking = (userId) => requestAsUser('/api/users/me/point-ranking', userId, {
  fallbackMessage: '내 순위를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
});
export const fetchPointRankings = () => requestJson('/api/users/point-rankings', {
  fallbackMessage: '포인트 순위를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
});

export const startWatchSession = (userId, matchId) => requestAsUser(
  `/api/users/${encodeURIComponent(userId)}/matches/${encodeURIComponent(matchId)}/watch-sessions`,
  userId,
  { method: 'POST' },
);

export const sendWatchHeartbeat = (userId, sessionKey, sequence) => requestAsUser(
  `/api/users/${encodeURIComponent(userId)}/watch-sessions/${encodeURIComponent(sessionKey)}/heartbeat`,
  userId,
  { method: 'POST', body: { sequence } },
);

export const claimWatchPoint = (userId, sessionKey, rewardSequence) => requestAsUser(
  `/api/users/${encodeURIComponent(userId)}/watch-sessions/${encodeURIComponent(sessionKey)}/point-claims`,
  userId,
  { method: 'POST', body: { rewardSequence } },
);
