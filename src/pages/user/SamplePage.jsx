import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../app/AppDataProvider.jsx';
import LiveScoreboard from '../../components/LiveScoreboard.jsx';
import ActiveCouponClaim from '../../features/coupon/ActiveCouponClaim.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import { openCouponEventByTrigger } from '../../api/admin.js';
import {
  SAMPLE_DURATION,
  SAMPLE_GAME_ID,
  SAMPLE_MATCH_ID,
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
  opened: '펜타킬이 발생해 쿠폰 발급이 시작됐습니다.',
  none: '펜타킬이 발생했지만 준비된 쿠폰 이벤트가 없습니다.'
    + ' 관리자 화면에서 펜타킬 이벤트를 테스트용으로 등록해 주세요.',
  error: '펜타킬을 알리는 데 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

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
   * 펜타킬 시점을 지나면 서버에 트리거를 알린다.
   *
   * 쿠폰 발급은 서버 일이라(회차 생성·재고·중복 검사) 프론트가 감지만 해서는
   * 아무 일도 일어나지 않는다. 그래서 샘플에서도 이 호출만은 서버로 나간다.
   *
   * 경기는 테스트 전용 SAMPLE_MATCH_ID 로 고정한다. 경기를 지정하지 않으면 서버가
   * 트리거만 보고 아무 경기의 PENTAKILL 이벤트나 열어버려, 시연 화면을 열어둔
   * 것만으로 진짜 경기의 쿠폰이 풀린다.
   *
   * 반복 재생이라 같은 지점을 여러 번 지나는데, 서버가 sourceEventKey 로
   * 중복 오픈을 막으므로 그대로 보내도 회차는 한 번만 열린다. 다만 매 바퀴마다
   * 요청이 나가지 않도록 이번 바퀴에 보냈는지는 여기서도 기억해 둔다.
   */
  const pentakillSentRef = useRef(false);
  const [pentakillFired, setPentakillFired] = useState(false);
  /** 트리거를 보낸 결과 — null(아직) | opened | none | error */
  const [triggerOutcome, setTriggerOutcome] = useState(null);

  useEffect(() => {
    // 5킬이 다 들어간 뒤가 펜타킬이 성립한 시점이다
    const reached = elapsed >= SAMPLE_PENTAKILL.endSeconds;
    if (!reached) {
      // 되감기거나 다음 바퀴로 넘어가면 다시 보낼 수 있게 되돌린다
      pentakillSentRef.current = false;
      setPentakillFired(false);
      setTriggerOutcome(null);
      return;
    }
    if (pentakillSentRef.current) return;
    pentakillSentRef.current = true;
    setPentakillFired(true);

    openCouponEventByTrigger({
      trigger: 'PENTAKILL',
      esportsMatchId: SAMPLE_MATCH_ID,
      gameId: SAMPLE_GAME_ID,
      gameTimeSeconds: SAMPLE_PENTAKILL.endSeconds,
    }).then((opened) => {
      // 열 이벤트가 없으면 204 라 body 가 비어 온다
      setTriggerOutcome(opened ? 'opened' : 'none');
    }).catch(() => {
      // 실패해도 재생은 계속한다
      setTriggerOutcome('error');
    });
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

      {pentakillFired && triggerOutcome && (
        <p className="sample-trigger-notice" role="status">
          {TRIGGER_MESSAGE[triggerOutcome]}
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
