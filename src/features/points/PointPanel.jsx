import { useEffect, useState } from 'react';
import { fetchMyPointSummary, fetchMyPointRanking, fetchPointRankings } from '../../api/rewards.js';
import { formatPoint, formatNumber } from '../../shared/utils/format.js';
import { LoadingState, ErrorState } from '../../shared/components/AsyncState.jsx';

const TOP_RANK_LIMIT = 10;

function formatPredictionHitRate(predictionCount, predictionSuccessCount) {
  if (predictionCount === 0) return '—';

  return `${((predictionSuccessCount / predictionCount) * 100).toFixed(1)}%`;
}

/**
 * 홈 화면에 그대로 얹는 "포인트" 카드 — 정보(내 포인트·승부예측 전적)와
 * 포인트 순위(전체 TOP 10 + 내 순위) 두 탭을 팝업 없이 바로 보여준다.
 */
export default function PointPanel({ userId }) {
  const [tab, setTab] = useState('info');

  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  const [rankings, setRankings] = useState(null);
  const [myRanking, setMyRanking] = useState(null);
  const [rankingError, setRankingError] = useState(null);
  const [rankingLoaded, setRankingLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    fetchMyPointSummary(userId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((error) => { if (!cancelled) setSummaryError(error.message); });
    return () => { cancelled = true; };
  }, [userId]);

  // 순위 탭은 처음 열 때만 불러오고, 이후 탭을 오가도 다시 부르지 않는다.
  useEffect(() => {
    if (tab !== 'ranking' || rankingLoaded || !userId) return undefined;
    let cancelled = false;
    Promise.all([fetchPointRankings(), fetchMyPointRanking(userId)])
      .then(([rankingList, mine]) => {
        if (cancelled) return;
        setRankings(rankingList);
        setMyRanking(mine);
        setRankingLoaded(true);
      })
      .catch((error) => { if (!cancelled) setRankingError(error.message); });
    return () => { cancelled = true; };
  }, [tab, rankingLoaded, userId]);

  const meInTop = myRanking != null && myRanking.rank <= TOP_RANK_LIMIT;

  return (
    <section className="cl-card cl-pointpanel">
      <div className="cl-ch">
        <h3>포인트</h3>
      </div>

      <div className="point-modal-tabs" role="tablist" aria-label="포인트 정보 탭">
        <button
          type="button"
          role="tab"
          id="point-tab-info"
          aria-selected={tab === 'info'}
          aria-controls="point-panel-info"
          className="point-modal-tab"
          onClick={() => setTab('info')}
        >
          정보
        </button>
        <button
          type="button"
          role="tab"
          id="point-tab-ranking"
          aria-selected={tab === 'ranking'}
          aria-controls="point-panel-ranking"
          className="point-modal-tab"
          onClick={() => setTab('ranking')}
        >
          포인트 순위
        </button>
      </div>

      <div
        id="point-panel-info"
        className="point-info"
        role="tabpanel"
        aria-labelledby="point-tab-info"
        hidden={tab !== 'info'}
      >
        {summaryError ? (
          <ErrorState>{summaryError}</ErrorState>
        ) : !summary ? (
          <LoadingState>포인트 정보를 불러오는 중입니다.</LoadingState>
        ) : (
          <>
            <div className="point-info-summary">
              <div>
                <p className="point-info-label">내 보유 포인트</p>
                <p className="point-info-balance">{formatPoint(summary.point)}</p>
              </div>
              <div className="point-info-hit-rate">
                <span>적중률</span>
                <strong>{formatPredictionHitRate(summary.predictionCount, summary.predictionSuccessCount)}</strong>
              </div>
            </div>

            <ul className="point-info-list">
              <li className="point-info-row">
                <span>승부예측</span>
                <b>{formatNumber(summary.predictionCount)}회</b>
              </li>
              <li className="point-info-row">
                <span>승부예측 성공</span>
                <b>{formatNumber(summary.predictionSuccessCount)}회</b>
              </li>
              <li className="point-info-row">
                <span>한 번에 가장 많이 얻은 포인트</span>
                <b className="point-info-highlight">+{formatPoint(summary.maxEarnedPoint)}</b>
              </li>
            </ul>
          </>
        )}
      </div>

      <div
        id="point-panel-ranking"
        className="point-rank"
        role="tabpanel"
        aria-labelledby="point-tab-ranking"
        hidden={tab !== 'ranking'}
      >
        {rankingError ? (
          <ErrorState>{rankingError}</ErrorState>
        ) : !rankingLoaded ? (
          <LoadingState>포인트 순위를 불러오는 중입니다.</LoadingState>
        ) : (
          <>
            <div className="point-rank-head">
              <span>전체 유저 보유 포인트 순위</span>
              <span className="point-rank-top">TOP {TOP_RANK_LIMIT}</span>
            </div>

            <ol className="point-rank-list">
              {rankings.map((row) => {
                const isMe = meInTop && row.rank === myRanking.rank;
                return (
                  <li key={row.rank} className={`point-rank-row ${isMe ? 'point-rank-row-me' : ''}`}>
                    <span className="point-rank-num">{row.rank}</span>
                    <span className="point-rank-name">
                      {row.displayName}
                      {isMe && <span className="point-rank-badge">나</span>}
                    </span>
                    <span className="point-rank-point">{formatPoint(row.point)}</span>
                  </li>
                );
              })}
              {!meInTop && myRanking && (
                <>
                  <li className="point-rank-divider" aria-hidden="true">⋯</li>
                  <li className="point-rank-row point-rank-row-outside">
                    <span className="point-rank-num">{myRanking.rank}</span>
                    <span className="point-rank-name">
                      나
                      <span className="point-rank-badge">MY RANK</span>
                    </span>
                    <span className="point-rank-point">{formatPoint(myRanking.point)}</span>
                  </li>
                </>
              )}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
