import { useCallback, useEffect, useState } from 'react';
import { fetchBackfillStatus, startBackfill } from '../../api/admin.js';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatNumber } from '../../shared/utils/format.js';

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds);
  if (!Number.isFinite(seconds)) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

export default function BackfillPage() {
  const [status, setStatus] = useState(null);
  const [limit, setLimit] = useState(1000);
  const [includeStored, setIncludeStored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchBackfillStatus());
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.running) return undefined;
    const timer = window.setInterval(loadStatus, 3000);
    return () => window.clearInterval(timer);
  }, [loadStatus, status?.running]);

  const start = async (event) => {
    event.preventDefault();
    setStarting(true);
    setError(null);
    try {
      await startBackfill({ limit: Number(limit), all: includeStored });
      await loadStatus();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="데이터 백필"
        description="완료된 과거 경기의 세트 데이터를 백그라운드에서 적재합니다."
      />
      {error && <ErrorState>{error}</ErrorState>}
      {loading ? <LoadingState /> : (
        <>
          <section className="backfill-status data-surface">
            <div className="section-heading-row">
              <div><h2>실행 상태</h2><p>작업 중에는 3초마다 자동으로 갱신됩니다.</p></div>
              <StatusBadge status={status?.running ? 'OPEN' : 'READY'} label={status?.running ? '실행 중' : '대기'} />
            </div>
            <progress max="100" value={status?.progressPercent ?? 0}>
              {status?.progressPercent ?? 0}%
            </progress>
            <div className="progress-label">
              <strong>{status?.progressPercent ?? 0}%</strong>
              <span>{formatNumber(status?.matchesScanned)} / {formatNumber(status?.matchesTotal)} 경기</span>
            </div>
            <dl className="detail-grid">
              <div><dt>현재 경기</dt><dd>{status?.currentMatch ?? '-'}</dd></div>
              <div><dt>적재 세트</dt><dd>{formatNumber(status?.gamesPersisted)}</dd></div>
              <div><dt>건너뜀</dt><dd>{formatNumber(status?.gamesSkipped)}</dd></div>
              <div><dt>실패</dt><dd>{formatNumber(status?.gamesFailed)}</dd></div>
              <div><dt>경과 시간</dt><dd>{formatDuration(status?.elapsedSeconds)}</dd></div>
              <div><dt>예상 잔여</dt><dd>{formatDuration(status?.etaSeconds)}</dd></div>
            </dl>
          </section>

          <section className="data-surface form-surface backfill-form-surface">
            <div className="section-heading-row">
              <div><h2>새 작업 시작</h2><p>한 번에 처리할 경기 범위와 재수집 여부를 설정합니다.</p></div>
            </div>
            <form className="admin-form inline-admin-form" onSubmit={start}>
              <label className="field-block">
                <span>처리할 경기 수</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                />
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={includeStored}
                  onChange={(event) => setIncludeStored(event.target.checked)}
                />
                <span>이미 적재된 세트도 다시 수집</span>
              </label>
              <button className="button-primary" type="submit" disabled={starting || status?.running}>
                {starting ? '시작 중' : status?.running ? '작업 실행 중' : '백필 시작'}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
