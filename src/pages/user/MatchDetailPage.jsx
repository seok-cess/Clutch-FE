import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAppData } from '../../app/AppDataProvider.jsx';
import MatchGamesPanel from '../../components/MatchGamesPanel.jsx';
import { EmptyState } from '../../shared/components/AsyncState.jsx';

export default function MatchDetailPage() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { live, schedule } = useAppData();
  const match = useMemo(() => [...live.matches, ...schedule]
    .find((candidate) => String(candidate.matchId) === String(matchId)), [live.matches, matchId, schedule]);

  return (
    <main className="user-content match-detail-page">
      {match ? (
        <MatchGamesPanel match={match} onClose={() => navigate('/schedule')} />
      ) : (
        <EmptyState
          title="경기 정보를 찾지 못했습니다."
          description="일정 화면에서 경기를 다시 선택해 주세요."
        />
      )}
    </main>
  );
}
