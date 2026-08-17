import { NavLink } from 'react-router';
import { EmptyState } from '../shared/components/AsyncState.jsx';

export default function NotFoundPage() {
  return (
    <main className="standalone-page">
      <EmptyState title="페이지를 찾을 수 없습니다." description="주소를 확인하거나 홈으로 이동해 주세요." />
      <NavLink className="button-primary" to="/">홈으로 이동</NavLink>
    </main>
  );
}
