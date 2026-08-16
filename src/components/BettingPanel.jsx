import { useCallback, useEffect, useState } from 'react';
import { fetchCurrentBettingEvent, placeBet } from '../api.js';

const MIN_BET_POINT = 1_000;
const MAX_BET_POINT = 100_000;
const BETTING_STATUS_LABEL = {
  OPEN: '배팅 가능',
  CLOSED: '배팅 마감',
  SETTLED: '정산 완료',
  CANCELLED: '배팅 취소',
};
const BETTING_UNAVAILABLE_MESSAGE = {
  CLOSED: '배팅이 마감되었습니다.',
  SETTLED: '배팅 정산이 완료되었습니다.',
  CANCELLED: '배팅이 취소되었습니다.',
};
const USER_BET_STATUS_LABEL = {
  PLACED: '접수 완료',
  WON: '적중',
  LOST: '미적중',
  REFUNDED: '환불 완료',
};

/** 개발용 라이브 프리뷰에서 사용할 열린 2세트 배팅 이벤트를 생성한다. */
function createPreviewEvent(match) {
  return {
    bettingEventId: 132,
    externalMatchId: match.matchId,
    externalGameId: null,
    setNumber: 2,
    firstTeamId: match.teams[0].id,
    secondTeamId: match.teams[1].id,
    status: 'OPEN',
    closesAt: '2026-08-16T15:40:00',
    remainingSeconds: 742,
    bettingAvailable: true,
    myBet: null,
  };
}

/** 외부 팀 ID를 현재 라이브 매치의 표시 이름으로 변환한다. */
function teamLabel(match, teamId) {
  const team = match.teams?.find((candidate) => candidate.id === teamId);
  return team?.code ?? team?.name ?? teamId;
}

/** 배팅 마감까지 남은 초를 MM:SS로 표시한다. */
function formatRemainingTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** 키보드로 입력한 배팅액이 허용 범위인지 검증한다. */
function validateBetAmount(value) {
  if (!/^\d+$/.test(value)) return '배팅 포인트를 숫자로 입력해 주세요.';
  const point = Number(value);
  if (point < MIN_BET_POINT || point > MAX_BET_POINT) {
    return `${MIN_BET_POINT.toLocaleString()}P 이상 ${MAX_BET_POINT.toLocaleString()}P 이하로 입력해 주세요.`;
  }
  return null;
}

/** 라이브 매치에서 현재 세트 배팅을 조회하고 등록하는 최소 패널. */
export default function BettingPanel({ match, userId, preview = false }) {
  const matchId = match.matchId;
  const [event, setEvent] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [amount, setAmount] = useState(MIN_BET_POINT);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  /** 사용자와 매치에 해당하는 최신 배팅 이벤트를 다시 불러온다. */
  const loadEvent = useCallback(async () => {
    if (preview) {
      setEvent((currentEvent) => currentEvent ?? createPreviewEvent(match));
      setLoading(false);
      setError(null);
      return;
    }
    if (!userId) {
      setEvent(null);
      setError('상단에 사용자 ID를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextEvent = await fetchCurrentBettingEvent(matchId, userId);
      setEvent(nextEvent);
      setSelectedTeamId(nextEvent.myBet?.selectedTeamId ?? null);
    } catch (requestError) {
      setEvent(null);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [matchId, preview, userId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!event || event.status !== 'OPEN' || event.remainingSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setEvent((currentEvent) => {
        if (!currentEvent || currentEvent.remainingSeconds <= 0) return currentEvent;
        const remainingSeconds = currentEvent.remainingSeconds - 1;
        if (remainingSeconds === 0) window.clearInterval(timer);
        return {
          ...currentEvent,
          remainingSeconds,
          bettingAvailable: remainingSeconds > 0 && currentEvent.bettingAvailable,
        };
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [event?.bettingEventId, event?.status]);

  /** 선택한 팀과 포인트로 배팅을 등록한 뒤 최신 이벤트를 갱신한다. */
  const submitBet = async () => {
    if (!event || !selectedTeamId) {
      setError('배팅할 팀을 선택해 주세요.');
      return;
    }
    const amountError = validateBetAmount(amount);
    if (amountError) {
      setError(amountError);
      return;
    }
    const betPoint = Number(amount);

    setPlacing(true);
    setError(null);
    setMessage(null);
    try {
      if (preview) {
        setEvent((currentEvent) => ({
          ...currentEvent,
          bettingAvailable: false,
          myBet: {
            userBetId: 132,
            selectedTeamId,
            amount: betPoint,
            status: 'PLACED',
          },
        }));
        setMessage(`배팅 완료 · 잔여 ${(50_000 - betPoint).toLocaleString()}P`);
        return;
      }
      const result = await placeBet(
        event.bettingEventId,
        userId,
        selectedTeamId,
        betPoint,
      );
      setMessage(`배팅 완료 · 잔여 ${result.remainingPoint.toLocaleString()}P`);
      await loadEvent();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="betting-panel">
      <div className="betting-heading">
        <div>
          <span className="kicker">SET BETTING</span>
          <h3>현재 세트 승리 팀</h3>
        </div>
        <button type="button" className="betting-refresh" onClick={loadEvent} disabled={loading}>
          {loading ? '조회 중' : '새로고침'}
        </button>
      </div>

      {error && <p className="betting-message error">{error}</p>}
      {message && <p className="betting-message success">{message}</p>}

      {event && (
        <>
          <div className="betting-meta">
            <span>{event.setNumber}세트</span>
            <span>{BETTING_STATUS_LABEL[event.status] ?? event.status}</span>
            <span>
              {event.remainingSeconds >= 0
                ? `${formatRemainingTime(event.remainingSeconds)} 남음`
                : '마감 시각 확인 중'}
            </span>
          </div>

          {event.myBet ? (
            <div className="my-bet">
              <span>내 배팅</span>
              <strong>{teamLabel(match, event.myBet.selectedTeamId)}</strong>
              <span>{event.myBet.amount.toLocaleString()}P</span>
              <span>{USER_BET_STATUS_LABEL[event.myBet.status] ?? event.myBet.status}</span>
            </div>
          ) : (
            <>
              <div className="betting-teams">
                {[event.firstTeamId, event.secondTeamId].map((teamId) => (
                  <button
                    key={teamId}
                    type="button"
                    className={selectedTeamId === teamId ? 'selected' : ''}
                    onClick={() => setSelectedTeamId(teamId)}
                    disabled={!event.bettingAvailable || placing}
                  >
                    {teamLabel(match, teamId)}
                  </button>
                ))}
              </div>

              <div className="betting-submit">
                <label>
                  <span>배팅 포인트</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    aria-label="배팅액"
                    placeholder="1,000 ~ 100,000"
                    value={amount}
                    onFocus={(inputEvent) => inputEvent.currentTarget.select()}
                    onChange={(inputEvent) => {
                      setAmount(inputEvent.target.value.replace(/\D/g, ''));
                      setError(null);
                    }}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === 'Enter' && !placing) submitBet();
                    }}
                    disabled={!event.bettingAvailable || placing}
                  />
                </label>
                <button
                  type="button"
                  onClick={submitBet}
                  disabled={!event.bettingAvailable || !selectedTeamId || placing}
                >
                  {placing ? '등록 중' : '배팅하기'}
                </button>
              </div>

              {!event.bettingAvailable && (
                <p className="betting-message">
                  {BETTING_UNAVAILABLE_MESSAGE[event.status]
                    ?? '현재는 배팅을 등록할 수 없습니다.'}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
