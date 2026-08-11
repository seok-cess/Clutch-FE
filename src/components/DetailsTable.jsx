import {
  itemIcon, itemName, itemDescription, itemGold,
  runeIcon, runeName, runeDescription, championIcon,
} from '../ddragon.js';
import IconTip from './IconTip.jsx';

const pct = (v) => (v == null ? '-' : `${(v * 100).toFixed(1)}%`);

/** 아이템 아이콘 목록. 이름은 호버 툴팁으로 */
function Items({ ids }) {
  if (!ids?.length) return <span className="muted">-</span>;
  return (
    <span className="icon-row">
      {ids.filter(Boolean).map((id, i) => (
        <IconTip
          key={`${id}-${i}`}
          label={itemName(id)}
          sub={itemGold(id) ? `${itemGold(id).toLocaleString()} G` : `ID ${id}`}
          description={itemDescription(id)}
        >
          <img
            src={itemIcon(id)}
            alt={itemName(id)}
            className="item-icon"
            loading="lazy"
            // CDN 실패 시 아이콘만 숨기고 표는 유지
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </IconTip>
      ))}
    </span>
  );
}

/** 룬 아이콘 목록 (키스톤 → 일반 → 스탯 샤드 순으로 API 가 준 순서 유지) */
function Perks({ ids }) {
  if (!ids?.length) return <span className="muted">-</span>;
  return (
    <span className="icon-row">
      {ids.map((id, i) => {
        const src = runeIcon(id);
        if (!src) return null;
        return (
          <IconTip
            key={`${id}-${i}`}
            label={runeName(id)}
            sub={i === 0 ? '키스톤' : undefined}
            description={runeDescription(id)}
          >
            <img
              src={src}
              alt={runeName(id)}
              className={`rune-icon ${i === 0 ? 'keystone' : ''}`}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </IconTip>
        );
      })}
    </span>
  );
}

/**
 * /api/live/{gameId}/details 의 모든 필드를 표시.
 * 아이템·룬은 Data Dragon 아이콘으로 렌더링하고, 이름은 툴팁으로 제공한다.
 */
export default function DetailsTable({ details }) {
  const rows = details.participants ?? [];
  if (!rows.length) return null;

  return (
    <div className="details-block">
      <span className="kicker">PLAYER TELEMETRY</span>
      <h3>선수 상세 <span className="muted">딜지분 · 와드 · 아이템</span></h3>
      <div className="table-scroll">
        <table className="details-table">
          <thead>
            <tr>
              <th className="c-id">ID</th>
              <th className="c-player">PLAYER</th>
              <th className="c-dmg">DMG %</th>
              <th className="c-kp">KP %</th>
              <th className="c-wardp">WARD +</th>
              <th className="c-wardm">WARD −</th>
              <th className="c-gold">GOLD</th>
              <th className="c-items">ITEMS</th>
              <th className="c-perks">PERKS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.participantId} className={p.participantId <= 5 ? 'row-blue' : 'row-red'}>
                <td className="c-id">{p.participantId}</td>
                <td className="player-name c-player">
                  <span className="player-cell">
                    {p.championId && (
                      <IconTip label={p.championId}>
                        <img
                          src={championIcon(p.championId)}
                          alt={p.championId}
                          className="champ-icon"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </IconTip>
                    )}
                    <span className="player-nick">{p.summonerName ?? '-'}</span>
                  </span>
                </td>
                <td className="c-dmg">{pct(p.championDamageShare)}</td>
                <td className="c-kp">{pct(p.killParticipation)}</td>
                <td className="c-wardp">{p.wardsPlaced ?? '-'}</td>
                <td className="c-wardm">{p.wardsDestroyed ?? '-'}</td>
                <td className="c-gold">{p.totalGoldEarned != null ? p.totalGoldEarned.toLocaleString() : '-'}</td>
                <td className="id-list c-items"><Items ids={p.items} /></td>
                <td className="id-list c-perks"><Perks ids={p.perks} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
