import { useCallback, useEffect, useState } from 'react';
import { fetchMyCoupons, useMyCoupon } from '../../api/coupon.js';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime } from '../../shared/utils/format.js';

const FILTERS = [
  { value: '', label: '전체' },
  { value: 'ISSUED', label: '사용 가능' },
  { value: 'USED', label: '사용 완료' },
  { value: 'EXPIRED', label: '만료' },
  { value: 'CANCELLED', label: '취소' },
];

function formatCouponBenefit(coupon) {
  const value = Number(coupon.discountValue);
  if (!Number.isFinite(value)) return '-';

  const formatted = value.toLocaleString('ko-KR', {
    maximumFractionDigits: 2,
  });

  if (coupon.discountType === 'RATE') return `${formatted}%`;
  if (coupon.discountType === 'AMOUNT') return `${formatted}원`;
  return formatted;
}

export default function MyCouponList({ userId }) {
  const [status, setStatus] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingId, setUsingId] = useState(null);
  const [error, setError] = useState(null);

  const loadCoupons = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchMyCoupons(userId, { status: status || undefined });
      setCoupons(response?.items ?? []);
    } catch (requestError) {
      setCoupons([]);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [status, userId]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const useCoupon = async (couponId) => {
    if (!window.confirm('이 쿠폰을 사용 완료 상태로 변경할까요?')) return;
    setUsingId(couponId);
    setError(null);
    try {
      await useMyCoupon(userId, couponId);
      await loadCoupons();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUsingId(null);
    }
  };

  return (
    <section className="reward-coupons data-surface">
      <div className="section-heading-row">
        <div>
          <h2>내 쿠폰함</h2>
          <p>발급받은 쿠폰의 상태와 만료일을 확인할 수 있습니다.</p>
        </div>
        <label className="compact-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <LoadingState /> : error ? (
        <ErrorState>{error}</ErrorState>
      ) : coupons.length === 0 ? (
        <EmptyState title="조건에 맞는 쿠폰이 없습니다." />
      ) : (
        <div className="responsive-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>쿠폰 코드</th>
                <th>할인</th>
                <th>상태</th>
                <th>만료일</th>
                <th aria-label="쿠폰 작업" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="coupon-code">{coupon.couponCode}</td>
                  <td>{formatCouponBenefit(coupon)}</td>
                  <td><StatusBadge status={coupon.status} /></td>
                  <td>{formatDateTime(coupon.expiresAt)}</td>
                  <td className="table-action">
                    {coupon.status === 'ISSUED' && (
                      <button
                        type="button"
                        className="button-secondary button-small"
                        disabled={usingId === coupon.id}
                        onClick={() => useCoupon(coupon.id)}
                      >
                        {usingId === coupon.id ? '처리 중' : '사용 처리'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
