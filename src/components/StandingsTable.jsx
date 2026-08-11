export default function StandingsTable({ standings }) {
  if (!standings.length) return <p className="muted">순위 데이터 없음</p>;

  return (
    <div className="standings">
      {standings.map((sec, i) => (
        <div key={i} className="standings-section">
          <h3>{sec.sectionName} <span className="muted">{sec.stageName}</span></h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>TEAM</th>
                  <th>W</th>
                  <th>L</th>
                </tr>
              </thead>
              <tbody>
                {sec.rankings.flatMap((row) =>
                  row.teams.map((t, ti) => (
                    // 1위 행만 좌측 스틸 블루 표시선 (강조는 단 하나)
                    <tr key={`${row.ordinal}-${ti}`} className={row.ordinal === 1 ? 'row-lead' : ''}>
                      <td className="num">{ti === 0 ? row.ordinal : ''}</td>
                      <td>
                        <span className="team-cell">
                          {t.image && <img src={t.image} alt="" className="team-logo" />}
                          <span>{t.name}</span>
                        </span>
                      </td>
                      <td className="num">{t.wins ?? '-'}</td>
                      <td className="num">{t.losses ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
