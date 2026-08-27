import { useCallback, useEffect, useState } from 'react';
import { fetchCurrentBettingEvent, placeBet } from '../../api/betting.js';

const MIN_BET_POINT = 1_000;
const MAX_BET_POINT = 100_000;
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
    bettingAvailable: true,
    myBet: null,
  };
}

/** 외부 팀 ID를 현재 라이브 매치의 표시 이름으로 변환한다. */
function teamLabel(match, teamId) {
  const team = match.teams?.find((candidate) => candidate.id === teamId);
  return team?.code ?? team?.name ?? teamId;
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

/** 세트 승리 팀 배팅을 조회하고 등록하는 최소 패널. 라이브 매치와 일정 화면의 승부예측 아코디언에서 함께 쓴다. */
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
  const loadEvent = useCallback(async ({ silent = false } = {}) => {
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

    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const nextEvent = await fetchCurrentBettingEvent(matchId, userId);
      setEvent(nextEvent);
      if (nextEvent?.myBet) {
        setSelectedTeamId(nextEvent.myBet.selectedTeamId);
      } else if (!silent) {
        setSelectedTeamId(null);
      }
    } catch (requestError) {
      if (!silent) {
        setEvent(null);
        setError(requestError.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [matchId, preview, userId]);

  useEffect(() => {
    // 사용자 전환 직후 이전 사용자의 성공 문구·내 배팅이 잠깐 남으면 잔여 포인트가
    // 동일한 것처럼 보인다. 새 사용자 조회가 끝날 때까지 해당 상태를 비운다.
    setEvent(null);
    setSelectedTeamId(null);
    setMessage(null);
    setError(null);
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (preview || !userId) return undefined;
    const timer = window.setInterval(() => {
      loadEvent({ silent: true });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [loadEvent, preview, userId]);

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
      {!loading && !error && !event && (
        <p className="betting-message">현재 열린 세트 배팅이 없습니다.</p>
      )}

      {event && (
        <>
          <div className="betting-meta">
            <span>{event.setNumber}세트</span>
            <span>{event.bettingAvailable ? '배팅 가능' : '배팅 닫힘'}</span>
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
                <p className="betting-message">배팅이 닫혔습니다.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
