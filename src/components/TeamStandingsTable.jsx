/**
 * 팀 순위표 (매치 기준).
 *
 * 승·패·득실차·승률만 보여준다. KDA·킬 같은 세트 기록 지표는 game_player_stat
 * 적재 시점이 매치 전적과 달라 일부 팀만 값이 비는 상태가 생기므로 넣지 않는다.
 */
export default function TeamStandingsTable({ rows }) {
  if (!rows?.length) return <p className="muted">순위 데이터 없음</p>;

  return (
    <div className="table-scroll">
      <table className="team-standings">
        <thead>
          <tr>
            <th>순위</th>
            <th>팀</th>
            <th className="num">경기</th>
            <th className="num">승</th>
            <th className="num">패</th>
            <th className="num">득실차</th>
            <th className="num">승률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            // 1위 행만 좌측 표시선 (강조는 단 하나)
            <tr key={r.teamCode} className={r.rank === 1 ? 'row-lead' : ''}>
              <td className="num">{r.rank}</td>
              <td>
                <span className="team-cell">
                  {r.teamImageUrl && <img src={r.teamImageUrl} alt="" className="team-logo" />}
                  <span>{r.teamName ?? r.teamCode}</span>
                </span>
              </td>
              <td className="num">{r.games}</td>
              <td className="num strong">{r.wins}</td>
              <td className="num">{r.losses}</td>
              <td className={`num ${r.setDiff > 0 ? 'pos' : r.setDiff < 0 ? 'neg' : ''}`}>
                {r.setDiff > 0 ? `+${r.setDiff}` : r.setDiff}
              </td>
              <td className="num">{r.winRate == null ? '-' : r.winRate.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
