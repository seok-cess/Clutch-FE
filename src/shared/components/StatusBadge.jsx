const STATUS_LABEL = {
  READY: '준비',
  OPEN: '진행 중',
  CLOSED: '종료',
  CANCELLED: '취소',
  ISSUED: '사용 가능',
  USED: '사용 완료',
  PLACED: '진행 중',
  WON: '적중',
  LOST: '미적중',
  REFUNDED: '환불',
  ACTIVE: '활성',
  INACTIVE: '비활성',
  PENDING: '처리 중',
  SUCCEEDED: '발급 성공',
  FAILED: '발급 실패',
};

export default function StatusBadge({ status, label }) {
  const normalized = String(status ?? 'UNKNOWN').toLowerCase();
  return (
    <span className={`status-badge status-${normalized}`}>
      {label ?? STATUS_LABEL[status] ?? status ?? '확인 필요'}
    </span>
  );
}
