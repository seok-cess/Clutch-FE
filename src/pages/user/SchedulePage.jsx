import { useNavigate } from 'react-router';
import { useAppData } from '../../app/AppDataProvider.jsx';
import ScheduleList from '../../features/schedule/ScheduleList.jsx';
import { ErrorState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function SchedulePage() {
  const navigate = useNavigate();
  const { schedule, live, bettingCandidates, userId, error } = useAppData();

  return (
    <main className="user-content">
      <PageHeader
        title="경기 일정"
        description="경기를 선택하면 세트별 결과와 인게임 기록을 확인할 수 있습니다. 승부예측이 열린 경기는 버튼을 눌러 바로 배팅할 수 있습니다."
      />
      {error && <ErrorState>{error}</ErrorState>}
      <section className="panel data-surface schedule-surface">
        <ScheduleList
          schedule={schedule}
          live={live}
          bettingCandidates={bettingCandidates}
          userId={userId}
          onSelect={(match) => navigate(`/matches/${match.matchId}`)}
          onGoLive={() => navigate('/live')}
        />
      </section>
    </main>
  );
}
