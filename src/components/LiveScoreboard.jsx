import { useEffect, useState } from 'react';
import { fetchMatchTeams } from '../api.js';
import BettingPanel from './BettingPanel.jsx';
import GameBoard from './GameBoard.jsx';
import WatchPointPanel from './WatchPointPanel.jsx';
import WatchPointPreview from './WatchPointPreview.jsx';

// TODO: 소스 프레임 해상도(약 10초)를 부드럽게 보간해서 보여주는 건 다음 단계
export default function LiveScoreboard({
  match,
  userId,
  preview = false,
  gamePreview = null,
  /* 재생을 바깥에서 제어하는 화면(샘플)은 GameBoard 의 자체 시계를 끈다 */
  previewTicks = true,
  /* 축약 렌더(골드 그래프·선수 상세 생략). preview 와 분리 — 샘플도 라이브와 같은 전체 화면을 쓴다 */
  compact = false,
  preMatch = false,
  watchRewardActive = false,
  onWatchMatchChange = () => {},
}) {
  const gameId = match.activeGameId;
  const [teamA, teamB] = match.teams;
  const [teams, setTeams] = useState(null);   // id 포함 (스코어보드 로고 매칭)

  useEffect(() => {
    if (preview) {
      setTeams(match.teams);
      return undefined;
    }
    let cancelled = false;
    fetchMatchTeams(match.matchId)
      .then((t) => { if (!cancelled) setTeams(t); })
      .catch(() => { /* 로고 없이도 화면은 정상 */ });
    return () => { cancelled = true; };
  }, [match.matchId, preview]);
  const currentGame = (match.games ?? []).find((g) => g.gameId === gameId);

  // 진행중인 세트가 피드 기준으로 끝났으면 소스 state(약 5분 지연)를 기다리지 않는다
  const setEnded = currentGame?.feedFinished === true;

  // 세트 스코어 — 소스가 준 gameWins 를 그대로 쓴다.
  // games[].winnerTeamId 를 세면 서버가 매치 도중 켜졌을 때(재시작·배포) 그전 세트를
  // 관측하지 못해 null 로 남아 실제 2:0 인 매치가 0:0 으로 보인다.
  // winnerTeamId 는 세트별 승자 표기와 정산에만 쓴다.
  const scoreA = teamA?.gameWins ?? 0;
  const scoreB = teamB?.gameWins ?? 0;

  return (
    <section className="panel live-panel cropmarks">
      <span className="kicker">LIVE TELEMETRY</span>
      <h2>
        <span className={`badge ${preMatch ? 'pending' : setEnded ? 'ended' : 'live'}`}>
          {preMatch ? '배팅 가능' : setEnded ? '세트 종료' : 'LIVE'}
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
        ? (
          <GameBoard
            key={gameId}
            gameId={gameId}
            live={!setEnded}
            finished={setEnded}
            statsUnavailable={currentGame?.statsUnavailable === true}
            teams={teams ?? match.teams}
            previewData={gamePreview}
            previewTicks={previewTicks}
            compact={compact}
          />
        )
        : <p className="muted">{preMatch
          ? '경기 시작 전 — 1세트 승리 팀을 선택해 배팅할 수 있습니다.'
          : '밴픽/대기 중 — 게임이 시작되면 스코어보드가 표시됩니다.'}</p>}

      {preview ? (
        <div className="live-action-grid">
          <WatchPointPreview />
          <BettingPanel match={match} userId={userId} preview />
        </div>
      ) : preMatch ? (
        <div className="live-action-grid">
          <WatchPointPanel
            matchId={match.matchId}
            userId={userId}
            enabled={false}
            active={false}
          />
          <BettingPanel match={match} userId={userId} />
        </div>
      ) : (
        <div className="live-action-grid">
          <WatchPointPanel
            matchId={match.matchId}
            userId={userId}
            enabled={Boolean(gameId) && !setEnded}
            active={watchRewardActive}
            onActivate={onWatchMatchChange}
          />
          <BettingPanel match={match} userId={userId} />
        </div>
      )}
    </section>
  );
}
