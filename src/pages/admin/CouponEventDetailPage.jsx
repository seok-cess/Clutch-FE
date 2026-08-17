import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { deleteCouponEvent, fetchCouponEvent } from '../../api/admin.js';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime, formatNumber } from '../../shared/utils/format.js';

const MODE_LABEL = {
  SINGLE_FIRST_COME: '단일 선착순',
  PHASED_FIRST_COME: '단계별 선착순',
};

export default function CouponEventDetailPage() {
  const navigate = useNavigate();
  const { couponEventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCouponEvent(couponEventId)
      .then((response) => { if (!cancelled) setEvent(response); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [couponEventId]);

  const remove = async () => {
    if (!window.confirm('이 쿠폰 이벤트를 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCouponEvent(couponEventId);
      navigate('/admin/coupon-events');
    } catch (requestError) {
      setError(requestError.message);
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page detail-page">
      <PageHeader
        title={event?.eventName ?? '쿠폰 이벤트 상세'}
        description="이벤트 설정, 발급 수량과 최근 회차 상태를 확인합니다."
        actions={event && (
          <>
            <NavLink className="button-secondary" to={`/admin/coupon-events/${couponEventId}/edit`}>수정</NavLink>
            <button className="button-danger" type="button" onClick={remove} disabled={deleting}>
              {deleting ? '삭제 중' : '삭제'}
            </button>
          </>
        )}
      />
      {error && <ErrorState>{error}</ErrorState>}
      {loading ? <LoadingState /> : event && (
        <>
          <section className="detail-summary data-surface">
            <div className="detail-status-line">
              <StatusBadge status={event.eventStatus} />
              <span>이벤트 ID {event.couponEventId}</span>
            </div>
            <dl className="detail-grid">
              <div><dt>경기 ID</dt><dd>{event.esportsMatchId}</dd></div>
              <div><dt>트리거</dt><dd>{event.triggerType}</dd></div>
              <div><dt>발급 방식</dt><dd>{MODE_LABEL[event.issueMode] ?? event.issueMode}</dd></div>
              <div><dt>신청 시간</dt><dd>{event.claimWindowSeconds}초</dd></div>
              <div><dt>전체 수량</dt><dd>{formatNumber(event.totalQuantity)}</dd></div>
              <div><dt>발급 수량</dt><dd>{formatNumber(event.issuedQuantity)}</dd></div>
              <div><dt>남은 수량</dt><dd className="accent-number">{formatNumber(event.remainingQuantity)}</dd></div>
              <div><dt>수정일</dt><dd>{formatDateTime(event.updatedAt)}</dd></div>
            </dl>
          </section>

          <section className="data-surface">
            <div className="section-heading-row">
              <div><h2>쿠폰 항목</h2><p>항목별 수량과 발급 현황입니다.</p></div>
            </div>
            <div className="responsive-table-wrap">
              <table className="app-table">
                <thead><tr><th>쿠폰 종류 ID</th><th>단계</th><th>오픈 지연</th><th>발급</th><th>잔여</th></tr></thead>
                <tbody>
                  {event.items.map((item) => (
                    <tr key={item.couponEventItemId}>
                      <td>{item.couponTypeId}</td>
                      <td>{item.phaseSequence ?? '-'}</td>
                      <td>{item.openOffsetSeconds}초</td>
                      <td>{formatNumber(item.successCount)} / {formatNumber(item.quantity)}</td>
                      <td>{formatNumber(item.remainingQuantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="data-surface occurrence-surface">
            <div className="section-heading-row">
              <div><h2>최근 회차</h2><p>가장 최근에 감지된 이벤트 회차입니다.</p></div>
              {event.latestOccurrence && <StatusBadge status={event.latestOccurrence.occurrenceStatus} />}
            </div>
            {event.latestOccurrence ? (
              <dl className="detail-grid compact">
                <div><dt>감지 시각</dt><dd>{formatDateTime(event.latestOccurrence.detectedAt)}</dd></div>
                <div><dt>오픈 시각</dt><dd>{formatDateTime(event.latestOccurrence.openedAt)}</dd></div>
                <div><dt>만료 시각</dt><dd>{formatDateTime(event.latestOccurrence.expiresAt)}</dd></div>
                <div><dt>게임 시간</dt><dd>{event.latestOccurrence.gameTimeSeconds ?? '-'}초</dd></div>
              </dl>
            ) : <p className="surface-empty-copy">아직 감지된 회차가 없습니다.</p>}
          </section>
        </>
      )}
    </div>
  );
}
