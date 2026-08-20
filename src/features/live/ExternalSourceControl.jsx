import { useCallback, useEffect, useState } from 'react';
import {
  changeExternalSource,
  changeReplaySpeed,
  fetchExternalSourceStatus,
  fetchReplayStatus,
  startReplay,
} from '../../api/index.js';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';

const STATUS_POLL_MS = 1000;
const SOURCE_POLL_MS = 2000;
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

function modeLabel(mode) {
  return mode === 'STUB' ? 'test 서버' : '실제 API 서버';
}

function sourceBadgeStatus(mode) {
  return mode === 'STUB' ? 'READY' : 'ACTIVE';
}

function ReplayIdentifier({ label, value, description }) {
  return (
    <div className="replay-identifier">
      <span>{label}</span>
      <code>{value ?? '경기 데이터 적재 중'}</code>
      <small>{description}</small>
    </div>
  );
}

export default function ExternalSourceControl({ onSourceChanged }) {
  const [source, setSource] = useState(undefined);
  const [replayStatus, setReplayStatus] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [changingSpeed, setChangingSpeed] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

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

  const switchSource = async (mode) => {
    setSwitching(true);
    setError(null);
    setNotice(null);
    try {
      const nextSource = await changeExternalSource(mode);
      setSource(nextSource);
      await onSourceChanged?.();
      setNotice(`${modeLabel(nextSource.mode)}로 전환했습니다. 라이브 매치 데이터를 새로고침했습니다.`);
      if (nextSource.mode === 'STUB') await loadReplayStatus();
    } catch (requestError) {
      const confirmedSource = await loadSource();
      if (confirmedSource?.mode === mode) {
        await onSourceChanged?.();
        setNotice(`${modeLabel(mode)}로 전환했습니다. 전환 응답을 다시 확인했습니다.`);
      } else {
        setError(requestError.message);
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      const replay = await startReplay();
      await onSourceChanged?.();
      setNotice(`새 test 경기를 시작했습니다. (${replay.matchId})`);
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
      <ErrorState>
        {error}
        {' '}
        <button className="text-button" type="button" onClick={loadSource}>다시 시도</button>
      </ErrorState>
    );
  }
  if (source === null) {
    return (
      <EmptyState
        title="운영자 데이터 소스 전환을 사용할 수 없습니다."
        description="백엔드에 operator-routing profile이 활성화되어 있는지 확인해 주세요."
      />
    );
  }

  const isStub = source.mode === 'STUB';
  const confirmationCopy = confirmation?.kind === 'source'
    ? confirmation.mode === 'STUB'
      ? {
        title: 'test 서버로 전환할까요?',
        description: '전환 즉시 모든 사용자가 test 경기 데이터를 보게 됩니다.\n이 상태에서 발생한 배팅·포인트·정산 데이터는 실제 DB에 남습니다.',
        confirmLabel: 'test 서버로 전환',
        confirmClassName: 'button-danger',
      }
      : {
        title: '실제 API 서버로 전환할까요?',
        description: '전환 즉시 모든 사용자가 실제 LoL Esports 데이터를 보게 됩니다.\ntest로 생성된 기존 경기·배팅·포인트 데이터는 삭제되지 않습니다.',
        confirmLabel: '실제 API로 전환',
        confirmClassName: 'button-primary',
      }
    : confirmation?.kind === 'replay'
      ? {
        title: '새 test 경기를 시작할까요?',
        description: '새 경기·세트 ID가 생성되고, 이 경기의 배팅·포인트·정산 데이터는 실제 DB에 남습니다.',
        confirmLabel: '새 test 경기 시작',
        confirmClassName: 'button-primary',
      }
      : null;

  return (
    <section className="external-source-control" aria-labelledby="source-control-title">
      <div className="section-heading-row">
        <div>
          <p className="kicker">OPERATOR CONTROL</p>
          <h2 id="source-control-title">라이브 데이터 소스 제어</h2>
          <p>현재 라이브 매치를 보면서 실제 API와 test 서버를 전환합니다.</p>
        </div>
        <StatusBadge status={sourceBadgeStatus(source.mode)} label={modeLabel(source.mode)} />
      </div>
      {error && <ErrorState>{error}</ErrorState>}
      {notice && <p className="operation-notice" role="status">{notice}</p>}

      <div className="source-switch-actions">
        <button
          className="button-secondary"
          type="button"
          disabled={switching || !isStub}
          onClick={() => setConfirmation({ kind: 'source', mode: 'REAL' })}
        >
          {switching ? '전환 중...' : isStub ? '실제 API로 전환' : '현재 실제 API 사용 중'}
        </button>
        <button
          className="button-danger"
          type="button"
          disabled={switching || isStub}
          onClick={() => setConfirmation({ kind: 'source', mode: 'STUB' })}
        >
          {switching ? '전환 중...' : isStub ? '현재 test 서버 사용 중' : 'test 서버로 전환'}
        </button>
      </div>

      <div className="source-warning-surface data-surface">
        <h3>운영 주의</h3>
        <p>test 모드에서도 실제 사용자 배팅, 포인트 지급, 정산이 수행되며 해당 데이터는 실제 DB에 남습니다.</p>
      </div>

      <div className="replay-admin-surface data-surface" aria-labelledby="replay-admin-title">
        <div className="section-heading-row">
          <div>
            <h3 id="replay-admin-title">test 경기 재생</h3>
            <p>test 모드에서만 새 test 경기를 시작하거나 재생 속도를 변경할 수 있습니다.</p>
          </div>
          <StatusBadge status={isStub && replayStatus ? 'OPEN' : 'INACTIVE'} label={isStub && replayStatus ? '준비됨' : 'test 전환 필요'} />
        </div>
        {isStub && replayStatus && (
          <>
            <div className="replay-identifiers" aria-label="현재 test 경기 식별자">
              <ReplayIdentifier
                label="쿠폰 이벤트용 경기 ID"
                value={replayStatus.esportsMatchId}
                description="쿠폰 이벤트 생성 화면의 경기 ID에는 이 숫자를 입력하세요."
              />
              <ReplayIdentifier
                label="현재 match ID"
                value={replayStatus.matchId}
                description="test 서버가 사용하는 외부 match ID입니다."
              />
            </div>
            <div className="replay-progress">
              <div className="replay-progress-copy">
                <span>JSONL 재생 위치</span>
                <strong>{formatReplayTime(replayStatus.elapsedSeconds)} / {formatReplayTime(replayStatus.totalSeconds)}</strong>
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
          </>
        )}
        <div className="replay-admin-actions">
          {isStub && replayStatus && (
            <label className="replay-speed-select">
              <span>재생 배속</span>
              <select
                value={replayStatus.speed}
                onChange={handleSpeedChange}
                disabled={switching || starting || changingSpeed}
              >
                {SPEED_OPTIONS.map((speed) => <option key={speed} value={speed}>{speed}배속</option>)}
              </select>
            </label>
          )}
          <button
            className="button-primary"
            type="button"
            onClick={() => setConfirmation({ kind: 'replay' })}
            disabled={!isStub || !replayStatus || switching || starting}
          >
            {starting ? 'test 경기 시작 중...' : '새 test 경기 시작'}
          </button>
        </div>
        {!isStub && <p className="source-action-hint">먼저 test 서버로 전환해야 test 경기를 시작할 수 있습니다.</p>}
      </div>
      {confirmationCopy && (
        <div className="operator-confirm-backdrop">
          <section
            className="operator-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="operator-confirm-title"
            aria-describedby="operator-confirm-description"
          >
            <h3 id="operator-confirm-title">{confirmationCopy.title}</h3>
            <p id="operator-confirm-description">{confirmationCopy.description}</p>
            <div className="operator-confirm-actions">
              <button className="button-secondary" type="button" onClick={() => setConfirmation(null)}>취소</button>
              {confirmation?.kind === 'source' && confirmation.mode === 'STUB' && (
                <button
                  className={confirmationCopy.confirmClassName}
                  type="button"
                  onClick={() => {
                    setConfirmation(null);
                    void switchSource('STUB');
                  }}
                >
                  {confirmationCopy.confirmLabel}
                </button>
              )}
              {confirmation?.kind === 'source' && confirmation.mode === 'REAL' && (
                <button
                  className={confirmationCopy.confirmClassName}
                  type="button"
                  onClick={() => {
                    setConfirmation(null);
                    void switchSource('REAL');
                  }}
                >
                  {confirmationCopy.confirmLabel}
                </button>
              )}
              {confirmation?.kind === 'replay' && (
                <button
                  className={confirmationCopy.confirmClassName}
                  type="button"
                  onClick={() => {
                    setConfirmation(null);
                    void handleStart();
                  }}
                >
                  {confirmationCopy.confirmLabel}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
