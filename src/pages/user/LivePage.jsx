import { useAppData } from '../../app/AppDataProvider.jsx';
import LiveScoreboard from '../../components/LiveScoreboard.jsx';
import ActiveCouponClaim from '../../features/coupon/ActiveCouponClaim.jsx';
import ReplayControlPanel from '../../features/live/ReplayControlPanel.jsx';
import { EmptyState, ErrorState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

function matchLabel(match) {
  const [firstTeam, secondTeam] = match.teams ?? [];
  return [firstTeam?.code, secondTeam?.code].filter(Boolean).join(' vs ') || '경기';
}

export default function LivePage() {
  const {
    live,
    userId,
    activeWatchMatchId,
    setActiveWatchMatchId,
    error,
  } = useAppData();
  const selectedMatch = live.matches.find((match) => match.matchId === activeWatchMatchId)
    ?? live.matches[0]
    ?? null;

  return (
    <main className="user-content page-live">
      <PageHeader
        title="라이브 매치 센터"
        description="실시간 세트 지표를 확인하고 시청 포인트를 받으세요. 세트 승리 배팅은 경기 일정 화면에서 할 수 있습니다."
      />
      {error && <ErrorState>{error}</ErrorState>}
      <ActiveCouponClaim userId={userId} />
      <div className="live-control-row">
        {live.matches.length > 1 && (
          <section className="live-match-selector" aria-label="시청할 경기 선택">
            <div className="live-match-selector-list" role="list">
              {live.matches.map((match) => {
                const selected = match.matchId === selectedMatch?.matchId;
                return (
                  <button
                    key={match.matchId}
                    className="live-match-choice"
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveWatchMatchId(match.matchId)}
                  >
                    <span>{matchLabel(match)}</span>
                    <small>{selected ? '현재 시청 중' : '이 경기 보기'}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        <ReplayControlPanel />
      </div>
      {selectedMatch ? (
        <>
          <LiveScoreboard
            key={selectedMatch.matchId}
            match={selectedMatch}
            userId={userId}
            watchRewardActive={selectedMatch.matchId === activeWatchMatchId}
            onWatchMatchChange={setActiveWatchMatchId}
          />
        </>
      ) : (
        <EmptyState
          title="현재 진행 중인 경기가 없습니다."
          description="경기가 시작되면 라이브 지표와 참여 기능이 이 화면에 표시됩니다."
        />
      )}
    </main>
  );
}
