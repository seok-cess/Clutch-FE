import { EmptyState } from '../../../shared/components/AsyncState.jsx';
import StatusBadge from '../../../shared/components/StatusBadge.jsx';
import { formatNumber } from '../../../shared/utils/format.js';

const VERDICT_LABEL = {
  PASS: '정상',
  INFO: '참고',
  WARN: '주의',
  FAIL: '오류',
};

const RUN_CONCLUSION = {
  PASS: '모든 검사를 통과했습니다.',
  INFO: '참고할 항목이 있습니다.',
  WARN: '확인이 필요한 항목이 있습니다.',
  FAIL: '데이터 오류가 발견되었습니다.',
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

function RunStatusIcon({ status, verdict }) {
  const passed = status === 'COMPLETED' && verdict === 'PASS';
  const tone = status === 'COMPLETED' ? String(verdict).toLowerCase() : String(status).toLowerCase();
  return (
    <span className={`integrity-run-status-icon integrity-run-status-${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {passed ? <path d="m6.5 12.5 3.4 3.4 7.8-8.1" /> : <path d="M12 7.5v5m0 4h.01" />}
      </svg>
    </span>
  );
}

function VerdictMetric({ className, label, value, unit }) {
  const count = Number(value ?? 0);
  const active = Number.isFinite(count) && count > 0;
  return (
    <div className={className} data-active={active || undefined}>
      <dt>{label}</dt>
      <dd><strong>{formatNumber(value)}</strong><span>{unit}</span></dd>
    </div>
  );
}

export function IntegrityRunSummary({ check, title = '최근 실행' }) {
  if (!check) return null;
  const badge = getIntegrityBadge(check);
  const completed = check.executionStatus === 'COMPLETED';
  const running = check.executionStatus === 'RUNNING';
  const targetCount = check.claimRequestCount;
  const conclusion = running
    ? '검증을 실행하고 있습니다.'
    : check.executionStatus === 'FAILED'
      ? '검증을 완료하지 못했습니다.'
      : RUN_CONCLUSION[check.overallVerdict] ?? '검증 결과를 확인해 주세요.';

  return (
    <section className={`data-surface integrity-run-summary integrity-run-${String(check.executionStatus).toLowerCase()}`} aria-labelledby="integrity-run-title">
      <div className="integrity-run-main">
        <div className="integrity-run-copy">
          <div className="integrity-run-heading">
            <RunStatusIcon status={check.executionStatus} verdict={check.overallVerdict} />
            <div>
              <h2 id="integrity-run-title">{title}</h2>
              <p>{conclusion}</p>
              <StatusBadge
                status={badge.status}
                label={completed ? `검증 완료 · ${badge.label}` : badge.label}
              />
            </div>
          </div>
          <dl className="integrity-run-meta">
            <div><dt>실행 시각</dt><dd>{formatIntegrityDateTime(check.startedAt)}</dd></div>
            <div><dt>기준 시각</dt><dd>{formatIntegrityDateTime(check.asOfUtc, 'UTC')} {check.asOfUtc ? 'UTC' : ''}</dd></div>
            <div><dt>소요 시간</dt><dd>{running ? '측정 중' : formatDuration(check.durationSeconds)}</dd></div>
            <div><dt>검증 대상</dt><dd>{formatNumber(targetCount)}건</dd></div>
          </dl>
        </div>

        <div className="integrity-verdict-summary">
          <div className="integrity-verdict-heading">
            <h3>검사항목 집계</h3>
            <p>판정별 항목 수이며, 실행 성공 여부와는 별개입니다.</p>
          </div>
          <dl className="integrity-verdict-metrics" aria-label="판정별 검사항목 집계">
            <VerdictMetric className="metric-fail" label="오류 항목" value={check.failCount} unit="건" />
            <VerdictMetric className="metric-warn" label="주의 항목" value={check.warnCount} unit="건" />
            <VerdictMetric className="metric-info" label="참고 항목" value={check.infoCount} unit="건" />
            <VerdictMetric className="metric-total" label="전체 검사항목" value={check.checkCount} unit="개" />
          </dl>
        </div>
      </div>

      <div className="integrity-progress-row">
        {completed ? (
          <progress max="100" value="100" aria-label="검증 완료">100%</progress>
        ) : running ? (
          <progress aria-label="검증 실행 중" />
        ) : (
          <span className="integrity-progress-failed">검증을 완료하지 못했습니다.</span>
        )}
        <strong>{completed ? `${formatNumber(check.checkCount)}개 항목 검사 완료` : running ? '진행률을 계산하지 않습니다.' : '실행 실패'}</strong>
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
