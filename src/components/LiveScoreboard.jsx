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

  // 진행중인 세트가 피드 기준으로 끝났으면 소스 state(약 5분 지연)를 기다리지 않는다
  const setEnded = currentGame?.feedFinished === true;

  // 세트 스코어 — gameWins 로 확정된 세트만 센다 (종료 후 약 5분 뒤 반영)
  const wonBy = (team) => match.games.filter((g) => g.winnerTeamId === team?.id).length;
  const scoreA = wonBy(teamA);
  const scoreB = wonBy(teamB);

  return (
    <section className="panel live-panel cropmarks">
      <span className="kicker">LIVE TELEMETRY</span>
      <h2>
        <span className={`badge ${setEnded ? 'ended' : 'live'}`}>
          {setEnded ? '세트 종료' : 'LIVE'}
        </span>
        {teamA?.code}
        <span className="set-score">
          <b className="blue-text">{scoreA}</b>
          <span className="sep">:</span>
          <b className="red-text">{scoreB}</b>
        </span>
        {teamB?.code}
        <span className="muted">
          {currentGame ? `${currentGame.number}세트 · ` : ''}{match.blockName}
        </span>
      </h2>

      {gameId
        ? <GameBoard gameId={gameId} live={!setEnded} finished={setEnded} teams={teams ?? match.teams} />
        : <p className="muted">밴픽/대기 중 — 게임이 시작되면 스코어보드가 표시됩니다.</p>}
    </section>
  );
}
