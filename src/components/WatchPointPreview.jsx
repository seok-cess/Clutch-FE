import { useEffect, useState } from 'react';

const CLAIM_INTERVAL_SECONDS = 5 * 60;
const POINTS_PER_CLAIM = 100;

/** 초 단위 시간을 시청 타이머의 MM:SS 형식으로 변환한다. */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** 5분 시청 누적과 포인트 수령 흐름을 빠르게 확인하는 개발용 프리뷰. */
export default function WatchPointPreview() {
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(4 * 60 + 50);
  const [rewardSequence, setRewardSequence] = useState(1);
  const [totalPoint, setTotalPoint] = useState(50_000);
  const [message, setMessage] = useState('시청 시간이 실시간으로 누적되고 있습니다.');
  const claimable = accumulatedSeconds >= CLAIM_INTERVAL_SECONDS;

  useEffect(() => {
    if (claimable) return undefined;
    const timer = window.setInterval(() => {
      setAccumulatedSeconds((seconds) => Math.min(seconds + 1, CLAIM_INTERVAL_SECONDS));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [claimable]);

  /** 수령 가능한 100P를 지급하고 다음 5분 회차를 시작한다. */
  const claimPoint = () => {
    if (!claimable) return;
    setTotalPoint((point) => point + POINTS_PER_CLAIM);
    setRewardSequence((sequence) => sequence + 1);
    setAccumulatedSeconds(0);
    setMessage(`${POINTS_PER_CLAIM}P를 받았습니다. 다음 회차 적립을 시작합니다.`);
  };

  const remainingSeconds = Math.max(0, CLAIM_INTERVAL_SECONDS - accumulatedSeconds);

  return (
    <div className="watch-point-panel">
      <div className="watch-point-heading">
        <div>
          <span className="kicker">WATCH REWARD</span>
          <h3>시청 포인트</h3>
        </div>
        <span className={`watch-state ${claimable ? 'claimable' : ''}`}>
          {claimable ? '수령 가능' : '시청 중'}
        </span>
      </div>

      <div className="watch-timer-row">
        <div className="watch-timer">
          <strong>{formatTime(accumulatedSeconds)}</strong>
          <span>/ {formatTime(CLAIM_INTERVAL_SECONDS)}</span>
        </div>
        <div className="watch-point-balance">
          <span>보유 포인트</span>
          <strong>{totalPoint.toLocaleString()}P</strong>
        </div>
      </div>

      <progress value={accumulatedSeconds} max={CLAIM_INTERVAL_SECONDS}>
        {accumulatedSeconds} / {CLAIM_INTERVAL_SECONDS}
      </progress>

      <div className="watch-point-footer">
        <div>
          <span>{rewardSequence}회차 · +{POINTS_PER_CLAIM}P</span>
          <small>{claimable ? '수령할 때까지 시간이 더 누적되지 않습니다.' : `${formatTime(remainingSeconds)} 남음`}</small>
        </div>
        <button type="button" onClick={claimPoint} disabled={!claimable}>
          {claimable ? `${POINTS_PER_CLAIM}P 받기` : '시청 중'}
        </button>
      </div>

      <p className="watch-point-message">{message}</p>
      {!claimable && (
        <button
          type="button"
          className="preview-skip"
          onClick={() => setAccumulatedSeconds(CLAIM_INTERVAL_SECONDS)}
        >
          프리뷰: 수령 가능 상태 보기
        </button>
      )}
    </div>
  );
}
