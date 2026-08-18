import { useEffect, useMemo, useRef, useState } from 'react';
import { claimCouponEvent, fetchActiveCouponEvent } from '../../api/coupon.js';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import { formatDateTime, formatNumber } from '../../shared/utils/format.js';

const ACTIVE_COUPON_POLL_MS = 1500;

const CLAIM_ERROR_MESSAGES = {
  COUPON_ALREADY_CLAIMED: '이미 참여한 쿠폰 이벤트입니다.',
  COUPON_STOCK_EXHAUSTED: '쿠폰이 모두 소진되었습니다.',
  COUPON_EVENT_ITEM_NOT_AVAILABLE: '쿠폰이 모두 소진되었습니다.',
  COUPON_EVENT_NOT_OPEN: '쿠폰 이벤트가 종료되었습니다.',
  COUPON_EVENT_OCCURRENCE_NOT_FOUND: '쿠폰 이벤트가 종료되었습니다.',
};

function toUtcDateTime(value) {
  if (!value || /(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return value;
  return `${value}Z`;
}

function toTime(value) {
  const time = new Date(toUtcDateTime(value)).getTime();
  return Number.isFinite(time) ? time : null;
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const segments = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return segments.map((segment) => String(segment).padStart(2, '0')).join(':');
}

export default function ActiveCouponClaim({ userId }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [participated, setParticipated] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const occurrenceIdRef = useRef(null);
  const claimRequestVersionRef = useRef(0);
  const currentUserIdRef = useRef(userId);

  currentUserIdRef.current = userId;

  useEffect(() => {
    claimRequestVersionRef.current += 1;
    setSubmitting(false);
    setParticipated(false);
    setFeedback(null);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    const loadActiveEvent = async () => {
      try {
        const nextEvent = await fetchActiveCouponEvent();
        if (cancelled) return;

        const nextOccurrenceId = nextEvent?.couponEventOccurrenceId ?? null;
        if (occurrenceIdRef.current !== nextOccurrenceId) {
          claimRequestVersionRef.current += 1;
          setSubmitting(false);
          setParticipated(false);
          setFeedback(null);
        }
        occurrenceIdRef.current = nextOccurrenceId;
        setActiveEvent(nextEvent);
        setPollError(null);
        setNow(Date.now());
      } catch (requestError) {
        if (!cancelled) setPollError(requestError.message);
      } finally {
        if (!cancelled) {
          pollTimer = window.setTimeout(loadActiveEvent, ACTIVE_COUPON_POLL_MS);
        }
      }
    };

    loadActiveEvent();
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const expiresAt = useMemo(() => toTime(activeEvent?.expiresAt), [activeEvent?.expiresAt]);
  const expired = expiresAt !== null && now >= expiresAt;
  const remainingQuantity = Number(activeEvent?.remainingQuantity ?? 0);
  const soldOut = remainingQuantity <= 0 || activeEvent?.claimable === false;
  const normalizedUserId = String(userId ?? '').trim();
  const validUserId = /^[1-9]\d*$/.test(normalizedUserId);
  const canClaim = Boolean(activeEvent)
    && validUserId
    && !expired
    && !soldOut
    && !participated
    && !submitting;

  const claim = async () => {
    if (!canClaim) return;

    const requestVersion = ++claimRequestVersionRef.current;
    const requestUserId = normalizedUserId;
    const requestOccurrenceId = activeEvent.couponEventOccurrenceId;
    const isCurrentRequest = () => claimRequestVersionRef.current === requestVersion
      && String(currentUserIdRef.current ?? '').trim() === requestUserId
      && occurrenceIdRef.current === requestOccurrenceId;

    setSubmitting(true);
    setFeedback(null);
    try {
      await claimCouponEvent(
        requestUserId,
        activeEvent.couponEventId,
        requestOccurrenceId,
      );
      if (!isCurrentRequest()) return;
      setParticipated(true);
      setFeedback({ type: 'success', message: '쿠폰 발급 요청이 접수되었습니다.' });
    } catch (requestError) {
      if (!isCurrentRequest()) return;
      const message = CLAIM_ERROR_MESSAGES[requestError.code] ?? requestError.message;
      const isDuplicate = requestError.code === 'COUPON_ALREADY_CLAIMED';
      const isSoldOut = requestError.code === 'COUPON_STOCK_EXHAUSTED'
        || requestError.code === 'COUPON_EVENT_ITEM_NOT_AVAILABLE';
      const isExpired = requestError.code === 'COUPON_EVENT_NOT_OPEN'
        || requestError.code === 'COUPON_EVENT_OCCURRENCE_NOT_FOUND';

      if (isDuplicate) setParticipated(true);
      if (isSoldOut) {
        setActiveEvent((current) => current && ({
          ...current,
          claimable: false,
          remainingQuantity: 0,
        }));
      }
      setFeedback({
        type: isDuplicate ? 'notice' : 'error',
        message,
        expired: isExpired,
      });
    } finally {
      if (isCurrentRequest()) setSubmitting(false);
    }
  };

  if (!activeEvent) {
    return pollError ? (
      <div className="coupon-poll-error" role="alert">{pollError}</div>
    ) : null;
  }

  const locallyExpired = expired || feedback?.expired;
  const buttonLabel = submitting
    ? '요청 중'
    : participated
      ? '요청 접수됨'
      : locallyExpired
        ? '이벤트 종료'
        : soldOut
          ? '쿠폰 소진'
          : '쿠폰 받기';

  return (
    <section className="active-coupon data-surface" aria-labelledby="active-coupon-title" aria-busy={submitting}>
      <div className="active-coupon-content">
        <div className="active-coupon-title-row">
          <h2 id="active-coupon-title">{activeEvent.eventName}</h2>
          <StatusBadge status={activeEvent.occurrenceStatus} />
        </div>
        <p>지금 참여할 수 있는 쿠폰 이벤트입니다. 수량이 소진되기 전에 요청해 주세요.</p>
        <dl className="active-coupon-meta">
          <div>
            <dt>남은 시간</dt>
            <dd>{formatRemainingTime((expiresAt ?? now) - now)}</dd>
          </div>
          <div>
            <dt>남은 수량</dt>
            <dd>{formatNumber(remainingQuantity)}개</dd>
          </div>
          <div>
            <dt>종료 시각</dt>
            <dd>{formatDateTime(toUtcDateTime(activeEvent.expiresAt))}</dd>
          </div>
        </dl>
        {feedback && (
          <p
            className={`coupon-feedback coupon-feedback-${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        )}
        {pollError && <p className="coupon-poll-copy" role="status">최신 쿠폰 상태를 다시 확인하고 있습니다.</p>}
      </div>
      <div className="active-coupon-action">
        <button
          className="button-primary"
          type="button"
          onClick={claim}
          disabled={!canClaim || locallyExpired}
        >
          {buttonLabel}
        </button>
        <span>
          {validUserId ? `사용자 ID ${normalizedUserId}` : '상단에 사용자 ID를 입력해 주세요.'}
        </span>
      </div>
    </section>
  );
}
