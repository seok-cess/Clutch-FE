import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { fetchBackfillStatus, fetchCouponEvents } from '../../api/admin.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatNumber } from '../../shared/utils/format.js';

function getIssueRate(event) {
  const issued = Number(event.issuedQuantity ?? 0);
  const total = Number(event.totalQuantity ?? 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((issued / total) * 100));
}

function ChevronIcon() {
  return (
    <svg className="dashboard-link-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

function InlineError({ children, onRetry }) {
  return (
    <div className="dashboard-inline-error" role="alert">
      <span>{children}</span>
      <button className="button-secondary button-small" type="button" onClick={onRetry}>다시 시도</button>
    </div>
  );
}

export default function AdminDashboardPage() {
  const requestId = useRef(0);
  const [eventsState, setEventsState] = useState({ data: [], loading: true, error: null });
  const [backfillState, setBackfillState] = useState({ data: null, loading: true, error: null });

  const loadEvents = useCallback(async () => {
    const id = ++requestId.current;
    setEventsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetchCouponEvents({ size: 20 });
      if (id === requestId.current) {
        setEventsState({ data: response?.events ?? [], loading: false, error: null });
      }
    } catch (requestError) {
      if (id === requestId.current) {
        setEventsState({ data: [], loading: false, error: requestError.message });
      }
    }
  }, []);

  const loadBackfill = useCallback(async () => {
    setBackfillState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetchBackfillStatus();
      setBackfillState({ data: response, loading: false, error: null });
    } catch (requestError) {
      setBackfillState({ data: null, loading: false, error: requestError.message });
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadBackfill();
  }, [loadBackfill, loadEvents]);

  const events = eventsState.data;
  const openEvents = events.filter((event) => event.eventStatus === 'OPEN');
  const soldOutEvents = openEvents.filter((event) => Number(event.remainingQuantity ?? 0) === 0);
  const backfill = backfillState.data;
  const eventSummaryUnavailable = eventsState.loading || Boolean(eventsState.error);
  const backfillSummaryUnavailable = backfillState.loading || Boolean(backfillState.error);
  const visibleEvents = [...events]
    .sort((left, right) => Number(right.eventStatus === 'OPEN') - Number(left.eventStatus === 'OPEN'))
    .slice(0, 5);

  return (
    <div className="admin-page admin-home-page">
      <PageHeader
        title="운영 홈"
        description="쿠폰 이벤트와 데이터 적재 상태를 한곳에서 확인합니다."
        actions={<NavLink className="button-primary" to="/admin/coupon-events/new">이벤트 생성</NavLink>}
      />

      <section className="dashboard-status-section" aria-labelledby="dashboard-status-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-status-title">운영 상태</h2>
            <p>현재 조회된 이벤트와 백필 작업 기준입니다.</p>
          </div>
          <button
            className="button-secondary button-small"
            type="button"
            onClick={() => { loadEvents(); loadBackfill(); }}
            disabled={eventsState.loading || backfillState.loading}
          >
            새로고침
          </button>
        </div>
        <div className="dashboard-status-grid">
          <article>
            <span>진행 중인 이벤트</span>
            <strong>{eventSummaryUnavailable ? '-' : formatNumber(openEvents.length)}</strong>
            <p>{eventsState.error ? '이벤트 상태를 확인할 수 없습니다.' : '현재 참여 가능한 쿠폰 이벤트'}</p>
          </article>
          <article className={!eventsState.error && soldOutEvents.length > 0 ? 'needs-attention' : ''}>
            <span>재고 소진 이벤트</span>
            <strong>{eventSummaryUnavailable ? '-' : formatNumber(soldOutEvents.length)}</strong>
            <p>{eventsState.error ? '재고 상태를 확인할 수 없습니다.' : soldOutEvents.length > 0 ? '진행 상태와 재고를 확인해 주세요.' : '현재 재고 소진 이벤트가 없습니다.'}</p>
          </article>
          <article className={!backfillState.error && Number(backfill?.gamesFailed ?? 0) > 0 ? 'needs-attention' : ''}>
            <span>백필 실패 세트</span>
            <strong>{backfillSummaryUnavailable ? '-' : formatNumber(backfill?.gamesFailed)}</strong>
            <p>{backfillState.error ? '백필 상태를 확인할 수 없습니다.' : backfill?.running ? '백필 작업이 실행 중입니다.' : '최근 백필 작업 기준'}</p>
          </article>
        </div>
      </section>

      <div className="dashboard-primary-grid">
        <section className="data-surface dashboard-event-surface" aria-labelledby="dashboard-event-title">
          <div className="dashboard-section-heading">
            <div>
              <h2 id="dashboard-event-title">쿠폰 이벤트 현황</h2>
              <p>진행 중인 이벤트를 우선해 최대 5개까지 표시합니다.</p>
            </div>
            <NavLink className="dashboard-text-link" to="/admin/coupon-events">전체 보기<ChevronIcon /></NavLink>
          </div>

          {eventsState.error ? (
            <InlineError onRetry={loadEvents}>
              쿠폰 이벤트 상태를 불러오지 못했습니다. 서버 연결을 확인한 뒤 다시 시도해 주세요.
            </InlineError>
          ) : eventsState.loading ? (
            <div className="dashboard-loading" role="status">이벤트를 불러오는 중입니다.</div>
          ) : visibleEvents.length === 0 ? (
            <div className="dashboard-empty">
              <strong>등록된 쿠폰 이벤트가 없습니다.</strong>
              <span>새 이벤트를 생성하면 이곳에서 상태와 발급량을 확인할 수 있습니다.</span>
            </div>
          ) : (
            <div className="responsive-table-wrap">
              <table className="app-table dashboard-event-table">
                <thead>
                  <tr>
                    <th>이벤트</th>
                    <th>경기 ID</th>
                    <th>발급 현황</th>
                    <th>잔여</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((event) => {
                    const issueRate = getIssueRate(event);
                    return (
                      <tr key={event.couponEventId}>
                        <td>
                          <NavLink className="table-link" to={`/admin/coupon-events/${event.couponEventId}`}>
                            {event.eventName}
                          </NavLink>
                        </td>
                        <td>{event.esportsMatchId}</td>
                        <td>
                          <div className="dashboard-issue-progress">
                            <span>{formatNumber(event.issuedQuantity)} / {formatNumber(event.totalQuantity)}</span>
                            <progress max="100" value={issueRate}>{issueRate}%</progress>
                          </div>
                        </td>
                        <td>{formatNumber(event.remainingQuantity)}</td>
                        <td><StatusBadge status={event.eventStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="data-surface dashboard-quick-surface" aria-labelledby="dashboard-quick-title">
          <div className="dashboard-section-heading">
            <div>
              <h2 id="dashboard-quick-title">빠른 작업</h2>
              <p>자주 사용하는 운영 화면으로 이동합니다.</p>
            </div>
          </div>
          <nav className="dashboard-quick-links" aria-label="관리자 빠른 작업">
            <NavLink to="/admin/coupon-events/new"><span>쿠폰 이벤트 만들기</span><small>경기 트리거와 발급 수량 설정</small><ChevronIcon /></NavLink>
            <NavLink to="/admin/coupon-types"><span>쿠폰 종류 등록</span><small>할인 방식과 혜택 값 설정</small><ChevronIcon /></NavLink>
            <NavLink to="/admin/coupon-claims"><span>발급 내역 조회</span><small>요청 상태와 실제 발급 결과 확인</small><ChevronIcon /></NavLink>
          </nav>
        </aside>
      </div>

      <section className="data-surface dashboard-backfill-surface" aria-labelledby="dashboard-backfill-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-backfill-title">데이터 백필</h2>
            <p>과거 경기 데이터 적재 작업의 현재 상태입니다.</p>
          </div>
          <NavLink className="dashboard-text-link" to="/admin/backfill">상세 관리<ChevronIcon /></NavLink>
        </div>
        {backfillState.error ? (
          <InlineError onRetry={loadBackfill}>
            백필 상태를 불러오지 못했습니다. 서버 연결을 확인한 뒤 다시 시도해 주세요.
          </InlineError>
        ) : backfillState.loading ? (
          <div className="dashboard-loading" role="status">백필 상태를 불러오는 중입니다.</div>
        ) : (
          <div className="dashboard-backfill-content">
            <div className="dashboard-backfill-state">
              <StatusBadge status={backfill?.running ? 'OPEN' : 'READY'} label={backfill?.running ? '실행 중' : '대기'} />
              <strong>{formatNumber(backfill?.progressPercent)}%</strong>
              <span>{formatNumber(backfill?.matchesScanned)} / {formatNumber(backfill?.matchesTotal)} 경기 확인</span>
            </div>
            <progress max="100" value={backfill?.progressPercent ?? 0}>{backfill?.progressPercent ?? 0}%</progress>
            <dl className="dashboard-backfill-metrics">
              <div><dt>적재 세트</dt><dd>{formatNumber(backfill?.gamesPersisted)}</dd></div>
              <div><dt>건너뜀</dt><dd>{formatNumber(backfill?.gamesSkipped)}</dd></div>
              <div><dt>실패</dt><dd>{formatNumber(backfill?.gamesFailed)}</dd></div>
              <div><dt>현재 경기</dt><dd>{backfill?.currentMatch ?? '-'}</dd></div>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
