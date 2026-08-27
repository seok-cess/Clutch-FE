import { useAppData } from '../../app/AppDataProvider.jsx';
import LiveScoreboard from '../../components/LiveScoreboard.jsx';
import ActiveCouponClaim from '../../features/coupon/ActiveCouponClaim.jsx';
import ExternalSourceControl from '../../features/live/ExternalSourceControl.jsx';
import { EmptyState, ErrorState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function LivePage() {
  const {
    live,
    userId,
    activeWatchMatchId,
    setActiveWatchMatchId,
    error,
    refreshLive,
    refreshBettingCandidates,
  } = useAppData();

  return (
    <main className="user-content page-live">
      <PageHeader
        title="라이브 매치 센터"
        description="실시간 세트 지표를 확인하고 시청 포인트를 받으세요. 세트 승리 배팅은 경기 일정 화면에서 할 수 있습니다."
      />
      <ExternalSourceControl onSourceChanged={() => Promise.all([
        refreshLive(),
        refreshBettingCandidates(),
      ])} />
      {error && <ErrorState>{error}</ErrorState>}
      <ActiveCouponClaim userId={userId} />
      {live.matches.length > 0 ? (
        live.matches.map((match) => (
          <LiveScoreboard
            key={match.matchId}
            match={match}
            userId={userId}
            watchRewardActive={match.matchId === activeWatchMatchId}
            onWatchMatchChange={setActiveWatchMatchId}
          />
        ))
      ) : (
        <EmptyState
          title="현재 진행 중인 경기가 없습니다."
          description="경기가 시작되면 라이브 지표와 참여 기능이 이 화면에 표시됩니다."
        />
      )}
    </main>
  );
}
