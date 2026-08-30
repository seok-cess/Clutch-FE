import { useState } from 'react';
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
  // 데모 모드는 라우트 이동 시 쿼리스트링이 사라지므로, 최초 진입 시 sessionStorage에
  // 남겨서 같은 탭 안에서는 페이지를 옮겨도 유지되게 한다 (탭을 닫으면 자동으로 사라짐).
  // ?demo=1 이면 켜고, ?demo=0 이면 같은 탭 안에서도 즉시 끌 수 있다.
  const [isDemoMode] = useState(() => {
    const demoParam = new URLSearchParams(window.location.search).get('demo');
    if (demoParam == null) {
      return window.sessionStorage.getItem('clutch-demo-mode') === '1';
    }
    const enabled = demoParam !== '0';
    window.sessionStorage.setItem('clutch-demo-mode', enabled ? '1' : '0');
    return enabled;
  });

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
          {!isDemoMode && (
            <>
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
            </>
          )}
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
