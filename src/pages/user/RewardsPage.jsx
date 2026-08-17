import { useAppData } from '../../app/AppDataProvider.jsx';
import MyPagePanel from '../../components/MyPagePanel.jsx';
import MyCouponList from '../../features/rewards/MyCouponList.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function RewardsPage() {
  const { userId, live, schedule } = useAppData();
  return (
    <main className="user-content reward-page">
      <PageHeader
        title="리워드 센터"
        description="시청 포인트, 세트 승리 배팅 내역과 보유 쿠폰을 한곳에서 관리하세요."
      />
      <MyPagePanel userId={userId} matches={[...live.matches, ...schedule]} />
      <MyCouponList userId={userId} />
    </main>
  );
}
