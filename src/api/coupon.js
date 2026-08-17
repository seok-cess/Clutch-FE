import { requestAsUser } from './client.js';

export function fetchMyCoupons(userId, { status, cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (status) params.set('status', status);
  if (cursor) params.set('cursor', cursor);
  return requestAsUser(`/api/users/me/coupons?${params}`, userId, {
    fallbackMessage: '쿠폰을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  });
}

export const fetchMyCoupon = (userId, couponId) => requestAsUser(
  `/api/users/me/coupons/${encodeURIComponent(couponId)}`,
  userId,
  { fallbackMessage: '쿠폰 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
);

export const useMyCoupon = (userId, couponId) => requestAsUser(
  `/api/users/me/coupons/${encodeURIComponent(couponId)}/use`,
  userId,
  {
    method: 'POST',
    fallbackMessage: '쿠폰을 사용 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
);
