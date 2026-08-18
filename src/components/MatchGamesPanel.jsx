import { useEffect, useState } from 'react';
import { fetchMatchGames, fetchHeadToHead, fetchMatchTeams } from '../api.js';
import GameBoard from './GameBoard.jsx';

const GAME_STATE_LABEL = {
  completed: '종료',
  inProgress: 'LIVE',
  unstarted: '미시작',
};

/**
 * 세트 표시 라벨.
 *
 * state 는 소스(esports-api) 기준이라 실제 종료보다 약 5분 늦다. 그 사이에는
 * 피드가 먼저 준 feedFinished 로 "종료"를 보여줘야 화면이 멈춘 것처럼 보이지 않는다.
 */
function gameStateLabel(g) {
  // 통계를 안 주는 리그는 눌러도 빈 화면이라 미리 알린다
  if (g.statsUnavailable) return '데이터 미제공';
  if (g.state === 'inProgress' && g.feedFinished) return '종료';
  return GAME_STATE_LABEL[g.state] ?? g.state;
}

/** 세트 승자가 확정됐으면 팀 코드를 반환 (gameWins 기준이라 종료 후 약 5분 뒤) */
function winnerCode(g, teams) {
  if (!g.winnerTeamId || !teams) return null;
  return teams.find((t) => t.id === g.winnerTeamId)?.code ?? null;
}

/**
 * 일정에서 매치를 클릭하면 열리는 세트별 인게임 기록 패널.
 * 과거 경기는 백엔드가 livestats 를 온디맨드 1회 호출해 캐시한 데이터를 보여준다.
 * 선택한 게임이 진행중이면 5초 폴링, 종료면 1회 조회.
 */
export default function MatchGamesPanel({ match, onClose }) {
  const [games, setGames] = useState(null);       // null = 로딩중
  const [selectedGame, setSelectedGame] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [teams, setTeams] = useState(null);   // id 포함 (로고 매칭용)

  // 매치가 바뀌면 게임 목록 로드 + 기본 선택(마지막 완료 세트)
  useEffect(() => {
    let cancelled = false;
    setGames(null);
    setSelectedGame(null);
    // 팀 id 는 games 와 함께 받아둔다 (스코어보드 로고 매칭)
    fetchMatchTeams(match.matchId)
      .then((t) => { if (!cancelled) setTeams(t); })
      .catch(() => { /* 로고 없이도 화면은 정상 */ });
    fetchMatchGames(match.matchId)
      .then((g) => {
        if (cancelled) return;
        const list = g ?? [];
        setGames(list);
        const candidates = list.filter((x) => x.state !== 'unstarted');
        setSelectedGame(candidates.length ? candidates[candidates.length - 1] : null);
      })
      .catch(() => {
        if (!cancelled) setGames([]);
      });
    return () => { cancelled = true; };
  }, [match.matchId]);

  const [teamA, teamB] = match.teams;

  // 두 팀의 상대 전적
  useEffect(() => {
    let cancelled = false;
    setH2h(null);
    if (!teamA?.code || !teamB?.code) return undefined;
    fetchHeadToHead(teamA.code, teamB.code)
      .then((r) => { if (!cancelled) setH2h(r); })
      .catch(() => { /* 전적 없어도 나머지 화면은 정상 */ });
    return () => { cancelled = true; };
  }, [teamA?.code, teamB?.code]);

  return (
    <section className="panel history-panel cropmarks">
      <button className="back-btn" onClick={onClose}>← 일정으로 돌아가기</button>
      <span className="kicker">MATCH RECORD</span>
      <h2>
        {teamA?.code} <span className="vs">VS</span> {teamB?.code}
        <span className="muted">{match.blockName} · 세트별 기록</span>

        {/* 상대 전적은 부가 정보라 헤더 우측에 작게 */}
        {h2h && (h2h.winsA + h2h.winsB) > 0 && (
          <span className="h2h-inline" title={`상대 전적 ${h2h.winsA + h2h.winsB}경기`}>
            <span className="h2h-inline-label">상대 전적</span>
            <b className="blue-text">{h2h.winsA}</b>
            <span className="sep">:</span>
            <b className="red-text">{h2h.winsB}</b>
          </span>
        )}
      </h2>

      {games === null && <p className="muted">게임 목록 불러오는 중…</p>}
      {games?.length === 0 && <p className="muted">게임 목록을 가져오지 못했습니다.</p>}

      {games?.length > 0 && (
        <div className="game-buttons">
          {games.map((g) => (
            <button
              key={g.gameId}
              className={`game-btn ${selectedGame?.gameId === g.gameId ? 'active' : ''}`}
              disabled={g.state === 'unstarted'}
              onClick={() => setSelectedGame(g)}
            >
              GAME {g.number}
              <span className="muted"> · {gameStateLabel(g)}</span>
              {winnerCode(g, teams) && (
                <span className="set-winner"> {winnerCode(g, teams)} WIN</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedGame && (
        <GameBoard
          gameId={selectedGame.gameId}
          // 피드가 끝났다고 하면 state 가 아직 inProgress 여도 폴링할 이유가 없다
          live={selectedGame.state === 'inProgress' && !selectedGame.feedFinished}
          finished={selectedGame.state === 'completed' || selectedGame.feedFinished}
          statsUnavailable={selectedGame.statsUnavailable === true}
          teams={teams ?? match.teams}
        />
      )}
    </section>
  );
}
