import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { fetchCouponClaimHistory } from '../../../api/admin.js';
import { useAdmin } from '../../../layouts/AdminLayout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/AsyncState.jsx';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import { formatDateTime } from '../../../shared/utils/format.js';

const SEARCH_TYPES = [
  { value: 'EVENT', label: '이벤트 ID·이름', placeholder: '이벤트 ID 또는 이름 입력' },
  { value: 'TRIGGER', label: '트리거', placeholder: '예: PENTA_KILL' },
  { value: 'USER', label: '사용자 ID', placeholder: '사용자 ID 입력', numeric: true },
  { value: 'COUPON_TYPE', label: '쿠폰 종류 ID', placeholder: '쿠폰 종류 ID 입력', numeric: true },
];

const REQUEST_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '처리 중' },
  { value: 'SUCCEEDED', label: '발급 성공' },
  { value: 'FAILED', label: '발급 실패' },
];

const COUPON_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'ISSUED', label: '사용 가능' },
  { value: 'USED', label: '사용 완료' },
  { value: 'CANCELLED', label: '취소' },
];

const REQUEST_STATUS_LABELS = {
  PENDING: '처리 중',
  SUCCEEDED: '발급 성공',
  FAILED: '발급 실패',
};

const EMPTY_FILTERS = {
  searchType: 'EVENT',
  keyword: '',
  requestStatus: '',
  couponStatus: '',
  from: '',
  to: '',
};

function buildQuery(filters) {
  const query = {
    requestStatus: filters.requestStatus || undefined,
    couponStatus: filters.couponStatus || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  const keyword = filters.keyword.trim();
  if (!keyword) return query;

  if (filters.searchType === 'EVENT') query.eventKeyword = keyword;
  if (filters.searchType === 'TRIGGER') query.triggerKeyword = keyword;
  if (filters.searchType === 'USER') query.userId = keyword;
  if (filters.searchType === 'COUPON_TYPE') query.couponTypeId = keyword;
  return query;
}

function validateFilters(filters) {
  const keyword = filters.keyword.trim();
  const selectedType = SEARCH_TYPES.find((type) => type.value === filters.searchType);
  if (keyword && selectedType?.numeric && (!/^\d+$/.test(keyword) || Number(keyword) < 1)) {
    return `${selectedType.label}는 1 이상의 숫자로 입력해주세요.`;
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    return '조회 시작 시각은 종료 시각보다 늦을 수 없습니다.';
  }
  return null;
}

function formatBenefit(claim) {
  const value = Number(claim.discountValue);
  if (!Number.isFinite(value)) return '-';
  const formatted = value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return claim.discountType === 'RATE' ? `${formatted}%` : `${formatted}원`;
}

export default function CouponClaimHistory() {
  const { adminId } = useAdmin();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState({});
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResponse(await fetchCouponClaimHistory(adminId, {
        ...query,
        cursor,
      }));
    } catch (requestError) {
      setResponse(null);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [adminId, cursor, query, reloadKey]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const changeFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const submitFilters = (event) => {
    event.preventDefault();
    const validationError = validateFilters(filters);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setCursor(null);
    setCursorHistory([]);
    setQuery(buildQuery(filters));
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQuery({});
    setCursor(null);
    setCursorHistory([]);
    setReloadKey((value) => value + 1);
  };

  const goNext = () => {
    if (!response?.hasNext || !response.nextCursor) return;
    setCursorHistory((history) => [...history, cursor]);
    setCursor(response.nextCursor);
  };

  const goPrevious = () => {
    if (cursorHistory.length === 0) return;
    setCursor(cursorHistory.at(-1) ?? null);
    setCursorHistory((history) => history.slice(0, -1));
  };

  const selectedSearchType = SEARCH_TYPES.find((type) => type.value === filters.searchType);
  const claims = response?.claims ?? [];

  return (
    <>
      <PageHeader
        title="쿠폰 발급 내역"
        description="이벤트별 발급 요청과 실제 쿠폰 발급 결과를 확인합니다. 개인정보는 마스킹되어 표시됩니다."
        actions={(
          <button
            className="button-secondary"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            새로고침
          </button>
        )}
      />

      <section className="data-surface claim-history-filter-surface">
        <form className="claim-history-filter" onSubmit={submitFilters}>
          <label className="compact-field">
            <span>검색 유형</span>
            <select
              value={filters.searchType}
              onChange={(event) => {
                changeFilter('searchType', event.target.value);
                changeFilter('keyword', '');
              }}
            >
              {SEARCH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="field-block claim-history-keyword-field">
            <span>검색어</span>
            <input
              type={selectedSearchType?.numeric ? 'number' : 'search'}
              min={selectedSearchType?.numeric ? '1' : undefined}
              value={filters.keyword}
              onChange={(event) => changeFilter('keyword', event.target.value)}
              placeholder={selectedSearchType?.placeholder}
            />
          </label>
          <label className="compact-field">
            <span>요청 결과</span>
            <select
              value={filters.requestStatus}
              onChange={(event) => changeFilter('requestStatus', event.target.value)}
            >
              {REQUEST_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            <span>쿠폰 상태</span>
            <select
              value={filters.couponStatus}
              onChange={(event) => changeFilter('couponStatus', event.target.value)}
            >
              {COUPON_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field-block">
            <span>조회 시작</span>
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(event) => changeFilter('from', event.target.value)}
            />
          </label>
          <label className="field-block">
            <span>조회 종료</span>
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(event) => changeFilter('to', event.target.value)}
            />
          </label>
          <div className="claim-history-filter-actions">
            <button className="button-secondary" type="button" onClick={resetFilters} disabled={loading}>
              초기화
            </button>
            <button className="button-primary" type="submit" disabled={loading}>
              조회
            </button>
          </div>
        </form>
      </section>

      {loading ? <LoadingState>쿠폰 발급 내역을 불러오는 중입니다.</LoadingState> : error ? (
        <ErrorState>{error}</ErrorState>
      ) : claims.length === 0 ? (
        <EmptyState
          title="조회된 쿠폰 발급 내역이 없습니다."
          description="검색 조건을 변경하거나 이벤트 발급이 진행된 후 다시 확인해주세요."
        />
      ) : (
        <section className="data-surface admin-table-surface claim-history-table-surface">
          <div className="responsive-table-wrap">
            <table className="app-table claim-history-table">
              <thead>
                <tr>
                  <th>요청 ID·시각</th>
                  <th>이벤트</th>
                  <th>사용자</th>
                  <th>쿠폰 혜택</th>
                  <th>요청 결과</th>
                  <th>쿠폰 상태</th>
                  <th>실패 사유</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.claimRequestId}>
                    <td>
                      <strong className="claim-history-primary">#{claim.claimRequestId}</strong>
                      <small>{formatDateTime(claim.requestedAt)}</small>
                    </td>
                    <td>
                      <NavLink
                        className="table-link claim-history-primary"
                        to={`/admin/coupon-events/${claim.couponEventId}`}
                      >
                        {claim.eventName || `이벤트 #${claim.couponEventId}`}
                      </NavLink>
                      <small>ID {claim.couponEventId} · {claim.triggerType || '-'}</small>
                    </td>
                    <td>
                      <strong className="claim-history-primary">{claim.maskedName || `사용자 #${claim.userId}`}</strong>
                      <small>ID {claim.userId} · {claim.maskedEmail || '-'}</small>
                      <small>{claim.maskedPhoneNumber || '-'}</small>
                    </td>
                    <td>
                      <strong className="claim-history-benefit">{formatBenefit(claim)}</strong>
                      <small>{claim.couponName || `쿠폰 종류 #${claim.couponTypeId}`}</small>
                    </td>
                    <td>
                      <StatusBadge
                        status={claim.requestStatus}
                        label={REQUEST_STATUS_LABELS[claim.requestStatus]}
                      />
                      {claim.completedAt && <small>{formatDateTime(claim.completedAt)}</small>}
                    </td>
                    <td>
                      {claim.couponStatus ? <StatusBadge status={claim.couponStatus} /> : '-'}
                      {claim.userCouponId && <small>쿠폰 ID {claim.userCouponId}</small>}
                    </td>
                    <td className="claim-history-failure">{claim.failureReason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="claim-history-pagination">
            <span>{cursorHistory.length + 1}페이지</span>
            <div>
              <button
                className="button-secondary button-small"
                type="button"
                onClick={goPrevious}
                disabled={cursorHistory.length === 0 || loading}
              >
                이전
              </button>
              <button
                className="button-secondary button-small"
                type="button"
                onClick={goNext}
                disabled={!response?.hasNext || loading}
              >
                다음
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
