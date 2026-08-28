import { createContext, useContext, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';

const AdminContext = createContext(null);

const ADMIN_NAVIGATION = [
  { to: '/admin', label: '운영 홈', end: true },
  { label: '쿠폰 운영', section: true },
  { to: '/admin/coupon-events', label: '쿠폰 이벤트' },
  { to: '/admin/coupon-types', label: '쿠폰 종류' },
  { to: '/admin/coupon-claims', label: '쿠폰 발급 내역' },
  { to: '/admin/coupons', label: '발급 쿠폰 취소', nested: true },
  { label: '데이터 운영', section: true },
  { to: '/admin/backfill', label: '데이터 백필' },
];

export default function AdminLayout() {
  const location = useLocation();
  const [adminId, setAdminId] = useState(
    () => window.localStorage.getItem('clutch-admin-id') ?? '1',
  );
  const value = useMemo(() => ({
    adminId,
    setAdminId(nextAdminId) {
      setAdminId(nextAdminId);
      window.localStorage.setItem('clutch-admin-id', nextAdminId);
    },
  }), [adminId]);

  return (
    <AdminContext.Provider value={value}>
      <div className="admin-shell">
        <a className="skip-link" href="#admin-main">본문 바로가기</a>
        <aside className="admin-sidebar">
          <NavLink to="/admin" className="admin-brand">CLUTCH<span>ADMIN</span></NavLink>
          <nav aria-label="관리자 주요 메뉴">
            {ADMIN_NAVIGATION.map((item) => item.section ? (
              <span className="admin-nav-section" key={item.label}>{item.label}</span>
            ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => [
                    isActive ? 'active' : '',
                    item.nested ? 'admin-nav-nested' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="admin-sidebar-footer">
            <label>
              <span>ADMIN ID</span>
              <input
                type="number"
                min="1"
                value={adminId}
                onChange={(event) => value.setAdminId(event.target.value)}
                aria-label="관리자 ID"
              />
            </label>
            <NavLink to="/">사용자 화면으로</NavLink>
          </div>
        </aside>
        <main id="admin-main" className="admin-content" tabIndex="-1">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin은 AdminLayout 안에서 사용해야 합니다.');
  return value;
}
