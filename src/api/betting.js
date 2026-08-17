import { requestAsUser } from './client.js';

export const fetchCurrentBettingEvent = (matchId, userId) => requestAsUser(
  `/api/matches/${encodeURIComponent(matchId)}/betting-events/current`,
  userId,
  {
    allowNotFound: true,
    fallbackMessage: '현재 세트 배팅 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
);

export const placeBet = (bettingEventId, userId, selectedTeamId, amount) => requestAsUser(
  `/api/betting-events/${encodeURIComponent(bettingEventId)}/bets`,
  userId,
  {
    method: 'POST',
    body: { selectedTeamId, amount },
    fallbackMessage: '배팅을 등록하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.',
  },
);
