import { useNavigate } from 'react-router';
import { useAppData } from '../../app/AppDataProvider.jsx';
import ScheduleList from '../../components/ScheduleList.jsx';
import { ErrorState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function SchedulePage() {
  const navigate = useNavigate();
  const { schedule, recentForm, error } = useAppData();

  return (
    <main className="user-content">
      <PageHeader
        title="경기 일정"
        description="경기를 선택하면 세트별 결과와 인게임 기록을 확인할 수 있습니다."
      />
      {error && <ErrorState>{error}</ErrorState>}
      <section className="panel data-surface schedule-surface">
        <ScheduleList
          schedule={schedule}
          recentForm={recentForm}
          onSelect={(match) => navigate(`/matches/${match.matchId}`)}
        />
      </section>
    </main>
  );
}
