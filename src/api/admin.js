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

export const fetchBackfillStatus = () => requestJson('/api/admin/backfill/status');

export function startBackfill({ limit = 1000, all = false } = {}) {
  const params = new URLSearchParams({ limit: String(limit), all: String(all) });
  return requestJson(`/api/admin/backfill?${params}`, { method: 'POST' });
}
