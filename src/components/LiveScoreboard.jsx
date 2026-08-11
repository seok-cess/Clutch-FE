import { useEffect, useState } from 'react';
import { fetchMatchTeams } from '../api.js';
import GameBoard from './GameBoard.jsx';

// TODO: 소스 프레임 해상도(약 10초)를 부드럽게 보간해서 보여주는 건 다음 단계
export default function LiveScoreboard({ match }) {
  const gameId = match.activeGameId;
  const [teamA, teamB] = match.teams;
  const [teams, setTeams] = useState(null);   // id 포함 (스코어보드 로고 매칭)

  useEffect(() => {
    let cancelled = false;
    fetchMatchTeams(match.matchId)
      .then((t) => { if (!cancelled) setTeams(t); })
      .catch(() => { /* 로고 없이도 화면은 정상 */ });
    return () => { cancelled = true; };
  }, [match.matchId]);
  const currentGame = match.games.find((g) => g.gameId === gameId);

  return (
    <section className="panel live-panel cropmarks">
      <span className="kicker">LIVE TELEMETRY</span>
      <h2>
        <span className="badge live">LIVE</span>
        {teamA?.code} <span className="vs">VS</span> {teamB?.code}
        <span className="muted">
          {currentGame ? `${currentGame.number}세트 · ` : ''}{match.blockName}
        </span>
      </h2>

      {gameId
        ? <GameBoard gameId={gameId} live teams={teams ?? match.teams} />
        : <p className="muted">밴픽/대기 중 — 게임이 시작되면 스코어보드가 표시됩니다.</p>}
    </section>
  );
}
