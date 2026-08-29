import { NavLink, Outlet, useLocation } from 'react-router';
import { useAppData } from '../app/AppDataProvider.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';

const USER_NAVIGATION = [
  { to: '/', label: '홈', end: true },
  { to: '/live', label: '라이브', live: true },
  { to: '/schedule', label: '일정' },
  { to: '/standings', label: '순위' },
  { to: '/rewards', label: '리워드' },
  { to: '/diagnostics', label: '진단' },
  { to: '/sample', label: '샘플' },
];

export default function UserLayout() {
  const { live, userId, setUserId } = useAppData();
  const location = useLocation();

  return (
    <div className="cl user-shell">
      <a className="skip-link" href="#user-main">본문 바로가기</a>
      <header className="user-header">
        <NavLink to="/" className="brand-link" aria-label="CLUTCH 홈">
          CLUTCH<span aria-hidden="true" />
        </NavLink>

        <nav className="user-navigation" aria-label="사용자 주요 메뉴">
          {USER_NAVIGATION.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
              {item.live && live.live && (
                <span className="semantic-live-dot" aria-label="경기 진행 중" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="user-tools">
          <div id="watch-reward-header-slot" className="watch-reward-header-slot" />
          <label className="user-id-field">
            <span>USER ID</span>
            <input
              type="number"
              min="1"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              aria-label="사용자 ID"
            />
          </label>
          <NavLink className="admin-entry" to="/admin">관리자</NavLink>
        </div>
      </header>
      <div id="user-main" className="user-route" tabIndex="-1">
        {/* 한 화면의 렌더 오류가 헤더와 다른 메뉴까지 지우지 않도록 라우트 단위로 막는다 */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
