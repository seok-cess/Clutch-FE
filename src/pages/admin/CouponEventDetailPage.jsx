import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import {
  deleteCouponEvent,
  fetchCouponEvent,
  fetchCouponType,
  resetCouponEventForTest,
} from '../../api/admin.js';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime, formatNumber } from '../../shared/utils/format.js';

/**
 * 테스트 전용으로 예약한 경기 ID. 백엔드 CouponTestMatch.SAMPLE_MATCH_ID 와 같아야 한다.
 * replay 재생은 실행마다 경기 ID 가 달라져 실제 경기에 이벤트를 미리 걸 수 없다.
 */
export const SAMPLE_MATCH_ID = -1;

const MODE_LABEL = {
  SINGLE_FIRST_COME: '단일 선착순',
  PHASED_FIRST_COME: '단계별 선착순',
};

function formatCouponBenefit(couponType) {
  const value = Number(couponType?.discountValue);
  if (!Number.isFinite(value)) return null;
  const formatted = value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return couponType.discountType === 'RATE' ? `${formatted}%` : `${formatted}원`;
}

export default function CouponEventDetailPage() {
  const navigate = useNavigate();
  const { couponEventId } = useParams();
  const [event, setEvent] = useState(null);
  const [couponTypes, setCouponTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCouponEvent(couponEventId)
      .then(async (response) => {
        const couponTypeResponse = await Promise.all(
          response.items.map((item) => fetchCouponType(item.couponTypeId)),
        ).catch(() => []);
        if (!cancelled) {
          setEvent(response);
          setCouponTypes(couponTypeResponse);
        }
      })
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

  const [resetting, setResetting] = useState(false);

  /*
   * 시연을 반복하려면 이번에 생긴 회차와 발급 이력을 지워야 한다.
   * 일반 삭제는 이력이 있으면 막히고, 이벤트 정의까지 사라져 다시 만들어야 한다.
   */
  const resetForTest = async () => {
    if (!window.confirm(
      '이 이벤트의 회차와 발급 이력을 모두 지우고 READY 로 되돌릴까요? '
      + '이벤트 설정(항목·단계)은 그대로 남습니다.',
    )) return;

    setResetting(true);
    setError(null);
    setNotice(null);
    try {
      const deleted = await resetCouponEventForTest(couponEventId);
      const refreshedEvent = await fetchCouponEvent(couponEventId);
      setEvent(refreshedEvent);
      setNotice(
        `초기화했습니다 — 쿠폰 ${deleted.userCoupon}건, `
        + `발급 요청 ${deleted.claimRequest}건, 회차 ${deleted.occurrence}건 삭제`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetting(false);
    }
  };

  const couponTypeById = useMemo(() => new Map(
    couponTypes.map((couponType) => [String(couponType.couponTypeId), couponType]),
  ), [couponTypes]);

  return (
    <div className="admin-page detail-page">
      <PageHeader
        title={event?.eventName ?? '쿠폰 이벤트 상세'}
        description="이벤트 설정, 발급 수량과 최근 회차 상태를 확인합니다."
        actions={event && (
          <>
            <button
              className="button-secondary"
              type="button"
              onClick={resetForTest}
              disabled={resetting || deleting}
              title="회차와 발급 이력을 지우고 다시 시연할 수 있게 되돌립니다"
            >
              {resetting ? '초기화 중' : '테스트 초기화'}
            </button>
            <NavLink className="button-secondary" to={`/admin/coupon-events/${couponEventId}/edit`}>수정</NavLink>
            <button className="button-danger" type="button" onClick={remove} disabled={deleting || resetting}>
              {deleting ? '삭제 중' : '삭제'}
            </button>
          </>
        )}
      />
      {error && <ErrorState>{error}</ErrorState>}
      {notice && <div className="operation-notice" role="status">{notice}</div>}
      {loading ? <LoadingState /> : event && (
        <>
          <section className="detail-summary data-surface">
            <div className="detail-status-line">
              <StatusBadge status={event.eventStatus} />
              <span>이벤트 ID {event.couponEventId}</span>
            </div>
            <dl className="detail-grid">
              <div>
                <dt>경기 ID</dt>
                <dd>
                  {event.esportsMatchId === SAMPLE_MATCH_ID
                    ? '테스트 경기 (재생 시연용)'
                    : event.esportsMatchId}
                </dd>
              </div>
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
                <thead><tr><th>쿠폰 종류</th><th>단계</th><th>오픈 지연</th><th>발급</th><th>잔여</th></tr></thead>
                <tbody>
                  {event.items.map((item) => {
                    const couponType = couponTypeById.get(String(item.couponTypeId));
                    const benefit = formatCouponBenefit(couponType);
                    return (
                      <tr key={item.couponEventItemId}>
                        <td className="event-coupon-type-cell">
                          <strong>{couponType?.couponName ?? `쿠폰 종류 ${item.couponTypeId}`}</strong>
                          <small>ID {item.couponTypeId}{benefit ? ` · ${benefit}` : ''}</small>
                        </td>
                        <td>{item.phaseSequence ?? '-'}</td>
                        <td>{item.openOffsetSeconds}초</td>
                        <td>{formatNumber(item.successCount)} / {formatNumber(item.quantity)}</td>
                        <td>{formatNumber(item.remainingQuantity)}</td>
                      </tr>
                    );
                  })}
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
