import { useState } from 'react';
import { claimCoupon } from '../../api/coupon.js';
import { useAppData } from '../../app/AppDataProvider.jsx';
import { ErrorState } from '../../shared/components/AsyncState.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime } from '../../shared/utils/format.js';

export default function CouponClaimPanel() {
  const { userId } = useAppData();
  const [couponEventId, setCouponEventId] = useState('');
  const [occurrenceId, setOccurrenceId] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      setResult(await claimCoupon(userId, couponEventId, occurrenceId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="data-surface form-surface">
      <div className="section-heading-row">
        <div>
          <h2>쿠폰 신청 테스트</h2>
          <p>
            이벤트/회차 ID로 쿠폰 발급을 신청합니다. 접수 이후 발급은 Kafka로 비동기 처리되니
            신청 후 잠시 뒤 <a href="/rewards">리워드</a>에서 결과를 확인하세요.
            (현재 USER ID: {userId})
          </p>
        </div>
      </div>
      {error && <ErrorState>{error}</ErrorState>}
      <form className="admin-form" onSubmit={submit}>
        <label className="field-block">
          <span>쿠폰 이벤트 ID</span>
          <input
            type="number"
            min="1"
            required
            value={couponEventId}
            onChange={(event) => setCouponEventId(event.target.value)}
          />
        </label>
        <label className="field-block">
          <span>회차 ID (couponEventOccurrenceId)</span>
          <input
            type="number"
            min="1"
            required
            value={occurrenceId}
            onChange={(event) => setOccurrenceId(event.target.value)}
          />
          <small>관리자 → 쿠폰 이벤트 상세의 "최근 회차"에서 확인할 수 있습니다.</small>
        </label>
        <div className="form-actions">
          <button
            className="button-primary"
            type="submit"
            disabled={submitting || !couponEventId || !occurrenceId}
          >
            {submitting ? '신청 중' : '쿠폰 신청'}
          </button>
        </div>
      </form>

      {result && (
        <dl className="detail-grid compact">
          <div><dt>claimId</dt><dd>{result.claimId}</dd></div>
          <div><dt>상태</dt><dd><StatusBadge status={result.requestStatus} /></dd></div>
          <div><dt>쿠폰 항목 ID</dt><dd>{result.couponEventItemId}</dd></div>
          <div><dt>신청 시각</dt><dd>{formatDateTime(result.createdAt)}</dd></div>
        </dl>
      )}
    </section>
  );
}
