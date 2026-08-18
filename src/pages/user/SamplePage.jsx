import { useCallback, useEffect, useMemo, useState } from 'react';
import LiveScoreboard from '../../components/LiveScoreboard.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import {
  SAMPLE_DURATION,
  SAMPLE_TEAMS,
  sampleDetails,
  sampleHistory,
  sampleScoreboard,
} from '../../shared/sample/sampleMatch.js';

/** 화면 갱신 주기 — 실제 라이브와 같은 1초 */
const TICK_MS = 1000;

const SPEEDS = [1, 5, 10, 30];

/** 초 → "24:35" */
function clock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 시연·테스트용 재생 화면.
 *
 * 서버를 호출하지 않고 경과 시간만으로 지표를 생성한다. 소스에 라이브 경기가
 * 없어도, 통계를 주지 않는 리그만 열려 있어도 화면 전체를 움직여 볼 수 있다.
 * 끝까지 가면 처음으로 돌아가 계속 반복한다.
 */
export default function SamplePage() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(10);
  const [loop, setLoop] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + speed;
        if (next < SAMPLE_DURATION) return next;
        // 반복 재생이 아니면 끝에서 멈춘다
        return loop ? 0 : SAMPLE_DURATION;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, speed, loop]);

  // 끝에 닿았고 반복이 꺼져 있으면 자동으로 정지
  useEffect(() => {
    if (!loop && elapsed >= SAMPLE_DURATION) setPlaying(false);
  }, [loop, elapsed]);

  // 경과 시간이 바뀔 때만 다시 만든다 — 매 렌더마다 만들면 그래프가 깜빡인다
  const preview = useMemo(() => ({
    board: sampleScoreboard(elapsed),
    details: sampleDetails(elapsed),
    history: sampleHistory(elapsed),
  }), [elapsed]);

  const seek = useCallback((e) => {
    setElapsed(Number(e.target.value));
  }, []);

  const progress = (elapsed / SAMPLE_DURATION) * 100;

  // LiveScoreboard 가 기대하는 match 모양 — /api/live 응답과 같은 형태다
  const sampleMatch = useMemo(() => ({
    matchId: 'sample-match',
    leagueName: 'SAMPLE',
    blockName: '시연',
    bestOf: 3,
    matchFinished: false,
    matchWinnerTeamId: null,
    teams: SAMPLE_TEAMS.map((t, i) => ({ ...t, gameWins: i === 0 ? 1 : 0 })),
    games: [
      {
        gameId: 'sample-game',
        number: 1,
        state: elapsed >= SAMPLE_DURATION ? 'completed' : 'inProgress',
        feedFinished: elapsed >= SAMPLE_DURATION,
        winnerTeamId: null,
        statsUnavailable: false,
      },
    ],
    activeGameId: 'sample-game',
  }), [elapsed]);

  return (
    <main className="user-content page-sample">
      <PageHeader
        title="샘플 재생"
        description="서버 호출 없이 30분 경기를 반복 재생합니다. 시연과 화면 확인용이며 실제 경기 데이터가 아닙니다."
      />

      <section className="panel sample-panel">
        <div className="sample-controls">
          <button
            type="button"
            className="sample-btn primary"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? '일시정지' : '재생'}
          </button>

          <button
            type="button"
            className="sample-btn"
            onClick={() => { setElapsed(0); setPlaying(true); }}
          >
            처음부터
          </button>

          <span className="sample-speeds" role="group" aria-label="재생 속도">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`sample-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </span>

          <label className="sample-loop">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />
            반복
          </label>

          <span className="sample-clock">
            {clock(elapsed)} <span className="muted">/ {clock(SAMPLE_DURATION)}</span>
          </span>
        </div>

        <input
          className="sample-seek"
          type="range"
          min="0"
          max={SAMPLE_DURATION}
          step="1"
          value={elapsed}
          onChange={seek}
          aria-label="재생 위치"
        />
        <div className="sample-progress"><i style={{ width: `${progress}%` }} /></div>
      </section>

      {/* 라이브 페이지와 같은 구성 — 스코어보드 + 시청 포인트 + 배팅.
          LiveScoreboard 의 preview 모드가 서버 호출 없이 동작한다. */}
      <LiveScoreboard
        match={sampleMatch}
        userId={null}
        preview
        gamePreview={preview}
        previewTicks={false}
      />
    </main>
  );
}
