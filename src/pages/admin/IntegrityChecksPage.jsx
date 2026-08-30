import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import {
  fetchCouponIntegrityCheck,
  fetchCouponIntegrityChecks,
  startCouponIntegrityCheck,
} from '../../api/admin.js';
import {
  formatDuration,
  formatIntegrityDateTime,
  getIntegrityBadge,
  IntegrityResultsTable,
  IntegrityRunSummary,
} from '../../features/admin/integrity/IntegrityCheckView.jsx';
import { useAdmin } from '../../layouts/AdminLayout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatNumber } from '../../shared/utils/format.js';

const POLL_INTERVAL_MS = 3000;
const PREVIEW_RESULT_COUNT = 5;

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17.2" r=".7" />
    </svg>
  );
}

function historyErrorMessage(error) {
  if (error?.status === 403) return '쿠폰 정합성 검증을 조회할 관리자 권한이 없습니다.';
  return error?.message ?? '쿠폰 정합성 검증 이력을 불러오지 못했습니다.';
}

export default function IntegrityChecksPage() {
  const { adminId } = useAdmin();
  const [history, setHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadDetail = useCallback(async (checkId) => {
    const detail = await fetchCouponIntegrityCheck(adminId, checkId);
    setLatest(detail);
    return detail;
  }, [adminId]);

  const loadHistory = useCallback(async ({ cursor, append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await fetchCouponIntegrityChecks(adminId, { cursor, size: 20 });
      setHistory((current) => append ? [...current, ...response.items] : response.items);
      setNextCursor(response.nextCursor);
      setHasNext(response.hasNext);
      setError(null);
      if (!append) {
        if (response.items.length > 0) await loadDetail(response.items[0].checkId);
        else setLatest(null);
      }
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [adminId, loadDetail]);

  useEffect(() => {
    setNotice(null);
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (latest?.executionStatus !== 'RUNNING') return undefined;
    const timer = window.setInterval(async () => {
      try {
        const next = await loadDetail(latest.checkId);
        if (next.executionStatus !== 'RUNNING') {
          setNotice(next.executionStatus === 'COMPLETED'
            ? '쿠폰 정합성 검증이 완료되었습니다.'
            : '쿠폰 정합성 검증을 완료하지 못했습니다.');
          await loadHistory();
        }
      } catch (requestError) {
        setError(requestError);
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [latest?.checkId, latest?.executionStatus, loadDetail, loadHistory]);

  const startCheck = async () => {
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      const started = await startCouponIntegrityCheck(adminId);
      setLatest({ ...started, results: [] });
      setNotice('검증을 시작했습니다. 완료될 때까지 실행 상태를 자동으로 확인합니다.');
      await loadHistory();
    } catch (requestError) {
      if (requestError?.status === 409) await loadHistory();
      setError(requestError);
    } finally {
      setStarting(false);
    }
  };

  const running = latest?.executionStatus === 'RUNNING';

  return (
    <div className="admin-page integrity-page">
      <PageHeader
        title="쿠폰 정합성 검증"
        description="발급 요청, 실제 쿠폰, 재고와 상태 전이의 일치 여부를 읽기 전용으로 검사합니다."
        actions={(
          <button className="button-primary" type="button" disabled={starting || running} onClick={startCheck}>
            {starting ? '실행 요청 중' : running ? '검증 실행 중' : '새 검증 실행'}
          </button>
        )}
      />

      <section className="integrity-warning" aria-labelledby="integrity-warning-title">
        <WarningIcon />
        <div>
          <h2 id="integrity-warning-title">실행 전 확인</h2>
          <p>대량 적재와 k6 부하 테스트를 중단하고 DB 부하가 낮은 시간에 실행하세요. 검증은 데이터를 수정하지 않습니다.</p>
        </div>
      </section>

      {error && (
        <ErrorState>
          {historyErrorMessage(error)}{' '}
          <button className="text-button" type="button" onClick={() => loadHistory()}>다시 시도</button>
        </ErrorState>
      )}
      {notice && <p className="operation-notice" role="status" aria-atomic="true">{notice}</p>}

      {loading && history.length === 0 ? <LoadingState>검증 이력을 불러오는 중입니다.</LoadingState> : latest ? (
        <>
          <IntegrityRunSummary check={latest} />

          <section className="data-surface integrity-results-preview" aria-labelledby="integrity-results-title">
            <div className="section-heading-row">
              <div>
                <h2 id="integrity-results-title">항목별 검증 결과</h2>
                <p>최근 실행의 판정과 위반 건수를 우선 확인합니다.</p>
              </div>
              {latest.executionStatus === 'COMPLETED' && (
                <NavLink className="button-secondary button-small" to={`/admin/integrity-checks/${latest.checkId}`}>
                  전체 {formatNumber(latest.checkCount)}개 항목 보기
                </NavLink>
              )}
            </div>
            <IntegrityResultsTable results={latest.results} limit={PREVIEW_RESULT_COUNT} />
          </section>
        </>
      ) : !error && (
        <EmptyState
          title="아직 실행한 정합성 검증이 없습니다."
          description="실행 전 확인 사항을 점검한 뒤 첫 검증을 시작해 주세요."
        />
      )}

      <section className="data-surface integrity-history" aria-labelledby="integrity-history-title">
        <div className="section-heading-row integrity-section-heading">
          <div>
            <h2 id="integrity-history-title">이전 실행 이력</h2>
            <p>최근 실행부터 저장된 판정과 검증 규모를 확인합니다.</p>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="integrity-history-empty">저장된 실행 이력이 없습니다.</div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="app-table integrity-history-table">
              <thead>
                <tr>
                  <th>실행 일시</th><th>판정</th><th>소요 시간</th><th>검증 대상</th><th>검사항목</th><th className="table-action">작업</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const badge = getIntegrityBadge(item);
                  return (
                    <tr key={item.checkId}>
                      <td>{formatIntegrityDateTime(item.startedAt)}</td>
                      <td><StatusBadge status={badge.status} label={badge.label} /></td>
                      <td>{item.executionStatus === 'RUNNING' ? '측정 중' : formatDuration(item.durationSeconds)}</td>
                      <td>{formatNumber(item.claimRequestCount)}건</td>
                      <td>{formatNumber(item.checkCount)}개</td>
                      <td className="table-action">
                        <NavLink className="button-secondary button-small" to={`/admin/integrity-checks/${item.checkId}`}>상세 결과</NavLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {hasNext && (
          <div className="table-pagination">
            <button className="button-secondary button-small" type="button" disabled={loadingMore} onClick={() => loadHistory({ cursor: nextCursor, append: true })}>
              {loadingMore ? '불러오는 중' : '이력 더 보기'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
