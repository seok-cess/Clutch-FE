import { useAppData } from '../../app/AppDataProvider.jsx';
import StandingsTable from '../../components/StandingsTable.jsx';
import { ErrorState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function StandingsPage() {
  const { standings, error } = useAppData();
  return (
    <main className="user-content">
      <PageHeader
        title="리그 순위"
        description="현재 시즌의 팀 성적과 순위 흐름을 확인하세요."
      />
      {error && <ErrorState>{error}</ErrorState>}
      <section className="panel data-surface standings-surface">
        <StandingsTable standings={standings} />
      </section>
    </main>
  );
}
