import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { claimCouponEvent, fetchActiveCouponEvent, fetchMyCoupon } from '../../api/coupon.js';
import { formatNumber } from '../../shared/utils/format.js';

const ACTIVE_COUPON_POLL_MS = 1500;

// 임박 전환 — 5초에서 물들기 시작해 2초에 완전한 레드가 된다.
// 구간이 3초뿐이라 선형이 가장 고르게 물든다.
const URGENCY_START_SECONDS = 5;
const URGENCY_FULL_SECONDS = 2;

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

function toSeconds(milliseconds) {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = toSeconds(milliseconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const segments = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return segments.map((segment) => String(segment).padStart(2, '0')).join(':');
}

/**
 * 0(평소) → 1(마감). 화면에 찍히는 초와 같은 값에서 계산해야
 * 숫자가 바뀌는 순간과 색이 바뀌는 순간이 어긋나지 않는다.
 */
function toUrgency(remainingSeconds) {
  if (remainingSeconds > URGENCY_START_SECONDS) return 0;
  const span = URGENCY_START_SECONDS - URGENCY_FULL_SECONDS;
  const progress = (URGENCY_START_SECONDS - remainingSeconds) / span;
  return Math.min(1, Math.max(0, progress));
}

function formatDiscount(phase) {
  const value = Number(phase?.discountValue);
  if (!Number.isFinite(value)) return null;
  const symbol = phase.discountType === 'AMOUNT' ? '원' : '%';
  return { amount: formatNumber(value), symbol, unit: `${symbol} 할인` };
}

/**
 * 단계별 선착순의 현재 단계를 고른다.
 * 단계는 오픈 시점으로부터의 초 단위 오프셋으로 오고, 마지막 단계는 이벤트 종료까지 이어진다.
 * 응답에 단계가 없는 일반 선착순이면 null 을 돌려주고 화면은 이벤트 전체 시계를 쓴다.
 */
function resolvePhase(event, openedAt, expiresAt, now) {
  const phases = Array.isArray(event?.phases) ? event.phases : [];
  if (phases.length === 0 || openedAt === null) return null;

  const starts = phases.map((phase) => openedAt + (Number(phase.openOffsetSeconds) || 0) * 1000);
  let index = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (starts[i] <= now) index = i;
  }

  const nextStart = starts[index + 1] ?? null;
  return {
    phase: phases[index],
    index,
    total: phases.length,
    startAt: starts[index],
    endAt: nextStart ?? expiresAt,
    hasNext: nextStart !== null,
  };
}

export default function ActiveCouponClaim({ userId }) {
  const navigate = useNavigate();
  const [activeEvent, setActiveEvent] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [participated, setParticipated] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedBenefit, setClaimedBenefit] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const occurrenceIdRef = useRef(null);
  const claimRequestVersionRef = useRef(0);
  const currentUserIdRef = useRef(userId);
  const dialogRef = useRef(null);

  currentUserIdRef.current = userId;

  const resetClaimState = useCallback(() => {
    claimRequestVersionRef.current += 1;
    setSubmitting(false);
    setParticipated(false);
    setClaimed(false);
    setClaimedBenefit(null);
    setFeedback(null);
  }, []);

  useEffect(() => {
    resetClaimState();
  }, [userId, resetClaimState]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    const loadActiveEvent = async () => {
      try {
        const nextEvent = await fetchActiveCouponEvent();
        if (cancelled) return;

        const nextOccurrenceId = nextEvent?.couponEventOccurrenceId ?? null;
        if (occurrenceIdRef.current !== nextOccurrenceId) {
          resetClaimState();
          // 새 회차는 새 기회다 — 이전 회차를 닫아 둔 상태를 물려주지 않는다.
          setDismissed(false);
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
  }, [resetClaimState]);

  const openedAt = useMemo(() => toTime(activeEvent?.openedAt), [activeEvent?.openedAt]);
  const expiresAt = useMemo(() => toTime(activeEvent?.expiresAt), [activeEvent?.expiresAt]);
  const expired = expiresAt !== null && now >= expiresAt;

  const current = useMemo(
    () => resolvePhase(activeEvent, openedAt, expiresAt, now),
    [activeEvent, openedAt, expiresAt, now],
  );

  // 사용자에게 의미 있는 마감은 "이벤트 끝"이 아니라 "혜택이 내려가는 시점"이다.
  const countdownEndsAt = current?.endAt ?? expiresAt;
  const countdownStartsAt = current?.startAt ?? openedAt;
  const remainingMs = countdownEndsAt === null ? 0 : Math.max(0, countdownEndsAt - now);
  const remainingSeconds = toSeconds(remainingMs);
  const urgency = toUrgency(remainingSeconds);

  const totalMs = countdownEndsAt !== null && countdownStartsAt !== null
    ? Math.max(1, countdownEndsAt - countdownStartsAt)
    : null;
  const progress = totalMs === null ? 1 : Math.min(1, remainingMs / totalMs);

  const remainingQuantity = Number(
    current ? current.phase.remainingStock : activeEvent?.remainingQuantity ?? 0,
  );
  const soldOut = remainingQuantity <= 0 || activeEvent?.claimable === false;
  const discount = current ? formatDiscount(current.phase) : null;

  // 소진 막대는 남은 수량만으로는 그릴 수 없다. 전체 수량이 함께 와야 비율이 나온다.
  // 예전 응답에는 totalStock 이 없으므로 그때는 남은 수량만 적는다.
  const metered = Boolean(current)
    && activeEvent.phases.every((phase) => Number(phase.totalStock) > 0);

  const normalizedUserId = String(userId ?? '').trim();
  const validUserId = /^[1-9]\d*$/.test(normalizedUserId);
  const locallyExpired = expired || Boolean(feedback?.expired);
  const canClaim = Boolean(activeEvent)
    && validUserId
    && !expired
    && !soldOut
    && !participated
    && !submitting;

  const close = useCallback(() => setDismissed(true), []);

  const open = Boolean(activeEvent) && !dismissed;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, close]);

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
      const result = await claimCouponEvent(
        requestUserId,
        activeEvent.couponEventId,
        requestOccurrenceId,
      );
      if (!isCurrentRequest()) return;

      const issuedPhase = activeEvent.phases?.find(
        (phase) => String(phase.couponEventItemId) === String(result?.couponEventItemId),
      ) ?? null;
      setClaimedBenefit(issuedPhase);
      setParticipated(true);
      setClaimed(true);

      if (result?.couponId) {
        fetchMyCoupon(requestUserId, result.couponId)
          .then((coupon) => {
            if (isCurrentRequest()) setClaimedBenefit(coupon);
          })
          .catch(() => {
            // 발급은 이미 완료됐다. 상세 조회 실패 시 발급 항목의 혜택을 유지한다.
          });
      }
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
        setActiveEvent((event) => event && ({
          ...event,
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

  if (!open) {
    return pollError && !dismissed
      ? <div className="coupon-poll-error" role="alert">{pollError}</div>
      : null;
  }

  const buttonLabel = submitting
    ? '요청 중'
    : claimed
      ? '발급 완료'
      : participated
        ? '참여 완료'
      : locallyExpired
        ? '이벤트 종료'
        : soldOut
          ? '쿠폰 소진'
          : discount
            ? `${discount.amount}${discount.symbol} 쿠폰 받기`
            : '쿠폰 받기';

  const ticketDiscount = claimed ? formatDiscount(claimedBenefit) : discount;

  // 할인 값이 오는 응답이면 그 값이 티켓의 주인공이고 이름은 부제로 내려간다.
  // 값이 없는 응답에서는 이벤트 이름 하나만 두어 같은 문구를 두 번 읽히지 않는다.
  const ticket = (
    <div className="coupon-ticket">
      {ticketDiscount ? (
        <>
          <p className="coupon-ticket-amount">
            {ticketDiscount.amount}<small>{ticketDiscount.unit}</small>
          </p>
          <p className="coupon-ticket-name">
            {claimed || !current.hasNext ? activeEvent.eventName : '지금 받을 수 있는 혜택'}
          </p>
        </>
      ) : (
        <p className="coupon-ticket-amount coupon-ticket-amount-text">{activeEvent.eventName}</p>
      )}
      <hr />
      <p className="coupon-ticket-meta">
        {claimed
          ? <span className="coupon-ticket-done">발급 완료</span>
          : <span>남은 수량 {formatNumber(remainingQuantity)}개</span>}
      </p>
    </div>
  );

  return (
    <div className="coupon-modal-backdrop">
      <section
        className="coupon-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-coupon-title"
        aria-busy={submitting}
        style={{ '--coupon-urgency': urgency }}
        ref={dialogRef}
        tabIndex={-1}
      >
        <button className="coupon-modal-close" type="button" onClick={close} aria-label="닫기">✕</button>

        {claimed ? (
          <>
            <div className="coupon-modal-head coupon-modal-head-center">
              <p className="coupon-modal-check" aria-hidden="true">✓</p>
              <h2 id="active-coupon-title">쿠폰을 받았습니다</h2>
              <p className="coupon-modal-description">내 쿠폰함에서 바로 확인할 수 있습니다.</p>
            </div>
            {ticket}
            <div className="coupon-modal-actions">
              <button
                className="coupon-button coupon-button-solid"
                type="button"
                onClick={() => {
                  close();
                  navigate('/rewards');
                }}
              >
                내 쿠폰함 보기
              </button>
              <button className="coupon-button coupon-button-ghost" type="button" onClick={close}>
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="coupon-modal-head">
              <h2 id="active-coupon-title">{activeEvent.eventName}</h2>
              <p className="coupon-modal-description">
                선착순으로 지급됩니다. 소진되면 자동으로 종료됩니다.
              </p>
            </div>
            {ticket}

            <div className="coupon-countdown" data-urgent={remainingSeconds <= URGENCY_FULL_SECONDS}>
              <p className="coupon-countdown-row">
                <span className="coupon-countdown-label">
                  {current?.hasNext ? '혜택 하락까지' : '발급 종료까지'}
                </span>
                <span className="coupon-countdown-value">{formatRemainingTime(remainingMs)}</span>
              </p>
              <span className="coupon-countdown-bar">
                <i style={{ width: `${progress * 100}%` }} />
              </span>
            </div>

            {current && current.total > 1 && (
              <ol className={metered ? 'coupon-phases coupon-phases-metered' : 'coupon-phases'}>
                {activeEvent.phases.map((phase, index) => {
                  const phaseDiscount = formatDiscount(phase);
                  const stock = Number(phase.remainingStock) || 0;
                  const total = Number(phase.totalStock) || 0;
                  const isCurrent = index === current.index;
                  const isPast = index < current.index;
                  // 지난 단계는 남은 수량과 무관하게 비어 있다 — 더는 받을 수 없다.
                  const ratio = isPast || total <= 0 ? 0 : Math.min(1, stock / total);
                  return (
                    <li
                      key={phase.couponEventItemId ?? index}
                      className={isCurrent ? 'coupon-phase' : 'coupon-phase coupon-phase-off'}
                    >
                      <span className="coupon-phase-key">
                        {phaseDiscount ? `${phaseDiscount.amount}${phaseDiscount.symbol}` : `${index + 1}단계`}
                      </span>
                      {metered && (
                        <span className="coupon-phase-bar">
                          <i
                            className={isCurrent && ratio <= 0.25 ? 'coupon-phase-bar-low' : undefined}
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </span>
                      )}
                      <span className="coupon-phase-value">
                        {isPast ? '종료' : metered
                          ? <>{formatNumber(stock)}<small>/{formatNumber(total)}</small></>
                          : `${formatNumber(stock)}개`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {feedback && (
              <p
                className={`coupon-feedback coupon-feedback-${feedback.type}`}
                role={feedback.type === 'error' ? 'alert' : 'status'}
              >
                {feedback.message}
              </p>
            )}
            {pollError && (
              <p className="coupon-poll-copy" role="status">최신 쿠폰 상태를 다시 확인하고 있습니다.</p>
            )}

            <div className="coupon-modal-actions">
              <button
                className="coupon-button coupon-button-solid"
                type="button"
                onClick={claim}
                disabled={!canClaim || locallyExpired}
              >
                {buttonLabel}
              </button>
              <p className="coupon-modal-foot">
                {validUserId ? `사용자 ID ${normalizedUserId}` : '상단에 사용자 ID를 입력해 주세요.'}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
