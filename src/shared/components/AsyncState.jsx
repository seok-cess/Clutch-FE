export function LoadingState({ children = '데이터를 불러오는 중입니다.' }) {
  return <div className="async-state loading-state" role="status">{children}</div>;
}

export function EmptyState({ title, description }) {
  return (
    <div className="async-state empty-state">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

export function ErrorState({ children }) {
  return <div className="async-state error-state" role="alert">{children}</div>;
}
