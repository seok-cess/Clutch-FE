import { useCallback, useEffect, useRef, useState } from 'react';
import { claimWatchPoint, sendWatchHeartbeat, startWatchSession } from '../api.js';

const CLAIM_INTERVAL_SECONDS = 5 * 60;
const DEFAULT_REWARD_POINT = 100;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function initialReward() {
  return {
    rewardState: 'IDLE',
    rewardSequence: 1,
    accumulatedSeconds: 0,
    remainingSeconds: CLAIM_INTERVAL_SECONDS,
    rewardPoint: DEFAULT_REWARD_POINT,
  };
}

/** 실제 시청 세션의 heartbeat와 포인트 수령 상태를 표시한다. */
export default function WatchPointPanel({ matchId, userId, enabled, active, onActivate }) {
  const [session, setSession] = useState(null);
  const [reward, setReward] = useState(initialReward);
  const [displayedSeconds, setDisplayedSeconds] = useState(0);
  const [totalPoint, setTotalPoint] = useState(null);
  const [starting, setStarting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState('시청 시작 버튼을 누르면 시간이 누적됩니다.');
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);
  const sequenceRef = useRef(0);
  const heartbeatTimerRef = useRef(null);
  const heartbeatInFlightRef = useRef(false);
  const generationRef = useRef(0);

  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current != null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const resetSession = useCallback((nextMessage) => {
    generationRef.current += 1;
    clearHeartbeatTimer();
    heartbeatInFlightRef.current = false;
    sessionRef.current = null;
    sequenceRef.current = 0;
    setSession(null);
    setReward(initialReward());
    setDisplayedSeconds(0);
    setStarting(false);
    setClaiming(false);
    setMessage(nextMessage);
  }, [clearHeartbeatTimer]);

  const heartbeat = useCallback(async (generation = generationRef.current) => {
    const activeSession = sessionRef.current;
    if (!activeSession || heartbeatInFlightRef.current
        || document.visibilityState !== 'visible') return;

    heartbeatInFlightRef.current = true;
    const nextSequence = sequenceRef.current + 1;
    sequenceRef.current = nextSequence;
    try {
      const nextReward = await sendWatchHeartbeat(userId, activeSession.sessionKey, nextSequence);
      if (generation !== generationRef.current) return;
      setReward(nextReward);
      setDisplayedSeconds(nextReward.accumulatedSeconds);
      setError(null);
      setMessage(nextReward.rewardState === 'CLAIMABLE'
        ? '포인트를 수령할 수 있습니다.'
        : nextReward.rewardState === 'PAUSED'
          ? '세트 진행 중에만 시청 시간이 누적됩니다.'
          : '시청 시간이 서버에서 누적되고 있습니다.');
    } catch (requestError) {
      if (generation !== generationRef.current) return;
      resetSession('시청 세션을 다시 시작해 주세요.');
      setError(requestError.message);
    } finally {
      heartbeatInFlightRef.current = false;
    }
  }, [resetSession, userId]);

  const beginHeartbeat = useCallback((heartbeatIntervalSeconds, generation) => {
    clearHeartbeatTimer();
    heartbeatTimerRef.current = window.setInterval(
      () => heartbeat(generation),
      Math.max(1, heartbeatIntervalSeconds) * 1_000,
    );
  }, [clearHeartbeatTimer, heartbeat]);

  const start = useCallback(async () => {
    if (!enabled || !active) return;
    if (!userId) {
      setError('상단에 사용자 ID를 입력해 주세요.');
      return;
    }

    setStarting(true);
    setError(null);
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    try {
      const nextSession = await startWatchSession(userId, matchId);
      if (generation !== generationRef.current) return;
      sessionRef.current = nextSession;
      sequenceRef.current = nextSession.heartbeatSequence;
      setSession(nextSession);
      setMessage('시청 세션을 시작했습니다.');
      await heartbeat(generation);
      if (generation === generationRef.current && sessionRef.current) {
        beginHeartbeat(nextSession.heartbeatIntervalSeconds, generation);
      }
    } catch (requestError) {
      if (generation !== generationRef.current) return;
      resetSession('시청 세션을 시작하지 못했습니다.');
      setError(requestError.message);
    } finally {
      if (generation === generationRef.current) setStarting(false);
    }
  }, [active, beginHeartbeat, enabled, heartbeat, matchId, resetSession, userId]);

  const claim = async () => {
    const activeSession = sessionRef.current;
    if (!activeSession || reward.rewardState !== 'CLAIMABLE') return;

    setClaiming(true);
    setError(null);
    try {
      const result = await claimWatchPoint(
        userId,
        activeSession.sessionKey,
        reward.rewardSequence,
      );
      setTotalPoint(result.totalPoint);
      setDisplayedSeconds(0);
      setReward((currentReward) => ({
        ...currentReward,
        rewardState: 'IDLE',
        rewardSequence: result.nextRewardSequence,
        accumulatedSeconds: 0,
        remainingSeconds: CLAIM_INTERVAL_SECONDS,
      }));
      setMessage(`${result.awardedPoint}P를 받았습니다. 현재 세트 상태를 확인합니다.`);
      await heartbeat();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    resetSession(enabled
      ? active
        ? '선택한 경기로 연결하고 있습니다.'
        : '다른 경기 시청 중입니다. 이 경기로 전환할 수 있습니다.'
      : '진행 중인 세트에서만 시청 시간이 누적됩니다.');
    setError(null);
    setTotalPoint(null);
    const autoStartTimer = active && enabled && userId
      ? window.setTimeout(start, 0)
      : null;
    return () => {
      if (autoStartTimer != null) window.clearTimeout(autoStartTimer);
      clearHeartbeatTimer();
    };
  }, [active, clearHeartbeatTimer, enabled, matchId, resetSession, start, userId]);

  useEffect(() => {
    const resumeHeartbeat = () => {
      if (document.visibilityState === 'visible') heartbeat();
    };
    document.addEventListener('visibilitychange', resumeHeartbeat);
    return () => document.removeEventListener('visibilitychange', resumeHeartbeat);
  }, [heartbeat]);

  const claimable = reward.rewardState === 'CLAIMABLE';
  const paused = reward.rewardState === 'PAUSED';
  const accumulating = reward.rewardState === 'ACCUMULATING';
  const watching = session != null && active;
  const stateLabel = claimable
    ? '수령 가능'
    : paused
      ? '세트 대기'
      : accumulating
        ? '시청 중'
        : watching
          ? '상태 확인'
          : '대기';

  useEffect(() => {
    if (!watching || !accumulating || !enabled) return undefined;
    const displayTimer = window.setInterval(() => {
      setDisplayedSeconds((seconds) => Math.min(seconds + 1, CLAIM_INTERVAL_SECONDS - 1));
    }, 1_000);
    return () => window.clearInterval(displayTimer);
  }, [accumulating, enabled, watching]);

  const displayedRemainingSeconds = Math.max(0, CLAIM_INTERVAL_SECONDS - displayedSeconds);

  return (
    <div className="watch-point-panel">
      <div className="watch-point-heading">
        <div>
          <span className="kicker">WATCH REWARD</span>
          <h3>시청 포인트</h3>
        </div>
        <span className={`watch-state ${claimable ? 'claimable' : ''}`}>{stateLabel}</span>
      </div>

      <div className="watch-timer-row">
        <div className="watch-timer">
          <strong>{formatTime(displayedSeconds)}</strong>
          <span>/ {formatTime(CLAIM_INTERVAL_SECONDS)}</span>
        </div>
        <div className="watch-point-balance">
          <span>보유 포인트</span>
          <strong>{totalPoint == null ? '수령 후 표시' : `${totalPoint.toLocaleString()}P`}</strong>
        </div>
      </div>

      <progress value={displayedSeconds} max={CLAIM_INTERVAL_SECONDS}>
        {displayedSeconds} / {CLAIM_INTERVAL_SECONDS}
      </progress>

      <div className="watch-point-footer">
        <div>
          <span>{reward.rewardSequence}회차 · +{reward.rewardPoint}P</span>
          <small>{claimable
            ? '수령할 때까지 시간이 더 누적되지 않습니다.'
            : `${formatTime(displayedRemainingSeconds)} 남음`}</small>
        </div>
        {!watching ? (
          <button
            type="button"
            onClick={() => (active ? start() : onActivate(matchId))}
            disabled={!enabled || starting}
          >
            {starting ? '시작 중' : active ? '시청 시작' : '이 경기 시청'}
          </button>
        ) : (
          <button type="button" onClick={claim} disabled={!claimable || claiming}>
            {claiming ? '수령 중' : claimable ? `${reward.rewardPoint}P 받기` : '시청 중'}
          </button>
        )}
      </div>

      <p className="watch-point-message" role="status">{error ?? message}</p>
    </div>
  );
}
