import { useEffect, useState } from 'react';
import {
  fetchExternalSourceStatus,
  fetchScoreboard,
  fetchDetails,
  fetchHistory,
  fetchReplayStatus,
} from '../api.js';
import Scoreboard from './Scoreboard.jsx';
import DetailsTable from './DetailsTable.jsx';
import GoldChart from './GoldChart.jsx';

const POLL_MS = 1000;
const SOURCE_POLL_MS = 2000;

/** 초 → "24:35" (게임 시계 표기) */
function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 한 게임의 전체 정보(스코어보드 + 선수 상세)를 로드해 표시.
 * live=true 면 1초 폴링, 아니면 1회 조회.
 * 프레임은 항상 서버가 자동 계산한 재생 시점(1초 간격)을 쓴다.
 */
export default function GameBoard({ gameId, live, finished, statsUnavailable = false, teams, previewData = null, previewTicks = true, compact = false }) {
  const [board, setBoard] = useState(null);
  const [details, setDetails] = useState(null);
  const [history, setHistory] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [displayGameTime, setDisplayGameTime] = useState(null);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [sourceMode, setSourceMode] = useState(null);

  // 실제 API와 test 재생은 같은 1초 폴링을 써도 시간축이 다르다.
  // replay 배속은 STUB일 때만 화면 시계에 적용한다.
  useEffect(() => {
    if (!live) {
      setSourceMode(null);
      return undefined;
    }

    let cancelled = false;
    const loadSourceMode = async () => {
      try {
        const source = await fetchExternalSourceStatus();
        if (!cancelled) setSourceMode(source?.mode ?? 'REAL');
      } catch {
        // 소스 상태를 확인하지 못하면 실제 경기 시계처럼 1배속으로 안전하게 표시한다.
        if (!cancelled) setSourceMode('REAL');
      }
    };

    loadSourceMode();
    const timer = window.setInterval(loadSourceMode, SOURCE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [live]);

  useEffect(() => {
    // 소스가 통계를 주지 않는 세트는 호출해봐야 계속 404 다 — 아예 요청하지 않는다
    if (!gameId || statsUnavailable) return;
    let cancelled = false;
    setLoaded(false);
    setBoard(null);
    setDetails(null);
    setHistory(null);
    setDisplayGameTime(null);

    if (previewData) {
      setBoard(previewData.board);
      setDetails(previewData.details ?? null);
      setHistory(previewData.history ?? null);
      setLoaded(true);

      // 재생을 바깥에서 제어하는 화면(샘플 재생)은 시계를 직접 관리한다.
      // 여기서도 올리면 초가 두 배로 흐르고 seek 이 되돌려진다.
      if (!previewTicks) return undefined;

      const timer = window.setInterval(() => {
        setBoard((currentBoard) => ({
          ...currentBoard,
          gameTimeSeconds: currentBoard.gameTimeSeconds + 1,
          rfc460Timestamp: new Date().toISOString(),
        }));
      }, POLL_MS);
      return () => window.clearInterval(timer);
    }

    const load = async () => {
      try {
        const [b, d, h] = await Promise.all([
          fetchScoreboard(gameId),
          fetchDetails(gameId),
          fetchHistory(gameId),
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
  }, [gameId, live, previewData, previewTicks, statsUnavailable]);

  // 피드 프레임은 1초보다 촘촘하지 않을 수 있다. 화면 시계는 마지막 프레임보다
  // 되감지 않도록 직접 진행하고, test 재생 중에만 현재 선택한 배속만큼 올린다.
  useEffect(() => {
    const serverTime = board?.gameTimeSeconds;
    if (serverTime == null) return undefined;
    let cancelled = false;

    const syncClock = async () => {
      let speed = 1;
      if (live && sourceMode === 'STUB') {
        try {
          const replay = await fetchReplayStatus();
          if (Number.isFinite(replay?.speed) && replay.speed > 0) {
            speed = replay.speed;
          }
        } catch {
          // replay 상태를 읽지 못해도 1배속으로 표시한다.
        }
      }
      if (cancelled) return;
      setReplaySpeed(speed);
      setDisplayGameTime((current) => Math.max(current ?? serverTime, serverTime));
    };

    syncClock();
    return () => { cancelled = true; };
  }, [board?.gameTimeSeconds, live, sourceMode]);

  // test 재생에서 실제 API로 돌아오면 이전 배속으로 앞서간 표시 시계를 즉시 버린다.
  useEffect(() => {
    if (sourceMode === 'REAL') {
      setReplaySpeed(1);
      setDisplayGameTime(board?.gameTimeSeconds ?? null);
    }
  }, [sourceMode]);

  useEffect(() => {
    if (!live || board?.gameTimeSeconds == null || finished || board.gameState === 'finished') {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setDisplayGameTime((current) => (current ?? board.gameTimeSeconds) + replaySpeed);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [board?.gameState, board?.gameTimeSeconds, finished, live, replaySpeed]);

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
          {formatClock(displayGameTime ?? board.gameTimeSeconds)}
          {/* 종료 후에는 시계가 멈춘다. 멈춘 게 아니라 끝난 것임을 명시한다 */}
          {isFinished && <span className="clock-note">세트 종료</span>}
        </div>
      )}
      <div className="meta-line">
        <span>STATE {board.gameState ?? '-'}</span>
        <span>PATCH {board.patchVersion ?? '-'}</span>
        <span>FRAME {board.rfc460Timestamp?.slice(11, 19) ?? '-'}</span>
        {live && <span>REFRESH {POLL_MS / 1000}S</span>}
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
