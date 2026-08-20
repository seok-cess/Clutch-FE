import { useCallback, useEffect, useState } from 'react';
import { changeReplaySpeed, fetchReplayStatus, startReplay } from '../../api/index.js';

const STATUS_POLL_MS = 1000;
const SPEED_OPTIONS = [1, 2, 5, 10, 20];

function formatReplayTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`;
}

/** replay 환경에서만 노출하는 새 테스트 경기 재생 제어 영역. */
export default function ReplayStartControl() {
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [replayStatus, setReplayStatus] = useState(null);
  const [replayAvailable, setReplayAvailable] = useState(false);
  const [changingSpeed, setChangingSpeed] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const nextStatus = await fetchReplayStatus();
      setReplayStatus(nextStatus);
      setReplayAvailable(true);
      return true;
    } catch {
      // 일반 profile에는 상태 API가 없으므로 제어 UI를 노출하지 않는다.
      setReplayAvailable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let timer;
    let cancelled = false;

    const startPolling = async () => {
      const available = await loadStatus();
      if (!cancelled && available) {
        timer = window.setInterval(loadStatus, STATUS_POLL_MS);
      }
    };

    startPolling();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadStatus]);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      const replay = await startReplay();
      setNotice(`새 테스트 경기를 시작했습니다. (${replay.matchId})`);
      await loadStatus();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  };

  const handleSpeedChange = async (event) => {
    const speed = Number(event.target.value);
    setChangingSpeed(true);
    setError(null);
    try {
      const nextStatus = await changeReplaySpeed(speed);
      setReplayStatus(nextStatus);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingSpeed(false);
    }
  };

  if (!replayAvailable) return null;

  return (
    <section className="replay-start-control" aria-labelledby="replay-start-title">
      <div>
        <p className="kicker">LOCAL REPLAY</p>
        <h2 id="replay-start-title">테스트 경기 재생</h2>
        <p className="replay-start-description">새 경기 ID로 fixture를 처음부터 재생합니다.</p>
        {replayStatus && (
          <div className="replay-progress">
            <div className="replay-progress-copy">
              <span>JSONL 재생 위치</span>
              <strong>
                {formatReplayTime(replayStatus.elapsedSeconds)} / {formatReplayTime(replayStatus.totalSeconds)}
              </strong>
              <span>{replayStatus.progressPercent}%</span>
            </div>
            <div
              className="replay-progress-track"
              role="progressbar"
              aria-label="JSONL 재생 진행률"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={replayStatus.progressPercent}
            >
              <span style={{ width: `${replayStatus.progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="replay-start-action">
        {replayStatus && (
          <label className="replay-speed-select">
            <span>재생 배속</span>
            <select
              value={replayStatus.speed}
              onChange={handleSpeedChange}
              disabled={changingSpeed || starting}
            >
              {SPEED_OPTIONS.map((speed) => (
                <option key={speed} value={speed}>{speed}배속</option>
              ))}
            </select>
          </label>
        )}
        <button type="button" onClick={handleStart} disabled={starting}>
          {starting ? '테스트 경기 시작 중...' : '새 테스트 경기 시작'}
        </button>
        {notice && <p className="replay-start-notice" role="status">{notice}</p>}
        {error && <p className="replay-start-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
