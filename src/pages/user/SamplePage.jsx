import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../app/AppDataProvider.jsx';
import LiveScoreboard from '../../components/LiveScoreboard.jsx';
import ActiveCouponClaim from '../../features/coupon/ActiveCouponClaim.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import { resetSampleFrames, sendSampleFrame } from '../../api/sampleFrame.js';
import {
  SAMPLE_DURATION,
  SAMPLE_GAME_ID,
  SAMPLE_PENTAKILL,
  SAMPLE_TEAMS,
  sampleDetails,
  sampleHistory,
  sampleScoreboard,
} from '../../shared/sample/sampleMatch.js';

/**
 * 펜타킬 지점에서 무슨 일이 있었는지 화면에 남긴다.
 * 표시가 없으면 "왜 발급 창이 안 뜨지" 를 화면만 보고는 알 수 없다.
 */
const TRIGGER_MESSAGE = {
  passed: '펜타킬 5킬이 모두 들어갔습니다. 서버 감지기가 판정합니다 —'
    + ' 발급 창이 열리지 않으면 PENTAKILL 트리거로 등록된 대기 이벤트가 없는 것입니다.',
  error: '프레임을 서버에 보내지 못했습니다. 감지가 시작되지 않아 쿠폰도 열리지 않습니다.',
};

/** 감지기는 참가자별 누적 킬만 본다 — 나머지 지표는 보내지 않는다 */
function participantKills(team) {
  return (team?.participants ?? []).map((participant) => ({
    participantId: participant.participantId,
    kills: participant.kills,
  }));
}

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
  // 쿠폰 발급은 서버를 그대로 쓴다 — 활성 이벤트 조회가 경기와 무관해 샘플에서도 잡힌다
  const { userId } = useAppData();
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

  /** 프레임을 서버로 보내지 못했는지 — 감지가 아예 시작되지 못한 상태다 */
  const [frameError, setFrameError] = useState(false);
  const lastElapsedRef = useRef(null);

  // 경과 시간이 바뀔 때만 다시 만든다 — 매 렌더마다 만들면 그래프가 깜빡인다
  const preview = useMemo(() => ({
    board: sampleScoreboard(elapsed),
    details: sampleDetails(elapsed),
    history: sampleHistory(elapsed),
  }), [elapsed]);

  /*
   * 매 틱 프레임을 서버 감지기로 보낸다.
   *
   * 화면이 "펜타킬이 났다"고 지목하면 감지 로직은 한 줄도 검증되지 않는다.
   * 그래서 참가자별 누적 킬만 보내고, 펜타킬 판정은 폴링이 쓰는 것과 같은
   * 서버의 PentakillDetector 가 한다.
   *
   * 경기는 서버가 예약된 테스트 경기로 고정한다. 요청이 경기를 고르게 두면
   * 시연 화면을 여는 것만으로 진짜 경기의 쿠폰이 풀린다.
   */
  useEffect(() => {
    const previous = lastElapsedRef.current;
    lastElapsedRef.current = elapsed;

    // 되감거나 다음 바퀴로 넘어가면 서버의 감지 상태를 버린다. 누적 킬이 줄어든
    // 채로 이어가면 증가분이 잡히지 않고, 이미 발동한 참가자로 남아 다음 바퀴에서
    // 영영 발동하지 않는다
    const rewound = previous != null && elapsed < previous;

    let cancelled = false;
    (async () => {
      try {
        if (rewound) await resetSampleFrames(SAMPLE_GAME_ID);
        await sendSampleFrame({
          gameId: SAMPLE_GAME_ID,
          gameTimeSeconds: Math.floor(elapsed),
          blue: participantKills(preview.board.blue),
          red: participantKills(preview.board.red),
        });
        if (!cancelled) setFrameError(false);
      } catch {
        // 재생은 계속한다 — 화면 시연 자체는 서버 없이도 되어야 한다
        if (!cancelled) setFrameError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [elapsed, preview]);

  const pentakillPassed = elapsed >= SAMPLE_PENTAKILL.endSeconds;

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
    <main className="user-content page-live page-sample">
      <PageHeader
        title="샘플 재생"
        description="2026-08-15 GEN vs T1 의 기록을 서버 호출 없이 재생합니다. 시연용이라 펜타킬 한 건을 넣어 두었으며, 그 부분은 실제 경기와 다릅니다."
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

      {(frameError || pentakillPassed) && (
        <p className="sample-trigger-notice" role="status">
          {TRIGGER_MESSAGE[frameError ? 'error' : 'passed']}
        </p>
      )}

      <ActiveCouponClaim userId={userId} />

      {/* 라이브 페이지와 같은 구성 — 스코어보드 + 시청 포인트 + 배팅.
          LiveScoreboard 의 preview 모드가 서버 호출 없이 동작한다. */}
      <LiveScoreboard
        match={sampleMatch}
        userId={userId}
        preview
        gamePreview={preview}
        previewTicks={false}
      />
    </main>
  );
}
