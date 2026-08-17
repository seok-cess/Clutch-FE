import { createContext, useContext, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router';

const AdminContext = createContext(null);

const ADMIN_NAVIGATION = [
  { to: '/admin', label: '운영 요약', end: true },
  { to: '/admin/coupon-events', label: '쿠폰 이벤트' },
  { to: '/admin/coupons', label: '발급 쿠폰' },
  { to: '/admin/backfill', label: '데이터 백필' },
];

export default function AdminLayout() {
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
            {ADMIN_NAVIGATION.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
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
          <Outlet />
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
