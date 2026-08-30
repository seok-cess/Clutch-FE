import { useCallback, useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router';
import { fetchCouponIntegrityCheck } from '../../api/admin.js';
import { IntegrityResultsTable, IntegrityRunSummary } from '../../features/admin/integrity/IntegrityCheckView.jsx';
import { useAdmin } from '../../layouts/AdminLayout.jsx';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import { formatNumber } from '../../shared/utils/format.js';

const POLL_INTERVAL_MS = 3000;

export default function IntegrityCheckDetailPage() {
  const { checkId } = useParams();
  const { adminId } = useAdmin();
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCheck = useCallback(async () => {
    try {
      setCheck(await fetchCouponIntegrityCheck(adminId, checkId));
      setError(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [adminId, checkId]);

  useEffect(() => {
    setLoading(true);
    loadCheck();
  }, [loadCheck]);

  useEffect(() => {
    if (check?.executionStatus !== 'RUNNING') return undefined;
    const timer = window.setInterval(loadCheck, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [check?.executionStatus, loadCheck]);

  return (
    <div className="admin-page integrity-page integrity-detail-page">
      <PageHeader
        title="정합성 검증 상세 결과"
        description={`실행 #${checkId}의 데이터 스냅샷과 전체 검사항목을 확인합니다.`}
        actions={<NavLink className="button-secondary" to="/admin/integrity-checks">실행 이력으로</NavLink>}
      />

      {loading ? <LoadingState>검증 상세 결과를 불러오는 중입니다.</LoadingState> : error ? (
        <ErrorState>
          {error?.status === 404 ? '쿠폰 정합성 검증 이력을 찾을 수 없습니다.' : error?.message}{' '}
          <button className="text-button" type="button" onClick={loadCheck}>다시 시도</button>
        </ErrorState>
      ) : check && (
        <>
          <IntegrityRunSummary check={check} title={`실행 #${check.checkId}`} />

          <section className="data-surface integrity-dataset" aria-labelledby="integrity-dataset-title">
            <div className="section-heading-row integrity-section-heading">
              <div>
                <h2 id="integrity-dataset-title">검증 데이터 스냅샷</h2>
                <p>동일 데이터 재실행 여부를 비교할 수 있는 비식별 집계 정보입니다.</p>
              </div>
            </div>
            <dl className="integrity-dataset-grid">
              <div><dt>사용자</dt><dd>{formatNumber(check.userCount)}</dd></div>
              <div><dt>발급 요청</dt><dd>{formatNumber(check.claimRequestCount)}</dd></div>
              <div><dt>실제 쿠폰</dt><dd>{formatNumber(check.userCouponCount)}</dd></div>
              <div><dt>쿠폰 이벤트</dt><dd>{formatNumber(check.couponEventCount)}</dd></div>
              <div><dt>이벤트 회차</dt><dd>{formatNumber(check.occurrenceCount)}</dd></div>
              <div><dt>이벤트 항목</dt><dd>{formatNumber(check.eventItemCount)}</dd></div>
            </dl>
            <div className="responsive-table-wrap integrity-fingerprint-wrap">
              <table className="app-table integrity-fingerprint-table">
                <thead><tr><th>대상</th><th>최소 ID</th><th>최대 ID</th><th>Fingerprint</th></tr></thead>
                <tbody>
                  <tr>
                    <td><code>coupon_claim_request</code></td>
                    <td>{formatNumber(check.claimRequestMinId)}</td>
                    <td>{formatNumber(check.claimRequestMaxId)}</td>
                    <td>{formatNumber(check.claimRequestFingerprint)}</td>
                  </tr>
                  <tr>
                    <td><code>user_coupon</code></td>
                    <td>{formatNumber(check.userCouponMinId)}</td>
                    <td>{formatNumber(check.userCouponMaxId)}</td>
                    <td>{formatNumber(check.userCouponFingerprint)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="data-surface integrity-results-detail" aria-labelledby="integrity-detail-results-title">
            <div className="section-heading-row integrity-section-heading">
              <div>
                <h2 id="integrity-detail-results-title">전체 검증 결과</h2>
                <p>{formatNumber(check.checkCount)}개 항목의 판정과 위반 건수입니다.</p>
              </div>
            </div>
            <IntegrityResultsTable results={check.results} />
          </section>
        </>
      )}
    </div>
  );
}
