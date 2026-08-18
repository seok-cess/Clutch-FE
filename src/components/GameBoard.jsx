import { useEffect, useState } from 'react';
import { fetchScoreboard, fetchDetails, fetchHistory } from '../api.js';
import Scoreboard from './Scoreboard.jsx';
import DetailsTable from './DetailsTable.jsx';
import GoldChart from './GoldChart.jsx';

const POLL_MS = 1000;

/** 초 → "24:35" (게임 시계 표기) */
function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 한 게임의 전체 정보(스코어보드 + 선수 상세)를 로드해 표시.
 * live=true 면 1초 폴링, 아니면 1회 조회.
 *
 * 표시 모드 (라이브 전용):
 *  - smooth(기본): 서버가 자동 계산한 재생 시점 → 1초마다 값이 전진
 *  - fresh       : 피드가 준 가장 새 프레임 → 지연은 ~10초 짧지만 10초 단위로 점프
 */
export default function GameBoard({ gameId, live, finished, statsUnavailable = false, teams, previewData = null, compact = false }) {
  const [mode, setMode] = useState('smooth');
  const [board, setBoard] = useState(null);
  const [details, setDetails] = useState(null);
  const [history, setHistory] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 소스가 통계를 주지 않는 세트는 호출해봐야 계속 404 다 — 아예 요청하지 않는다
    if (!gameId || statsUnavailable) return;
    let cancelled = false;
    setLoaded(false);

    if (previewData) {
      setBoard(previewData.board);
      setDetails(previewData.details ?? null);
      setHistory(previewData.history ?? null);
      setLoaded(true);

      const timer = window.setInterval(() => {
        setBoard((currentBoard) => ({
          ...currentBoard,
          gameTimeSeconds: currentBoard.gameTimeSeconds + 1,
          rfc460Timestamp: new Date().toISOString(),
        }));
      }, POLL_MS);
      return () => window.clearInterval(timer);
    }

    // smooth: lag 미지정 → 서버가 소스 요구치에 맞춰 자동 결정 / fresh: lag=0 → 최신 프레임
    const lag = live && mode === 'fresh' ? 0 : undefined;
    const load = async () => {
      try {
        const [b, d, h] = await Promise.all([
          fetchScoreboard(gameId, lag),
          fetchDetails(gameId, lag),
          fetchHistory(gameId, lag),
        ]);
        if (cancelled) return;
        if (b) setBoard(b);
        if (d) setDetails(d);
        if (h) setHistory(h);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true); // 다음 폴링(라이브 시)에서 재시도
      }
    };
    load();

    if (live) {
      const t = setInterval(load, POLL_MS);
      return () => { cancelled = true; clearInterval(t); };
    }
    return () => { cancelled = true; };
  }, [gameId, live, mode, previewData, statsUnavailable]);

  if (!gameId) return null;
  if (statsUnavailable) {
    return (
      <p className="muted">
        라이브 데이터 미제공 경기입니다 — 소스가 이 리그의 인게임 통계를 제공하지 않습니다.
      </p>
    );
  }
  if (!board) {
    return (
      <p className="muted">
        {loaded ? '이 게임의 인게임 데이터가 없습니다 (피드 미보존 또는 시작 전).' : '인게임 데이터 불러오는 중…'}
      </p>
    );
  }

  // 피드가 준 최종 상태가 가장 빠르다 (소스 state 는 약 5분 늦다)
  const isFinished = finished || board.gameState === 'finished';

  return (
    <>
      {board.gameTimeSeconds != null && (
        <div className={`game-clock ${isFinished ? 'ended' : ''}`}>
          {formatClock(board.gameTimeSeconds)}
          {/* 종료 후에는 시계가 멈춘다. 멈춘 게 아니라 끝난 것임을 명시한다 */}
          {isFinished && <span className="clock-note">세트 종료</span>}
        </div>
      )}
      <div className="meta-line">
        <span>STATE {board.gameState ?? '-'}</span>
        <span>PATCH {board.patchVersion ?? '-'}</span>
        <span>FRAME {board.rfc460Timestamp?.slice(11, 19) ?? '-'}</span>
        {live && <span>REFRESH {POLL_MS / 1000}S</span>}
        {live && (
          <span className="mode-toggle">
            <button className={mode === 'smooth' ? 'active' : ''} onClick={() => setMode('smooth')}>
              1S STEP
            </button>
            <button className={mode === 'fresh' ? 'active' : ''} onClick={() => setMode('fresh')}>
              LATEST
            </button>
          </span>
        )}
      </div>
      <Scoreboard board={board} teams={teams} objectives={history?.objectives} />

      {!compact && (
        <>
          <div className="details-block">
            <span className="kicker">GOLD DIFFERENTIAL</span>
            <h3>골드차 추이 <span className="muted">게임 시간 기준</span></h3>
            <GoldChart points={history?.points} objectives={history?.objectives} />
          </div>

          {details
            ? <DetailsTable details={details} />
            : <p className="muted">선수 상세(딜지분/와드/아이템) 데이터 없음</p>}
        </>
      )}
    </>
  );
}
