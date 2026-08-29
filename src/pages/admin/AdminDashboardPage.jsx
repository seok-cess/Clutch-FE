import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { fetchBackfillStatus, fetchCouponDashboard } from '../../api/admin.js';
import { useAdmin } from '../../layouts/AdminLayout.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime, formatNumber } from '../../shared/utils/format.js';

const TREND_DAY_OPTIONS = [7, 14, 30];

function getKstToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatRate(value) {
  if (value === null || value === undefined) return '-';
  const rate = Number(value);
  if (!Number.isFinite(rate)) return '-';
  return `${rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
}

function normalizeCount(value) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeKstDateTime(value) {
  if (!value) return null;
  const source = String(value);
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(source) ? source : `${source}+09:00`;
}

function formatKstTime(value) {
  const source = normalizeKstDateTime(value);
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getKstDateKey(value) {
  const source = normalizeKstDateTime(value);
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function formatTrendValue(value, compact) {
  if (!compact) return formatNumber(value);
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getTrendScale(values) {
  const maximum = Math.max(0, ...values);
  if (maximum === 0) return { maximum: 1, ticks: [0] };

  const roughStep = maximum / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const step = Math.max(1, niceFraction * magnitude);
  const scaleMaximum = Math.ceil(maximum / step) * step;
  const ticks = [];
  for (let value = scaleMaximum; value >= 0; value -= step) ticks.push(value);
  return { maximum: scaleMaximum, ticks };
}

function getIssueRate(event) {
  const issued = Number(event.issuedQuantity ?? 0);
  const total = Number(event.totalQuantity ?? 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((issued / total) * 100));
}

function getErrorMessage(error) {
  if (error?.status === 503) {
    return '쿠폰 재고를 확인할 수 없습니다. Redis 복구가 완료된 뒤 다시 시도해 주세요.';
  }
  if (error?.status === 403) return '운영 홈을 조회할 관리자 권한이 없습니다.';
  return '운영 데이터를 불러오지 못했습니다. 서버 연결을 확인한 뒤 다시 시도해 주세요.';
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

function TrendSeries({ items, values, scale, tone, title, showDates, partialDate }) {
  const compactValues = items.length > 7;

  return (
    <section className={`dashboard-trend-series dashboard-trend-series-${tone}`} aria-label={title}>
      <div className="dashboard-trend-series-heading">
        <strong>{title}</strong>
        <span><i aria-hidden="true" />별도 눈금</span>
      </div>
      <div className="dashboard-trend-plot">
        <div className="dashboard-trend-axis" aria-hidden="true">
          {scale.ticks.map((tick) => (
            <span key={tick} style={{ '--trend-tick-position': `${(tick / scale.maximum) * 100}%` }}>
              {formatTrendValue(tick, true)}
            </span>
          ))}
        </div>
        <div className="dashboard-trend-plot-body">
          <div className="dashboard-trend-grid" aria-hidden="true">
            {scale.ticks.map((tick) => (
              <i key={tick} style={{ '--trend-tick-position': `${(tick / scale.maximum) * 100}%` }} />
            ))}
          </div>
          <div className="dashboard-trend-columns" style={{ '--trend-columns': items.length }}>
            {items.map((item, index) => {
              const value = values[index];
              const isPartial = item.date === partialDate;
              return (
                <div
                  className={`dashboard-trend-day${isPartial ? ' is-partial' : ''}`}
                  key={item.date}
                >
                  <span className="dashboard-trend-value" title={`${formatNumber(value)}건`}>
                    {formatTrendValue(value, compactValues)}
                  </span>
                  <span className="dashboard-trend-column" aria-hidden="true">
                    <i
                      data-positive={value > 0 ? 'true' : 'false'}
                      style={{ '--trend-height': `${(value / scale.maximum) * 100}%` }}
                    />
                  </span>
                  {showDates && (
                    <span className="dashboard-trend-date">
                      {formatDate(item.date)}
                      {isPartial && <small>부분 집계</small>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function IssuanceTrend({ items, generatedAt, partialDate }) {
  if (items.length === 0) {
    return (
      <div className="dashboard-empty">
        <strong>표시할 발급 추이가 없습니다.</strong>
        <span>선택한 기간에 발급 요청이 발생하면 일별 결과가 표시됩니다.</span>
      </div>
    );
  }

  const issuedValues = items.map((item) => normalizeCount(item.issuedCount));
  const failedValues = items.map((item) => normalizeCount(item.failedCount));
  const issuedScale = getTrendScale(issuedValues);
  const failedScale = getTrendScale(failedValues);
  const totalFailed = failedValues.reduce((sum, value) => sum + value, 0);
  const generatedTime = formatKstTime(generatedAt);

  return (
    <figure className="dashboard-trend-chart">
      <figcaption className="dashboard-visually-hidden">
        날짜별 쿠폰 발급 성공과 실패 추이입니다. 두 그래프는 각각 독립된 세로축을 사용합니다.
      </figcaption>
      <div className="dashboard-trend-meta">
        {partialDate && generatedTime && (
          <span className="dashboard-trend-partial">
            오늘 데이터 · <time dateTime={normalizeKstDateTime(generatedAt)}>{generatedTime}까지 집계</time>
          </span>
        )}
        <span className={`dashboard-trend-failure-summary${totalFailed > 0 ? ' has-failures' : ''}`}>
          선택 기간 실패 {formatNumber(totalFailed)}건
        </span>
      </div>
      <div className="dashboard-trend-scroll" tabIndex="0" aria-label="발급 추이 그래프. 가로 방향으로 스크롤할 수 있습니다.">
        <div className="dashboard-trend-inner" style={{ '--trend-columns': items.length }} aria-hidden="true">
          <TrendSeries
            items={items}
            values={issuedValues}
            scale={issuedScale}
            tone="issued"
            title="발급 성공"
            showDates={false}
          />
          <TrendSeries
            items={items}
            values={failedValues}
            scale={failedScale}
            tone="failed"
            title="발급 실패"
            showDates
            partialDate={partialDate}
          />
        </div>
      </div>
      <table className="dashboard-visually-hidden">
        <caption>날짜별 쿠폰 발급 성공과 실패 건수</caption>
        <thead><tr><th>날짜</th><th>발급 성공</th><th>발급 실패</th></tr></thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.date}>
              <th>{formatDate(item.date)}{item.date === partialDate ? ' 부분 집계' : ''}</th>
              <td>{formatNumber(issuedValues[index])}건</td>
              <td>{formatNumber(failedValues[index])}건</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function AdminDashboardPage() {
  const { adminId } = useAdmin();
  const dashboardRequestId = useRef(0);
  const [date, setDate] = useState(getKstToday);
  const [trendDays, setTrendDays] = useState(7);
  const [dashboardState, setDashboardState] = useState({ data: null, loading: true, error: null });
  const [backfillState, setBackfillState] = useState({ data: null, loading: true, error: null });

  const loadDashboard = useCallback(async () => {
    const requestId = ++dashboardRequestId.current;
    setDashboardState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetchCouponDashboard(adminId, { date, trendDays });
      if (requestId === dashboardRequestId.current) {
        setDashboardState({ data: response, loading: false, error: null });
      }
    } catch (requestError) {
      if (requestId === dashboardRequestId.current) {
        setDashboardState({ data: null, loading: false, error: requestError });
      }
    }
  }, [adminId, date, trendDays]);

  const loadBackfill = useCallback(async () => {
    setBackfillState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetchBackfillStatus();
      setBackfillState({ data: response, loading: false, error: null });
    } catch (requestError) {
      setBackfillState({ data: null, loading: false, error: requestError });
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadBackfill();
  }, [loadBackfill]);

  const dashboard = dashboardState.data;
  const summary = dashboard?.summary;
  const events = dashboard?.events ?? [];
  const alerts = dashboard?.alerts ?? [];
  const trend = dashboard?.issuanceTrend ?? [];
  const backfill = backfillState.data;
  const dashboardUnavailable = dashboardState.loading || Boolean(dashboardState.error);
  const dateLabel = date === getKstToday() ? '오늘' : '기준일';
  const generatedAtValue = normalizeKstDateTime(dashboard?.generatedAt);
  const generatedAt = generatedAtValue
    ? formatDateTime(generatedAtValue, { timeZone: 'Asia/Seoul' })
    : '-';
  const today = getKstToday();
  const partialDate = date === today
    && getKstDateKey(dashboard?.generatedAt) === today
    && trend.some((item) => item.date === today)
    ? today
    : null;

  return (
    <div className="admin-page admin-home-page">
      <PageHeader
        title="운영 홈"
        description="쿠폰 발급 현황과 처리할 운영 이슈를 한곳에서 확인합니다."
        actions={<NavLink className="button-primary" to="/admin/coupon-events/new">이벤트 생성</NavLink>}
      />

      <section className="dashboard-status-section" aria-labelledby="dashboard-status-title">
        <div className="dashboard-section-heading dashboard-status-heading">
          <div>
            <h2 id="dashboard-status-title">운영 상태</h2>
            <p>{date} 기준 · 마지막 집계 {generatedAt}</p>
          </div>
          <div className="dashboard-toolbar">
            <label className="compact-field">
              <span>기준일</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="compact-field">
              <span>추이 기간</span>
              <select value={trendDays} onChange={(event) => setTrendDays(Number(event.target.value))}>
                {TREND_DAY_OPTIONS.map((days) => <option key={days} value={days}>{days}일</option>)}
              </select>
            </label>
            <button
              className="button-secondary button-small"
              type="button"
              onClick={() => { loadDashboard(); loadBackfill(); }}
              disabled={dashboardState.loading || backfillState.loading}
            >
              새로고침
            </button>
          </div>
        </div>

        {dashboardState.error && (
          <InlineError onRetry={loadDashboard}>{getErrorMessage(dashboardState.error)}</InlineError>
        )}

        <div className="dashboard-status-grid" aria-live="polite">
          <article>
            <span>진행 중 이벤트</span>
            <strong>{dashboardUnavailable ? '-' : formatNumber(summary?.openEventCount)}</strong>
            <p>현재 쿠폰 신청이 열린 이벤트</p>
          </article>
          <article className={!dashboardState.error && Number(summary?.soldOutEventCount ?? 0) > 0 ? 'needs-attention' : ''}>
            <span>재고 소진</span>
            <strong>{dashboardUnavailable ? '-' : formatNumber(summary?.soldOutEventCount)}</strong>
            <p>Redis 실시간 재고 기준</p>
          </article>
          <article>
            <span>{dateLabel} 발급</span>
            <strong>{dashboardUnavailable ? '-' : formatNumber(summary?.todayIssuedCount)}</strong>
            <p>{dashboardUnavailable ? '전체 요청 -' : `전체 요청 ${formatNumber(summary?.todayRequestCount)}건`}</p>
          </article>
          <article className={!dashboardState.error && Number(summary?.todayFailedCount ?? 0) > 0 ? 'needs-attention' : ''}>
            <span>발급 실패</span>
            <strong>{dashboardUnavailable ? '-' : formatNumber(summary?.todayFailedCount)}</strong>
            <p>{dashboardUnavailable ? '처리 중 -' : `처리 중 ${formatNumber(summary?.todayPendingCount)}건`}</p>
          </article>
          <article>
            <span>성공률</span>
            <strong>{dashboardUnavailable ? '-' : formatRate(summary?.todaySuccessRate)}</strong>
            <p>성공·실패 처리 완료 요청 기준</p>
          </article>
        </div>
      </section>

      <div className="dashboard-insight-grid">
        <section className="data-surface dashboard-trend-surface" aria-labelledby="dashboard-trend-title">
          <div className="dashboard-section-heading">
            <div>
              <h2 id="dashboard-trend-title">발급 추이</h2>
              <p>선택한 {trendDays}일 동안의 발급 성공과 실패 건수입니다.</p>
            </div>
          </div>
          {dashboardState.error ? (
            <div className="dashboard-empty"><strong>발급 추이를 표시할 수 없습니다.</strong></div>
          ) : dashboardState.loading ? (
            <div className="dashboard-loading" role="status">발급 추이를 불러오는 중입니다.</div>
          ) : (
            <IssuanceTrend
              items={trend}
              generatedAt={dashboard?.generatedAt}
              partialDate={partialDate}
            />
          )}
        </section>

        <aside className="data-surface dashboard-alert-surface" aria-labelledby="dashboard-alert-title">
          <div className="dashboard-section-heading">
            <div>
              <h2 id="dashboard-alert-title">처리 필요</h2>
              <p>지금 확인해야 할 쿠폰 운영 항목입니다.</p>
            </div>
          </div>
          {dashboardState.error ? (
            <div className="dashboard-empty dashboard-alert-empty"><strong>처리 항목을 표시할 수 없습니다.</strong></div>
          ) : dashboardState.loading ? (
            <div className="dashboard-loading" role="status">알림을 확인하는 중입니다.</div>
          ) : alerts.length === 0 ? (
            <div className="dashboard-empty dashboard-alert-empty">
              <strong>처리할 항목이 없습니다.</strong>
              <span>현재 쿠폰 운영 상태가 정상입니다.</span>
            </div>
          ) : (
            <div className="dashboard-alert-list">
              {alerts.map((alert) => (
                <NavLink
                  className={`dashboard-alert dashboard-alert-${String(alert.severity).toLowerCase()}`}
                  key={`${alert.type}-${alert.targetUrl}`}
                  to={alert.targetUrl}
                >
                  <span>{alert.title}</span>
                  <strong>{formatNumber(alert.count)}</strong>
                  <ChevronIcon />
                </NavLink>
              ))}
            </div>
          )}
        </aside>
      </div>

      <section className="data-surface dashboard-event-surface" aria-labelledby="dashboard-event-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-event-title">쿠폰 이벤트 현황</h2>
            <p>운영 우선순위에 따라 제공된 이벤트를 표시합니다.</p>
          </div>
          <NavLink className="dashboard-text-link" to="/admin/coupon-events">전체 보기<ChevronIcon /></NavLink>
        </div>

        {dashboardState.error ? (
          <div className="dashboard-empty"><strong>이벤트 현황을 표시할 수 없습니다.</strong></div>
        ) : dashboardState.loading ? (
          <div className="dashboard-loading" role="status">이벤트를 불러오는 중입니다.</div>
        ) : events.length === 0 ? (
          <div className="dashboard-empty">
            <strong>표시할 쿠폰 이벤트가 없습니다.</strong>
            <span>새 이벤트를 생성하면 경기와 발급 상태를 이곳에서 확인할 수 있습니다.</span>
          </div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="app-table dashboard-event-table">
              <thead>
                <tr>
                  <th>이벤트</th>
                  <th>경기</th>
                  <th>발급 현황</th>
                  <th>잔여</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const issueRate = getIssueRate(event);
                  return (
                    <tr key={event.couponEventId}>
                      <td>
                        <NavLink className="table-link" to={`/admin/coupon-events/${event.couponEventId}`}>
                          {event.eventName}
                        </NavLink>
                      </td>
                      <td><strong className="dashboard-match-name">{formatDate(event.matchDate)} {event.matchName ?? '-'}</strong></td>
                      <td>
                        <div className="dashboard-issue-progress">
                          <span>{formatNumber(event.issuedQuantity)} / {formatNumber(event.totalQuantity)}</span>
                          <progress max="100" value={issueRate}>{issueRate}%</progress>
                        </div>
                      </td>
                      <td>{formatNumber(event.remainingQuantity)}</td>
                      <td><StatusBadge status={event.eventStatus} label={event.statusLabel} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
