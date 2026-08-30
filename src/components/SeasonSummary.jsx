import { championIcon, championName } from '../ddragon.js';

/**
 * 메인 화면 하단의 시즌 요약 3열.
 *
 * KDA·픽률은 적재가 끝난 세트만 집계하므로 시즌 초반이나 적재 전에는 비어 있을 수 있다.
 * 그 경우에도 카드를 감추지 않고 빈 상태를 보여준다 — 자리가 사라지면 화면이 흔들린다.
 */
export default function SeasonSummary({ playerKda, champions, recentForm }) {
  return (
    <>
      <KdaCard board={playerKda} />
      <ChampionCard board={champions} />
      <RecentRecordCard recentForm={recentForm} />
    </>
  );
}

function Card({ title, sub, children }) {
  return (
    <section className="cl-card">
      <div className="cl-ch">
        <h3>{title}</h3>
        {sub && <span className="s">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

/** 시즌 누적 KDA 상위 선수 */
function KdaCard({ board }) {
  const rows = board?.players ?? [];
  return (
    <Card title="KDA 순위" sub={board?.seasonKey ? `${board.seasonKey} 시즌` : '시즌 누적'}>
      {rows.length === 0 ? (
        <p className="cl-empty">집계된 경기가 아직 없습니다.</p>
      ) : rows.map((p) => (
        <div key={`${p.summonerName}-${p.teamCode ?? ''}`} className="cl-pl">
          <span className="cl-pln">{p.rank}</span>
          <span className="cl-plname">
            {p.summonerName}
            <span className="cl-plsub">
              {[p.teamCode, `${p.games}세트`].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className="cl-plv" title={`${p.kills} / ${p.deaths} / ${p.assists}`}>
            {p.kda.toFixed(2)}
          </span>
        </div>
      ))}
    </Card>
  );
}

/** 밴 데이터는 수집하지 않으므로 밴픽률이 아니라 픽률이다 */
function ChampionCard({ board }) {
  const rows = board?.champions ?? [];
  return (
    <Card title="챔피언 픽률" sub={board?.totalGames ? `${board.totalGames}세트 기준` : '시즌 누적'}>
      {rows.length === 0 ? (
        <p className="cl-empty">집계된 경기가 아직 없습니다.</p>
      ) : (
        <>
          <div className="cl-cphead">
            <span>챔피언</span><span className="rt">픽률</span><span className="rt">승률</span>
          </div>
          {rows.map((c) => (
            <div key={c.championId} className="cl-cp">
              <span className="cl-cpn">
                <img src={championIcon(c.championId)} alt="" loading="lazy" />
                {championName(c.championId)}
              </span>
              <span className="cl-cpv rt" title={`${c.picks}세트 픽`}>{pct(c.pickRate)}</span>
              {/* 승자는 세트 종료 약 5분 뒤 확정된다. 확정 전이면 승률이 비어 온다 */}
              <span className={`cl-cpw rt ${winClass(c.winRate)}`} title={winTitle(c)}>
                {pct(c.winRate)}
              </span>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

/** 팀별 최근 5경기 */
function RecentRecordCard({ recentForm }) {
  const teams = Object.entries(recentForm ?? {})
    .map(([code, matches]) => ({ code, matches: matches ?? [] }))
    .filter((t) => t.matches.length > 0)
    .sort((a, b) => wins(b.matches) - wins(a.matches))
    .slice(0, 5);

  return (
    <Card title="최근 전적" sub="최근 5경기">
      {teams.length === 0 ? (
        <p className="cl-empty">완료된 경기가 아직 없습니다.</p>
      ) : teams.map((t) => (
        <div key={t.code} className="cl-fm">
          <span className="cl-fmt">{t.code}</span>
          <span className="cl-fmd">
            {t.matches.slice(0, 5).map((m, i) => (
              <i
                key={`${m.startTime}-${i}`}
                className={m.outcome === 'win' ? 'w' : 'l'}
                title={`vs ${m.opponentCode ?? '?'} ${m.gameWins ?? '-'}:${m.opponentGameWins ?? '-'}`}
              >
                {m.outcome === 'win' ? '승' : '패'}
              </i>
            ))}
          </span>
          <span className="cl-fmr">
            {wins(t.matches)}승 {t.matches.length - wins(t.matches)}패
          </span>
        </div>
      ))}
    </Card>
  );
}

const wins = (matches) => matches.filter((m) => m.outcome === 'win').length;

/** 0~1 비율을 백분율로. 값이 없으면 대시 */
const pct = (ratio) => (ratio == null ? '—' : `${Math.round(ratio * 100)}%`);

const winClass = (ratio) => (ratio == null ? '' : ratio >= 0.5 ? 'hi' : 'lo');

const winTitle = (c) =>
  c.decidedPicks > 0 ? `승자 확정 ${c.decidedPicks}세트 중 ${c.wins}승` : '승자 확정 전';
