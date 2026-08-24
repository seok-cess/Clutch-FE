import { useCallback, useEffect, useState } from 'react';
import { fetchMyBets, fetchMyPoint } from '../api.js';

const BET_STATUS_LABEL = {
  PLACED: '진행 중',
  WON: '적중',
  LOST: '미적중',
  REFUNDED: '환불 완료',
};

const EVENT_STATUS_LABEL = {
  OPEN: '배팅 가능',
  CLOSED: '마감',
  SETTLED: '정산 완료',
  CANCELLED: '취소',
};

/** 외부 매치 ID와 팀 ID를 현재 일정 데이터의 표시 이름으로 변환한다. */
function betLabels(bet, matches) {
  const match = matches.find((candidate) => candidate.matchId === bet.externalMatchId);
  const selectedTeam = match?.teams?.find((team) => team.id === bet.selectedTeamId);
  const matchLabel = match?.teams?.length
    ? match.teams.map((team) => team.code ?? team.name).join(' vs ')
    : `MATCH ${bet.externalMatchId}`;
  return {
    matchLabel,
    teamLabel: selectedTeam?.code ?? selectedTeam?.name ?? bet.selectedTeamId,
  };
}

/** UTC 저장 시각을 한국 표준시(KST) 기준 목록용 분 단위 문자열로 표시한다. */
function formatCreatedAt(createdAt) {
  if (!createdAt) return '-';
  // Spring LocalDateTime은 UTC 값이어도 오프셋 없이 직렬화될 수 있다.
  // 오프셋이 없는 값은 UTC로 해석한 뒤 한국 시간대로 변환한다.
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(createdAt)
    ? createdAt
    : `${createdAt}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '-';

  return `${new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)} KST`;
}

/** 현재 사용자의 보유 포인트와 전체 배팅 이력을 표시한다. */
export default function MyPagePanel({ userId, matches }) {
  const [point, setPoint] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMyData = useCallback(async () => {
    if (!userId) {
      setPoint(null);
      setBets([]);
      setError('상단에 사용자 ID를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [pointResponse, betResponse] = await Promise.all([
        fetchMyPoint(userId),
        fetchMyBets(userId),
      ]);
      setPoint(pointResponse.point);
      setBets(betResponse);
    } catch (requestError) {
      setPoint(null);
      setBets([]);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMyData();
  }, [loadMyData]);

  return (
    <section className="panel cropmarks my-page-panel">
      <div className="my-page-heading">
        <div>
          <span className="kicker">MY CLUTCH</span>
          <h2>내 정보 <span className="muted">포인트 · 배팅 이력</span></h2>
        </div>
        <button type="button" onClick={loadMyData} disabled={loading}>
          {loading ? '조회 중' : '새로고침'}
        </button>
      </div>

      {error && <p className="my-page-message error">{error}</p>}

      {!error && (
        <>
          <div className="my-point-card">
            <span>AVAILABLE POINT</span>
            <strong>{point == null ? '-' : `${point.toLocaleString()}P`}</strong>
            <small>USER {userId}</small>
          </div>

          <div className="my-bet-history">
            <div className="my-bet-history-heading">
              <h3>내 배팅</h3>
              <span>{bets.length}건</span>
            </div>

            {bets.length === 0 ? (
              <p className="my-page-empty">등록한 배팅이 없습니다.</p>
            ) : (
              <div className="my-bet-table-wrap">
                <table className="my-bet-table">
                  <thead>
                    <tr>
                      <th>MATCH</th>
                      <th>SET</th>
                      <th>PICK</th>
                      <th>POINT</th>
                      <th>RESULT</th>
                      <th>EVENT</th>
                      <th>PLACED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((bet) => {
                      const labels = betLabels(bet, matches);
                      return (
                        <tr key={bet.userBetId}>
                          <td>{labels.matchLabel}</td>
                          <td>{bet.setNumber}세트</td>
                          <td className="my-bet-pick">{labels.teamLabel}</td>
                          <td>{bet.amount.toLocaleString()}P</td>
                          <td>
                            <span className={`my-bet-status ${bet.status.toLowerCase()}`}>
                              {BET_STATUS_LABEL[bet.status] ?? bet.status}
                            </span>
                          </td>
                          <td>{EVENT_STATUS_LABEL[bet.eventStatus] ?? bet.eventStatus}</td>
                          <td>{formatCreatedAt(bet.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
