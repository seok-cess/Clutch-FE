import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { fetchBackfillStatus, fetchCouponEvents } from '../../api/admin.js';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import { formatNumber } from '../../shared/utils/format.js';

export default function AdminDashboardPage() {
  const [events, setEvents] = useState([]);
  const [backfill, setBackfill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCouponEvents({ size: 20 }), fetchBackfillStatus()])
      .then(([eventResponse, backfillResponse]) => {
        if (cancelled) return;
        setEvents(eventResponse?.events ?? []);
        setBackfill(backfillResponse);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openEvents = events.filter((event) => event.eventStatus === 'OPEN');
  const remainingQuantity = events.reduce((total, event) => total + (event.remainingQuantity ?? 0), 0);

  return (
    <div className="admin-page">
      <PageHeader
        title="운영 요약"
        description="쿠폰 이벤트와 데이터 적재 상태를 확인합니다."
        actions={<NavLink className="button-primary" to="/admin/coupon-events/new">이벤트 생성</NavLink>}
      />
      {loading ? <LoadingState /> : error ? (
        <ErrorState>{error}</ErrorState>
      ) : (
        <>
          <section className="admin-metrics">
            <article className="metric-wide">
              <span>쿠폰 이벤트</span>
              <strong>{formatNumber(events.length)}</strong>
              <p>현재 조회 범위의 등록 이벤트</p>
            </article>
            <article>
              <span>진행 중</span>
              <strong>{formatNumber(openEvents.length)}</strong>
              <p>신청 가능한 이벤트</p>
            </article>
            <article>
              <span>남은 쿠폰</span>
              <strong>{formatNumber(remainingQuantity)}</strong>
              <p>이벤트 잔여 수량 합계</p>
            </article>
            <article className={backfill?.running ? 'metric-running' : ''}>
              <span>백필 상태</span>
              <strong>{backfill?.running ? '실행 중' : '대기'}</strong>
              <p>{formatNumber(backfill?.gamesPersisted)}개 세트 적재</p>
            </article>
          </section>

          <section className="admin-quick-actions data-surface">
            <div className="section-heading-row">
              <div>
                <h2>운영 작업</h2>
                <p>자주 사용하는 관리 화면으로 이동합니다.</p>
              </div>
            </div>
            <div className="action-list">
              <NavLink to="/admin/coupon-events"><span>쿠폰 이벤트</span><small>목록, 상세, 수정과 삭제</small></NavLink>
              <NavLink to="/admin/coupons"><span>발급 쿠폰 취소</span><small>쿠폰 ID와 취소 사유 입력</small></NavLink>
              <NavLink to="/admin/backfill"><span>데이터 백필</span><small>실행 상태 확인과 신규 적재</small></NavLink>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
