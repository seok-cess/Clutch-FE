const MAX_VISIBLE_ITEMS = 7;

function pageRange(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getPaginationItems(page, totalPages) {
  const currentPage = page + 1;

  if (totalPages <= MAX_VISIBLE_ITEMS) {
    return pageRange(1, totalPages);
  }
  if (currentPage <= 4) {
    return pageRange(1, MAX_VISIBLE_ITEMS);
  }
  if (currentPage >= totalPages - 3) {
    return [1, 'start-ellipsis', ...pageRange(totalPages - 4, totalPages)];
  }
  return [
    1,
    'start-ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'end-ellipsis',
    totalPages,
  ];
}

function ChevronIcon({ direction }) {
  const path = direction === 'previous' ? '15 18 9 12 15 6' : '9 18 15 12 9 6';
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  label = '페이지 이동',
}) {
  const safeTotalPages = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 0;
  const safePage = Number.isInteger(page)
    ? Math.min(Math.max(page, 0), Math.max(safeTotalPages - 1, 0))
    : 0;

  if (safeTotalPages <= 1) return null;

  const items = getPaginationItems(safePage, safeTotalPages);

  return (
    <nav className="app-pagination" aria-label={label}>
      <button
        className="pagination-button pagination-direction"
        type="button"
        onClick={() => onPageChange(safePage - 1)}
        disabled={disabled || safePage === 0}
        aria-label="이전 페이지"
      >
        <ChevronIcon direction="previous" />
      </button>

      {items.map((item) => (
        typeof item === 'number' ? (
          <button
            className="pagination-button"
            type="button"
            key={item}
            onClick={() => onPageChange(item - 1)}
            disabled={disabled}
            aria-label={`${item}페이지로 이동`}
            aria-current={item === safePage + 1 ? 'page' : undefined}
          >
            {item}
          </button>
        ) : (
          <span className="pagination-ellipsis" key={item} aria-hidden="true">…</span>
        )
      ))}

      <button
        className="pagination-button pagination-direction"
        type="button"
        onClick={() => onPageChange(safePage + 1)}
        disabled={disabled || safePage >= safeTotalPages - 1}
        aria-label="다음 페이지"
      >
        <ChevronIcon direction="next" />
      </button>
    </nav>
  );
}
