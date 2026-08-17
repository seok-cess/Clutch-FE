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

export const cancelCoupon = (adminId, couponId, reason) => requestAsAdmin(
  `/api/admin/coupons/${encodeURIComponent(couponId)}/cancel`,
  adminId,
  { method: 'POST', body: { reason } },
);

export const fetchBackfillStatus = () => requestJson('/api/admin/backfill/status');

export function startBackfill({ limit = 1000, all = false } = {}) {
  const params = new URLSearchParams({ limit: String(limit), all: String(all) });
  return requestJson(`/api/admin/backfill?${params}`, { method: 'POST' });
}
