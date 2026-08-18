import { Navigate, Route, Routes } from 'react-router';
import AdminLayout from '../layouts/AdminLayout.jsx';
import UserLayout from '../layouts/UserLayout.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import BackfillPage from '../pages/admin/BackfillPage.jsx';
import CouponEventDetailPage from '../pages/admin/CouponEventDetailPage.jsx';
import CouponEventEditorPage from '../pages/admin/CouponEventEditorPage.jsx';
import CouponEventsPage from '../pages/admin/CouponEventsPage.jsx';
import CouponsPage from '../pages/admin/CouponsPage.jsx';
import DiagnosticsPage from '../pages/user/DiagnosticsPage.jsx';
import SamplePage from '../pages/user/SamplePage.jsx';
import HomePage from '../pages/user/HomePage.jsx';
import LivePage from '../pages/user/LivePage.jsx';
import MatchDetailPage from '../pages/user/MatchDetailPage.jsx';
import RewardsPage from '../pages/user/RewardsPage.jsx';
import SchedulePage from '../pages/user/SchedulePage.jsx';
import StandingsPage from '../pages/user/StandingsPage.jsx';
import { AppDataProvider } from './AppDataProvider.jsx';

function UserAppShell() {
  return (
    <AppDataProvider>
      <UserLayout />
    </AppDataProvider>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<UserAppShell />}>
        <Route index element={<HomePage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="matches/:matchId" element={<MatchDetailPage />} />
        <Route path="standings" element={<StandingsPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
        <Route path="sample" element={<SamplePage />} />
      </Route>

      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="coupon-events" element={<CouponEventsPage />} />
        <Route path="coupon-events/new" element={<CouponEventEditorPage />} />
        <Route path="coupon-events/:couponEventId" element={<CouponEventDetailPage />} />
        <Route path="coupon-events/:couponEventId/edit" element={<CouponEventEditorPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="backfill" element={<BackfillPage />} />
      </Route>

      <Route path="my" element={<Navigate to="/rewards" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
