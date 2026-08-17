import { useNavigate } from 'react-router';
import { useAppData } from '../../app/AppDataProvider.jsx';
import MainScreen from '../../components/MainScreen.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    live,
    schedule,
    standings,
    recentForm,
    playerKda,
    champions,
    scoreboard,
    error,
  } = useAppData();

  return (
    <main className="cl-page">
      {error && <div className="cl-error">데이터를 불러오지 못했습니다: {error}</div>}
      <MainScreen
        live={live}
        schedule={schedule}
        standings={standings}
        recentForm={recentForm}
        playerKda={playerKda}
        champions={champions}
        scoreboard={scoreboard}
        onOpenMatch={(match) => navigate(`/matches/${match.matchId}`)}
        onGoLive={() => navigate('/live')}
        onGoSchedule={() => navigate('/schedule')}
      />
    </main>
  );
}
