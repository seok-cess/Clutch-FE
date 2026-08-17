import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { fetchCouponEvents } from '../../api/admin.js';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime, formatNumber } from '../../shared/utils/format.js';

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'READY', label: '준비' },
  { value: 'OPEN', label: '진행 중' },
  { value: 'CLOSED', label: '종료' },
  { value: 'CANCELLED', label: '취소' },
];

const MODE_LABEL = {
  SINGLE_FIRST_COME: '단일 선착순',
  PHASED_FIRST_COME: '단계별 선착순',
};

export default function CouponEventsPage() {
  const [status, setStatus] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async (cursor) => {
    setLoading(true);
    setError(null);
    try {
      setResponse(await fetchCouponEvents({ status: status || undefined, cursor }));
    } catch (requestError) {
      setResponse(null);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const events = response?.events ?? [];

  return (
    <div className="admin-page">
      <PageHeader
        title="쿠폰 이벤트"
        description="경기 트리거에 연결된 쿠폰 이벤트의 상태와 재고를 관리합니다."
        actions={<NavLink className="button-primary" to="/admin/coupon-events/new">이벤트 생성</NavLink>}
      />
      <section className="toolbar data-surface">
        <label className="compact-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
        </label>
        <button className="button-secondary" type="button" onClick={() => loadEvents()} disabled={loading}>
          새로고침
        </button>
      </section>

      {loading ? <LoadingState /> : error ? (
        <ErrorState>{error}</ErrorState>
      ) : events.length === 0 ? (
        <EmptyState title="등록된 쿠폰 이벤트가 없습니다." description="새 이벤트를 생성해 경기 트리거와 연결할 수 있습니다." />
      ) : (
        <section className="data-surface admin-table-surface">
          <div className="responsive-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>이벤트</th>
                  <th>경기 ID</th>
                  <th>트리거</th>
                  <th>방식</th>
                  <th>상태</th>
                  <th>발급</th>
                  <th>잔여</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.couponEventId}>
                    <td>
                      <NavLink className="table-link" to={`/admin/coupon-events/${event.couponEventId}`}>
                        {event.eventName}
                      </NavLink>
                    </td>
                    <td>{event.esportsMatchId}</td>
                    <td>{event.triggerType}</td>
                    <td>{MODE_LABEL[event.issueMode] ?? event.issueMode}</td>
                    <td><StatusBadge status={event.eventStatus} /></td>
                    <td>{formatNumber(event.issuedQuantity)} / {formatNumber(event.totalQuantity)}</td>
                    <td>{formatNumber(event.remainingQuantity)}</td>
                    <td>{formatDateTime(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {response?.hasNext && (
            <div className="table-pagination">
              <button className="button-secondary" type="button" onClick={() => loadEvents(response.nextCursor)}>
                다음 목록
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
