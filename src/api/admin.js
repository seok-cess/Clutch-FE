import { requestAsAdmin, requestJson } from './client.js';

export function fetchCouponEvents({ status, cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (status) params.set('status', status);
  if (cursor) params.set('cursor', String(cursor));
  return requestJson(`/api/v1/admin/coupon-events?${params}`);
}

export const fetchCouponEvent = (couponEventId) => requestJson(
  `/api/v1/admin/coupon-events/${encodeURIComponent(couponEventId)}`,
);

export const createCouponEvent = (payload) => requestJson('/api/v1/admin/coupon-events', {
  method: 'POST',
  body: payload,
});

export const updateCouponEvent = (couponEventId, payload) => requestJson(
  `/api/v1/admin/coupon-events/${encodeURIComponent(couponEventId)}`,
  { method: 'PATCH', body: payload },
);

export const deleteCouponEvent = (couponEventId) => requestJson(
  `/api/v1/admin/coupon-events/${encodeURIComponent(couponEventId)}`,
  { method: 'DELETE' },
);

/** 선택 가능한 트리거 종류. 값을 프론트에 복사해두면 늘어날 때 양쪽을 고쳐야 해 서버가 준다 */
export const fetchCouponEventTriggers = () => requestJson(
  '/api/v1/admin/coupon-events/triggers',
);

/**
 * 경기 트리거로 이벤트를 연다.
 *
 * 이벤트 ID 를 넘기지 않는다 — 감지하는 쪽은 어떤 이벤트가 이 트리거를
 * 기다리는지 모르기 때문이다. 서버가 (경기, 트리거) 로 찾아 연다.
 *
 * 경기 ID 는 필수다. 없으면 서버가 트리거만 보고 아무 경기의 이벤트나 열어
 * 전혀 다른 경기가 발동한다.
 *
 * 조건에 맞는 이벤트가 없으면 204 라 응답이 비어 있다.
 */
export function openCouponEventByTrigger({
  trigger, esportsMatchId, gameId, gameTimeSeconds,
}) {
  const params = new URLSearchParams({
    trigger,
    esportsMatchId: String(esportsMatchId),
  });
  if (gameId) params.set('gameId', gameId);
  if (gameTimeSeconds != null) params.set('gameTimeSeconds', String(gameTimeSeconds));
  return requestJson(`/api/v1/admin/coupon-events/occurrences/trigger?${params}`, {
    method: 'POST',
    fallbackMessage: '트리거로 쿠폰 이벤트를 열지 못했습니다.',
  });
}

/**
 * 시연 재생의 경기 프레임 한 장을 서버에 보낸다.
 *
 * 트리거를 지목하지 않는다 — 화면은 "지금 누가 몇 킬"만 알리고, 무슨 사건인지는
 * 서버 감지기가 판단한다. 그래야 폴링이 쓰는 것과 같은 로직이 시연에서도 검증되고,
 * 트리거가 늘어도 이 화면을 고치지 않아도 된다.
 *
 * 응답은 항상 204 다. 쿠폰이 열렸는지는 활성 회차 조회로 확인한다.
 */
export function submitSampleFrame({ gameId, gameTimeSeconds, blue, red }) {
  return requestJson('/api/v1/test/sample-frames', {
    method: 'POST',
    body: { gameId, gameTimeSeconds, blue, red },
    fallbackMessage: '시연 프레임을 보내지 못했습니다.',
  });
}

/** 시연을 처음부터 다시 재생할 때 서버의 감지 상태를 비운다. */
export function resetSampleFrames(gameId) {
  const params = new URLSearchParams({ gameId });
  return requestJson(`/api/v1/test/sample-frames?${params}`, {
    method: 'DELETE',
    fallbackMessage: '시연 감지 상태를 초기화하지 못했습니다.',
  });
}

export const manualOpenCouponEvent = (couponEventId) => requestJson(
  `/api/v1/admin/coupon-events/${encodeURIComponent(couponEventId)}/occurrences/manual-open`,
  {
    method: 'POST',
    fallbackMessage: '쿠폰 이벤트를 테스트용으로 오픈하지 못했습니다.',
  },
);

export const cancelCoupon = (adminId, couponId, reason) => requestAsAdmin(
  `/api/admin/coupons/${encodeURIComponent(couponId)}/cancel`,
  adminId,
  { method: 'POST', body: { reason } },
);

export function fetchCouponTypes({ status, cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (status) params.set('status', status);
  if (cursor) params.set('cursor', String(cursor));
  return requestJson(`/api/v1/admin/coupon-types?${params}`);
}

export function fetchCouponTypeOptions({ keyword, cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (keyword?.trim()) params.set('keyword', keyword.trim());
  if (cursor) params.set('cursor', String(cursor));
  return requestJson(`/api/v1/admin/coupon-types/options?${params}`);
}

export const fetchCouponType = (couponTypeId) => requestJson(
  `/api/v1/admin/coupon-types/${encodeURIComponent(couponTypeId)}`,
);

export const createCouponType = (payload) => requestJson('/api/v1/admin/coupon-types', {
  method: 'POST',
  body: payload,
});

export const updateCouponType = (couponTypeId, payload) => requestJson(
  `/api/v1/admin/coupon-types/${encodeURIComponent(couponTypeId)}`,
  { method: 'PATCH', body: payload },
);

export const changeCouponTypeStatus = (couponTypeId, status) => requestJson(
  `/api/v1/admin/coupon-types/${encodeURIComponent(couponTypeId)}/status`,
  { method: 'PATCH', body: { status } },
);

export const deleteCouponType = (couponTypeId) => requestJson(
  `/api/v1/admin/coupon-types/${encodeURIComponent(couponTypeId)}`,
  { method: 'DELETE' },
);

export function fetchCouponClaimHistory(adminId, {
  eventKeyword,
  triggerKeyword,
  userId,
  requestStatus,
  couponStatus,
  couponTypeId,
  from,
  to,
  cursor,
  size = 20,
} = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (eventKeyword?.trim()) params.set('eventKeyword', eventKeyword.trim());
  if (triggerKeyword?.trim()) params.set('triggerKeyword', triggerKeyword.trim());
  if (userId) params.set('userId', String(userId));
  if (requestStatus) params.set('requestStatus', requestStatus);
  if (couponStatus) params.set('couponStatus', couponStatus);
  if (couponTypeId) params.set('couponTypeId', String(couponTypeId));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (cursor) params.set('cursor', String(cursor));
  return requestAsAdmin(`/api/v1/admin/coupon-claims?${params}`, adminId);
}

export function fetchCouponDashboard(adminId, { date, trendDays = 7 } = {}) {
  const params = new URLSearchParams({ trendDays: String(trendDays) });
  if (date) params.set('date', date);
  return requestAsAdmin(`/api/v1/admin/coupon-dashboard?${params}`, adminId);
}

/**
 * 시연·테스트로 생긴 회차와 발급 이력을 지우고 이벤트를 READY 로 되돌린다.
 *
 * 이벤트 정의는 남아 같은 설정으로 바로 다시 시연할 수 있다.
 * 일반 삭제는 이력이 있으면 막혀 반복 시연에는 쓸 수 없다.
 */
export const resetCouponEventForTest = (couponEventId) => requestJson(
  `/api/v1/admin/coupon-events/${encodeURIComponent(couponEventId)}/test-reset`,
  { method: 'POST', fallbackMessage: '테스트 이력을 초기화하지 못했습니다.' },
);

export const fetchBackfillStatus = () => requestJson('/api/admin/backfill/status');

export function startBackfill({ limit = 1000, all = false } = {}) {
  const params = new URLSearchParams({ limit: String(limit), all: String(all) });
  return requestJson(`/api/admin/backfill?${params}`, { method: 'POST' });
}

export const startCouponIntegrityCheck = (adminId) => requestAsAdmin(
  '/api/v1/admin/integrity-checks',
  adminId,
  { method: 'POST' },
);

export function fetchCouponIntegrityChecks(adminId, { cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set('cursor', String(cursor));
  return requestAsAdmin(`/api/v1/admin/integrity-checks?${params}`, adminId);
}

export const fetchCouponIntegrityCheck = (adminId, checkId) => requestAsAdmin(
  `/api/v1/admin/integrity-checks/${encodeURIComponent(checkId)}`,
  adminId,
);
