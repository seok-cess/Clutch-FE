import { useEffect, useState } from 'react';
import { fetchMatchGames, fetchHeadToHead, fetchMatchTeams } from '../api.js';
import GameBoard from './GameBoard.jsx';

const GAME_STATE_LABEL = {
  completed: '종료',
  inProgress: 'LIVE',
  unstarted: '미시작',
};

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
              <span className="muted"> · {GAME_STATE_LABEL[g.state] ?? g.state}</span>
            </button>
          ))}
        </div>
      )}

      {selectedGame && (
        <GameBoard
          gameId={selectedGame.gameId}
          live={selectedGame.state === 'inProgress'}
          teams={teams ?? match.teams}
        />
      )}
    </section>
  );
}
