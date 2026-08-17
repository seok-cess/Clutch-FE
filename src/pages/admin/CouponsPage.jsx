import { useState } from 'react';
import { cancelCoupon } from '../../api/admin.js';
import { useAdmin } from '../../layouts/AdminLayout.jsx';
import { ErrorState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime } from '../../shared/utils/format.js';

export default function CouponsPage() {
  const { adminId } = useAdmin();
  const [couponId, setCouponId] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!window.confirm(`쿠폰 ${couponId}번을 취소할까요?`)) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      setResult(await cancelCoupon(adminId, couponId, reason.trim()));
      setReason('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-page narrow-admin-page">
      <PageHeader
        title="발급 쿠폰 취소"
        description="사용자에게 발급된 쿠폰을 ID로 조회해 취소 처리합니다."
      />
      {error && <ErrorState>{error}</ErrorState>}
      <section className="data-surface form-surface">
        <form className="admin-form" onSubmit={submit}>
          <label className="field-block">
            <span>쿠폰 ID</span>
            <input
              type="number"
              min="1"
              required
              value={couponId}
              onChange={(event) => setCouponId(event.target.value)}
            />
          </label>
          <label className="field-block">
            <span>취소 사유</span>
            <textarea
              required
              rows="5"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <small>운영 이력에서 취소 사유를 식별할 수 있게 구체적으로 작성합니다.</small>
          </label>
          <div className="form-actions">
            <button className="button-danger" type="submit" disabled={submitting || !couponId || !reason.trim()}>
              {submitting ? '취소 처리 중' : '쿠폰 취소'}
            </button>
          </div>
        </form>
      </section>

      {result && (
        <section className="data-surface result-surface" aria-live="polite">
          <div className="section-heading-row">
            <div><h2>처리 결과</h2><p>쿠폰 상태가 변경되었습니다.</p></div>
            <StatusBadge status={result.status} />
          </div>
          <dl className="detail-grid compact">
            <div><dt>쿠폰 ID</dt><dd>{result.id}</dd></div>
            <div><dt>쿠폰 코드</dt><dd>{result.couponCode}</dd></div>
            <div><dt>이벤트 ID</dt><dd>{result.couponEventId}</dd></div>
            <div><dt>취소 시각</dt><dd>{formatDateTime(result.cancelledAt)}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}
