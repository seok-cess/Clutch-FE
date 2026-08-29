import { useCallback, useEffect, useState } from 'react';
import {
  changeReplaySpeed,
  fetchExternalSourceStatus,
  fetchReplayStatus,
  startReplay,
} from '../../api/index.js';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';

const STATUS_POLL_MS = 1000;
const SOURCE_POLL_MS = 2000;
const SPEED_OPTIONS = [1, 2, 5, 10, 20, 60];

function formatReplayTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`;
}

/** Live 화면에서 TEST 경기 재생의 상태와 속도를 제어한다. */
export default function ReplayControlPanel() {
  const [source, setSource] = useState(undefined);
  const [replayStatus, setReplayStatus] = useState(null);
  const [starting, setStarting] = useState(false);
  const [changingSpeed, setChangingSpeed] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const loadSource = useCallback(async () => {
    try {
      const nextSource = await fetchExternalSourceStatus();
      setSource(nextSource);
      setError(null);
      return nextSource;
    } catch (requestError) {
      setError(requestError.message);
      setSource((current) => (current === undefined ? false : current));
      return null;
    }
  }, []);

  const loadReplayStatus = useCallback(async () => {
    try {
      const nextStatus = await fetchReplayStatus();
      setReplayStatus(nextStatus);
      return nextStatus;
    } catch (requestError) {
      setReplayStatus(null);
      setError(requestError.message);
      return null;
    }
  }, []);

  useEffect(() => {
    loadSource();
    const timer = window.setInterval(loadSource, SOURCE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadSource]);

  useEffect(() => {
    if (source?.mode !== 'STUB') {
      setReplayStatus(null);
      return undefined;
    }

    loadReplayStatus();
    const timer = window.setInterval(loadReplayStatus, STATUS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadReplayStatus, source?.mode]);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      const replay = await startReplay();
      setNotice(`새 TEST 경기 ${replay.matches?.length ?? 0}개를 시작했습니다.`);
      await loadReplayStatus();
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
      setReplayStatus(await changeReplaySpeed(speed));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingSpeed(false);
    }
  };

  if (source === undefined) return <LoadingState />;
  if (source === false) {
    return (
      <section className="replay-control-panel">
        <ErrorState>
          {error}
          {' '}
          <button className="text-button" type="button" onClick={loadSource}>다시 시도</button>
        </ErrorState>
      </section>
    );
  }
  if (source === null) {
    return (
      <section className="replay-control-panel">
        <EmptyState
          title="TEST 경기 재생을 사용할 수 없습니다."
          description="백엔드에 operator-routing profile이 활성화되어 있는지 확인해 주세요."
        />
      </section>
    );
  }

  const isStub = source.mode === 'STUB';
  return (
    <section className="replay-control-panel" aria-label="TEST 경기 재생 제어">
      {error && <ErrorState>{error}</ErrorState>}
      {notice && <p className="operation-notice" role="status">{notice}</p>}
      <div className="replay-control-content">
        {isStub && replayStatus && (
          <div className="replay-progress">
            <div className="replay-progress-copy">
              <span>재생 위치</span>
              <strong>{formatReplayTime(replayStatus.elapsedSeconds)} / {formatReplayTime(replayStatus.totalSeconds)}</strong>
              <span>{replayStatus.progressPercent}%</span>
            </div>
            <div
              className="replay-progress-track"
              role="progressbar"
              aria-label="재생 진행률"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={replayStatus.progressPercent}
            >
              <span style={{ width: `${replayStatus.progressPercent}%` }} />
            </div>
          </div>
        )}
        <div className="replay-admin-actions">
          {isStub && replayStatus && (
            <label className="replay-speed-select">
              <span>재생 배속</span>
              <select
                value={replayStatus.speed}
                onChange={handleSpeedChange}
                disabled={starting || changingSpeed}
              >
                {SPEED_OPTIONS.map((speed) => <option key={speed} value={speed}>{speed}배속</option>)}
              </select>
            </label>
          )}
          <button
            className="button-primary"
            type="button"
            onClick={() => setConfirmationOpen(true)}
            disabled={!isStub || !replayStatus || starting || changingSpeed}
          >
            {starting ? 'TEST 경기 시작 중...' : '새 TEST 경기 시작'}
          </button>
        </div>
      </div>
      {!isStub && <p className="source-action-hint">관리자 → 소스 제어에서 TEST 서버로 전환해야 TEST 경기를 시작할 수 있습니다.</p>}
      {confirmationOpen && (
        <div className="operator-confirm-backdrop">
          <section
            className="operator-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="operator-confirm-title"
            aria-describedby="operator-confirm-description"
          >
            <h3 id="operator-confirm-title">새 TEST 경기를 시작할까요?</h3>
            <p id="operator-confirm-description">새 경기·세트 ID가 생성되고, 이 경기의 배팅·포인트·정산 데이터는 실제 DB에 남습니다.</p>
            <div className="operator-confirm-actions">
              <button className="button-secondary" type="button" onClick={() => setConfirmationOpen(false)}>취소</button>
              <button
                className="button-primary"
                type="button"
                onClick={() => {
                  setConfirmationOpen(false);
                  void handleStart();
                }}
              >
                새 TEST 경기 시작
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
