import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../app/AppDataProvider.jsx';
import LiveScoreboard from '../../components/LiveScoreboard.jsx';
import ActiveCouponClaim from '../../features/coupon/ActiveCouponClaim.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import { resetSampleFrames, submitSampleFrame } from '../../api/admin.js';
import {
  SAMPLE_DURATION,
  SAMPLE_GAME_ID,
  SAMPLE_TEAMS,
  sampleDetails,
  sampleFramePayload,
  sampleHistory,
  sampleScoreboard,
} from '../../shared/sample/sampleMatch.js';

/**
 * 프레임 전송이 실패했을 때만 알린다.
 *
 * 성공했다고 쿠폰이 열리는 것은 아니다 — 사건이 났는지는 서버 감지기가 판단하고,
 * 열렸다면 아래 발급 창이 뜬다. 그래서 "무슨 트리거가 발동했다" 는 문구를 화면이
 * 미리 정해두지 않는다.
 */
const FRAME_ERROR_MESSAGE = '경기 상황을 서버에 알리지 못했습니다.'
  + ' 백엔드가 떠 있는지 확인해 주세요.';

/**
 * 서버로 프레임을 보내는 주기(게임 내 초).
 *
 * 실제 window 피드가 약 10초 간격이라 같은 간격으로 보낸다. 더 촘촘히 보내도
 * 감지 결과는 같고 요청만 늘어난다.
 */
const FRAME_INTERVAL_SECONDS = 10;

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

  /*
   * 경기 상황을 서버 감지기에 흘려보낸다.
   *
   * 화면이 "펜타킬이 났다" 고 지목하면 감지 로직은 한 줄도 검증되지 않는다. 그래서
   * 여기서는 참가자별 누적 킬만 보내고, 무슨 사건인지는 폴링이 쓰는 것과 같은
   * 서버 감지기가 판단한다. 트리거가 늘어도 이 화면은 그대로다.
   *
   * 경기는 서버가 예약된 테스트 경기로 고정한다. 화면이 경기를 고르게 두면 시연을
   * 열어둔 것만으로 진짜 경기의 쿠폰이 풀린다.
   *
   * 되감거나 다음 바퀴로 넘어가면 감지 상태를 비운다. 남겨두면 누적 킬이 줄어든
   * 것으로 보여 증가분이 잡히지 않고, 이미 발동한 사건은 영영 다시 열리지 않는다.
   */
  const [frameFailed, setFrameFailed] = useState(false);

  /** 마지막으로 보낸 프레임의 게임 내 시각. 같은 구간을 두 번 보내지 않는다 */
  const lastSentSecondRef = useRef(null);

  /** 전송이 겹치지 않게 한 번에 한 묶음만 보낸다 */
  const sendingRef = useRef(false);

  useEffect(() => {
    if (sendingRef.current) return;

    const bucket = Math.floor(elapsed / FRAME_INTERVAL_SECONDS)
      * FRAME_INTERVAL_SECONDS;
    const previous = lastSentSecondRef.current;
    if (previous === bucket) return;

    sendingRef.current = true;

    /*
     * 되감기·반복 재생이면 감지 상태부터 비운다.
     *
     * 남겨두면 누적 킬이 줄어든 것으로 보여 증가분이 잡히지 않고, 이미 발동한
     * 사건은 다음 바퀴에서 영영 열리지 않는다.
     */
    const rewound = previous !== null && bucket < previous;
    const prepare = rewound
      ? resetSampleFrames(SAMPLE_GAME_ID).catch(() => {})
      : Promise.resolve();

    /*
     * 건너뛴 구간을 빠짐없이 채워 보낸다.
     *
     * 배속이 높거나 사용자가 재생 위치를 옮기면 경과 시간이 한 번에 여러 구간을
     * 뛰어넘는다. 그때 마지막 구간만 보내면 그 앞의 0킬 기준 프레임이 서버에
     * 도착하지 않는다. 감지기는 첫 관측을 기준으로만 삼으므로, 기준 없이 킬이
     * 있는 프레임부터 받으면 "이미 지나간 사건" 으로 보고 아무것도 열지 않는다.
     */
    const from = rewound || previous === null
      ? 0
      : previous + FRAME_INTERVAL_SECONDS;
    const buckets = [];
    for (let t = from; t <= bucket; t += FRAME_INTERVAL_SECONDS) {
      buckets.push(t);
    }

    lastSentSecondRef.current = bucket;

    prepare
      .then(() => buckets.reduce(
        (chain, t) => chain.then(() => submitSampleFrame(sampleFramePayload(t))),
        Promise.resolve(),
      ))
      .then(() => setFrameFailed(false))
      .catch(() => setFrameFailed(true))
      .finally(() => { sendingRef.current = false; });
  }, [elapsed]);

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

      {frameFailed && (
        <p className="sample-trigger-notice" role="status">
          {FRAME_ERROR_MESSAGE}
        </p>
      )}

      <ActiveCouponClaim userId={userId} />

      {/* 라이브 페이지와 같은 구성 — 스코어보드 + 시청 포인트.
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
