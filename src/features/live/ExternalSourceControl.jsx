import { useCallback, useEffect, useState } from 'react';
import {
  changeExternalSource,
  fetchExternalSourceStatus,
} from '../../api/index.js';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';

const SOURCE_POLL_MS = 2000;

function modeLabel(mode) {
  return mode === 'STUB' ? 'TEST 서버' : '실제 API 서버';
}

function sourceBadgeStatus(mode) {
  return mode === 'STUB' ? 'READY' : 'ACTIVE';
}

/** 운영자가 모든 사용자의 라이브 데이터 소스를 전환하는 관리자 기능. */
export default function ExternalSourceControl() {
  const [source, setSource] = useState(undefined);
  const [switching, setSwitching] = useState(false);
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

  useEffect(() => {
    loadSource();
    const timer = window.setInterval(loadSource, SOURCE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadSource]);

  const switchSource = async (mode) => {
    setSwitching(true);
    setError(null);
    setNotice(null);
    try {
      const nextSource = await changeExternalSource(mode);
      setSource(nextSource);
      setNotice(`${modeLabel(nextSource.mode)}로 전환했습니다.`);
    } catch (requestError) {
      const confirmedSource = await loadSource();
      if (confirmedSource?.mode === mode) {
        setNotice(`${modeLabel(mode)}로 전환했습니다. 전환 응답을 다시 확인했습니다.`);
      } else {
        setError(requestError.message);
      }
    } finally {
      setSwitching(false);
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
  const confirmationCopy = confirmation === 'STUB'
    ? {
      title: 'TEST 서버로 전환할까요?',
      description: '전환 즉시 모든 사용자가 TEST 경기 데이터를 보게 됩니다.\n이 상태에서 발생한 배팅·포인트·정산 데이터는 실제 DB에 남습니다.',
      confirmLabel: 'TEST 서버로 전환',
      confirmClassName: 'button-danger',
    }
    : confirmation === 'REAL'
      ? {
        title: '실제 API 서버로 전환할까요?',
        description: '전환 즉시 모든 사용자가 실제 LoL Esports 데이터를 보게 됩니다.\nTEST로 생성된 기존 경기·배팅·포인트 데이터는 삭제되지 않습니다.',
        confirmLabel: '실제 API로 전환',
        confirmClassName: 'button-primary',
      }
      : null;

  return (
    <section className="external-source-control" aria-labelledby="source-control-title">
      <div className="section-heading-row">
        <div>
          <p className="kicker">OPERATOR CONTROL</p>
          <h2 id="source-control-title">라이브 데이터 소스 제어</h2>
          <p>모든 사용자가 보는 라이브 데이터 소스를 전환합니다.</p>
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
          onClick={() => setConfirmation('REAL')}
        >
          {switching ? '전환 중...' : isStub ? '실제 API로 전환' : '현재 실제 API 사용 중'}
        </button>
        <button
          className="button-danger"
          type="button"
          disabled={switching || isStub}
          onClick={() => setConfirmation('STUB')}
        >
          {switching ? '전환 중...' : isStub ? '현재 TEST 서버 사용 중' : 'TEST 서버로 전환'}
        </button>
      </div>

      <div className="source-warning-surface data-surface">
        <h3>운영 주의</h3>
        <p>TEST 모드에서도 실제 사용자 배팅, 포인트 지급, 정산이 수행되며 해당 데이터는 실제 DB에 남습니다.</p>
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
              <button
                className={confirmationCopy.confirmClassName}
                type="button"
                onClick={() => {
                  const nextMode = confirmation;
                  setConfirmation(null);
                  void switchSource(nextMode);
                }}
              >
                {confirmationCopy.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
