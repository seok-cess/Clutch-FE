import { useAppData } from '../../app/AppDataProvider.jsx';
import TeamStandingsTable from '../../components/TeamStandingsTable.jsx';
import { ErrorState, LoadingState } from '../../shared/components/AsyncState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function StandingsPage() {
  const { teamStandings, error } = useAppData();

  return (
    <main className="user-content">
      <PageHeader
        title="리그 순위"
        description="현재 시즌의 팀 성적과 순위 흐름을 확인하세요."
      />
      {error && <ErrorState>{error}</ErrorState>}
      {!error && teamStandings == null && <LoadingState />}
      {!error && teamStandings?.length === 0 && <p className="muted">순위 데이터 없음</p>}
      {!error && teamStandings?.map((g, i) => (
        <section key={g.groupName ?? i} className="panel data-surface standings-surface">
          {g.groupName && (
            <h3 className="standings-heading">
              {g.groupName} <span className="muted">매치 기준</span>
            </h3>
          )}
          <TeamStandingsTable rows={g.rows} />
        </section>
      ))}
    </main>
  );
}
