export function formatDateTime(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date);
}

export function formatPoint(value) {
  const point = Number(value);
  return Number.isFinite(point) ? `${point.toLocaleString('ko-KR')}P` : '-';
}

export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('ko-KR') : '-';
}
