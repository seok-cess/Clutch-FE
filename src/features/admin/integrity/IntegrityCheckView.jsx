import { EmptyState } from '../../../shared/components/AsyncState.jsx';
import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import { formatNumber } from '../../../shared/utils/format.js';

const VERDICT_LABEL = {
  PASS: 'PASS',
  INFO: 'INFO',
  WARN: 'WARN',
  FAIL: 'FAIL',
};

function utcDate(value) {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIntegrityDateTime(value, timeZone = 'Asia/Seoul') {
  const date = utcDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}시간 ${minutes}분 ${rest}초`;
  if (minutes > 0) return `${minutes}분 ${rest}초`;
  return `${rest}초`;
}

export function getIntegrityBadge(check) {
  if (check?.executionStatus === 'RUNNING') return { status: 'RUNNING', label: '실행 중' };
  if (check?.executionStatus === 'FAILED') return { status: 'FAILED', label: '실행 실패' };
  const verdict = check?.overallVerdict ?? 'UNKNOWN';
  return { status: verdict, label: VERDICT_LABEL[verdict] ?? '확인 필요' };
}

export function IntegrityRunSummary({ check, title = '최근 실행' }) {
  if (!check) return null;
  const badge = getIntegrityBadge(check);
  const completed = check.executionStatus === 'COMPLETED';
  const running = check.executionStatus === 'RUNNING';
  const targetCount = check.claimRequestCount;

  return (
    <section className={`data-surface integrity-run-summary integrity-run-${String(check.executionStatus).toLowerCase()}`} aria-labelledby="integrity-run-title">
      <div className="integrity-run-main">
        <div className="integrity-run-copy">
          <div className="integrity-run-heading">
            <h2 id="integrity-run-title">{title}</h2>
            <StatusBadge status={badge.status} label={badge.label} />
          </div>
          <dl className="integrity-run-meta">
            <div><dt>실행 시각</dt><dd>{formatIntegrityDateTime(check.startedAt)}</dd></div>
            <div><dt>기준 시각</dt><dd>{formatIntegrityDateTime(check.asOfUtc, 'UTC')} {check.asOfUtc ? 'UTC' : ''}</dd></div>
            <div><dt>소요 시간</dt><dd>{running ? '측정 중' : formatDuration(check.durationSeconds)}</dd></div>
            <div><dt>검증 대상</dt><dd>{formatNumber(targetCount)}건</dd></div>
          </dl>
        </div>

        <dl className="integrity-verdict-metrics" aria-label="검증 판정 집계">
          <div className="metric-fail"><dt>FAIL</dt><dd>{formatNumber(check.failCount)}</dd></div>
          <div className="metric-warn"><dt>WARN</dt><dd>{formatNumber(check.warnCount)}</dd></div>
          <div className="metric-info"><dt>INFO</dt><dd>{formatNumber(check.infoCount)}</dd></div>
          <div><dt>검사항목</dt><dd>{formatNumber(check.checkCount)}</dd></div>
        </dl>
      </div>

      <div className="integrity-progress-row">
        {completed ? (
          <progress max="100" value="100" aria-label="검증 완료">100%</progress>
        ) : running ? (
          <progress aria-label="검증 실행 중" />
        ) : (
          <span className="integrity-progress-failed">검증을 완료하지 못했습니다.</span>
        )}
        <strong>{completed ? '100%' : running ? '진행률을 계산하지 않습니다.' : 'FAILED'}</strong>
      </div>

      {check.executionStatus === 'FAILED' && (
        <div className="integrity-run-error" role="alert">
          <strong>{check.errorCode ?? 'INTEGRITY_CHECK_EXECUTION_FAILED'}</strong>
          <span>{check.errorMessage ?? '검증 실행 중 오류가 발생했습니다. 상세 로그를 확인해 주세요.'}</span>
        </div>
      )}
    </section>
  );
}

export function IntegrityResultsTable({ results = [], limit }) {
  const visibleResults = Number.isInteger(limit) ? results.slice(0, limit) : results;
  if (visibleResults.length === 0) {
    return (
      <EmptyState
        title="표시할 검증 결과가 없습니다."
        description="검증이 완료되면 항목별 판정과 위반 건수가 표시됩니다."
      />
    );
  }

  return (
    <div className="responsive-table-wrap integrity-results-wrap">
      <table className="app-table integrity-results-table">
        <thead>
          <tr>
            <th>판정</th>
            <th>검증 항목</th>
            <th>위반 건수</th>
            <th>기준</th>
          </tr>
        </thead>
        <tbody>
          {visibleResults.map((result) => (
            <tr key={result.checkCode}>
              <td><StatusBadge status={result.verdict} label={VERDICT_LABEL[result.verdict]} /></td>
              <td>
                <strong>{result.description}</strong>
                <code>{result.checkCode}</code>
              </td>
              <td className={result.violationCount > 0 ? `count-${String(result.verdict).toLowerCase()}` : ''}>
                {formatNumber(result.violationCount)}
              </td>
              <td><StatusBadge status={result.severity} label={VERDICT_LABEL[result.severity]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
