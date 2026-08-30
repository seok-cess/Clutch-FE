import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { claimWatchPoint, sendWatchHeartbeat, startWatchSession } from '../api.js';

const CLAIM_INTERVAL_SECONDS = 5 * 60;
const DEFAULT_REWARD_POINT = 100;
const CLAIMABILITY_PROBE_BUFFER_MS = 250;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

/** 기존 시청 세션 로직을 유지하고 표시 결과만 사용자 헤더로 보낸다. */
export default function WatchPointPanel({ matchId, userId, enabled, active, onActivate }) {
  const [session, setSession] = useState(null);
  const [reward, setReward] = useState(initialReward);
  const [displayedSeconds, setDisplayedSeconds] = useState(0);
  const [starting, setStarting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState('시청 시작 버튼을 누르면 시간이 누적됩니다.');
  const [error, setError] = useState(null);
  const [awardedPoint, setAwardedPoint] = useState(null);
  const sessionRef = useRef(null);
  const sequenceRef = useRef(0);
  const heartbeatTimerRef = useRef(null);
  const claimabilityProbeTimerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const heartbeatInFlightRef = useRef(false);
  const generationRef = useRef(0);
  const awardTimerRef = useRef(null);

  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current != null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const clearClaimabilityProbeTimer = useCallback(() => {
    if (claimabilityProbeTimerRef.current != null) {
      window.clearTimeout(claimabilityProbeTimerRef.current);
      claimabilityProbeTimerRef.current = null;
    }
  }, []);

  const resetSession = useCallback((nextMessage) => {
    generationRef.current += 1;
    clearHeartbeatTimer();
    clearClaimabilityProbeTimer();
    heartbeatInFlightRef.current = false;
    sessionRef.current = null;
    sequenceRef.current = 0;
    setSession(null);
    setReward(initialReward());
    setDisplayedSeconds(0);
    setStarting(false);
    setClaiming(false);
    setMessage(nextMessage);
  }, [clearClaimabilityProbeTimer, clearHeartbeatTimer]);

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
      clearClaimabilityProbeTimer();
      if (nextReward.rewardState === 'ACCUMULATING'
          && nextReward.remainingSeconds <= activeSession.heartbeatIntervalSeconds) {
        // 마지막 30초는 일반 heartbeat보다 약간 뒤에 한 번 더 확인해, 화면과 서버 수령 자격을 맞춘다.
        claimabilityProbeTimerRef.current = window.setTimeout(() => {
          void heartbeatRef.current?.(generation);
        }, (nextReward.remainingSeconds * 1_000) + CLAIMABILITY_PROBE_BUFFER_MS);
      }
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
  }, [clearClaimabilityProbeTimer, resetSession, userId]);
  heartbeatRef.current = heartbeat;

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
    clearClaimabilityProbeTimer();
    try {
      const result = await claimWatchPoint(
        userId,
        activeSession.sessionKey,
        reward.rewardSequence,
      );
      setDisplayedSeconds(0);
      setReward((currentReward) => ({
        ...currentReward,
        rewardState: 'IDLE',
        rewardSequence: result.nextRewardSequence,
        accumulatedSeconds: 0,
        remainingSeconds: CLAIM_INTERVAL_SECONDS,
      }));
      setMessage(`${result.awardedPoint}P를 받았습니다. 현재 세트 상태를 확인합니다.`);
      setAwardedPoint(result.awardedPoint);
      if (awardTimerRef.current != null) window.clearTimeout(awardTimerRef.current);
      awardTimerRef.current = window.setTimeout(() => setAwardedPoint(null), 900);
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
    const autoStartTimer = active && enabled && userId
      ? window.setTimeout(start, 0)
      : null;
    return () => {
      if (autoStartTimer != null) window.clearTimeout(autoStartTimer);
      clearHeartbeatTimer();
      clearClaimabilityProbeTimer();
    };
  }, [
    active,
    clearClaimabilityProbeTimer,
    clearHeartbeatTimer,
    enabled,
    matchId,
    resetSession,
    start,
    userId,
  ]);

  useEffect(() => {
    const resumeHeartbeat = () => {
      if (document.visibilityState === 'visible') heartbeat();
    };
    document.addEventListener('visibilitychange', resumeHeartbeat);
    return () => document.removeEventListener('visibilitychange', resumeHeartbeat);
  }, [heartbeat]);

  useEffect(() => () => {
    if (awardTimerRef.current != null) window.clearTimeout(awardTimerRef.current);
    clearClaimabilityProbeTimer();
  }, [clearClaimabilityProbeTimer]);

  const claimable = reward.rewardState === 'CLAIMABLE';
  const paused = reward.rewardState === 'PAUSED';
  const accumulating = reward.rewardState === 'ACCUMULATING';
  const watching = session != null && active;

  useEffect(() => {
    if (!watching || !accumulating || !enabled) return undefined;
    const displayTimer = window.setInterval(() => {
      setDisplayedSeconds((seconds) => Math.min(seconds + 1, CLAIM_INTERVAL_SECONDS - 1));
    }, 1_000);
    return () => window.clearInterval(displayTimer);
  }, [accumulating, enabled, watching]);

  const headerTarget = document.getElementById('watch-reward-header-slot');
  if (!headerTarget || !enabled) return null;

  const progress = Math.min(100, (displayedSeconds / CLAIM_INTERVAL_SECONDS) * 100);
  const stateLabel = error
    ? `시청 포인트 오류: ${error}`
    : starting || !watching
      ? '시청 세션 연결 중'
      : claimable
        ? `${reward.rewardPoint}포인트 보상 받기`
        : paused
          ? '세트 대기 중. 시청 시간 적립 일시 정지'
          : '시청 시간 적립 중';
  const canStart = !watching && enabled && !starting;

  return createPortal(
    <div className="watch-reward-header-control">
      <button
        className={`watch-reward-header${claimable ? ' is-claimable' : ''}${awardedPoint != null ? ' is-awarded' : ''}`}
        type="button"
        onClick={() => {
          if (claimable) {
            claim();
          } else if (!watching) {
            if (active) start();
            else onActivate(matchId);
          }
        }}
        disabled={watching ? !claimable || claiming : !canStart}
        aria-label={stateLabel}
        aria-describedby={error ? 'watch-reward-feedback' : undefined}
        title={error ?? message}
      >
        <span className="watch-reward-coin" aria-hidden="true" />
        <span className="watch-reward-copy">
          <span className="watch-reward-time">
            {error
              ? '수령 실패'
              : starting || !watching
                ? '연결 중'
                : `${formatTime(displayedSeconds)} / ${formatTime(CLAIM_INTERVAL_SECONDS)}`}
          </span>
          <span className="watch-reward-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </span>
        </span>
        <span className="watch-reward-action" aria-hidden="true">
          {claiming ? '수령 중' : claimable ? '받기' : ''}
        </span>
        {awardedPoint != null && (
          <span className="watch-reward-award" role="status">+{awardedPoint}P</span>
        )}
      </button>
      {error && <p id="watch-reward-feedback" className="watch-reward-feedback" role="alert">{error}</p>}
    </div>,
    headerTarget,
  );
}
