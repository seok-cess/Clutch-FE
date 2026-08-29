import { useRef, useState } from 'react';
import { InhibitorIcon, TowerIcon } from './icons.jsx';
import { championIcon, championName, dragonName, dragonDesc, dragonIcon } from '../ddragon.js';
import IconTip from './IconTip.jsx';

/**
 * 인게임 스코어보드 (라이브/과거 공용).
 * board = /api/live/{gameId}/scoreboard 응답
 */
export default function Scoreboard({ board, teams, objectives }) {
  const { blue, red, goldDiff } = board;

  // 진영별 용 획득 시각 (획득 순서대로) — dragons 배열과 순서가 대응한다
  const dragonTimes = (side) =>
    (objectives ?? [])
      .filter((o) => o.type === 'dragon' && o.side === side)
      .map((o) => o.gameTimeSeconds);

  // esportsTeamId 로 진영을 판별 (팀 순서가 곧 블루/레드는 아니다)
  const findTeam = (esportsTeamId) =>
    (teams ?? []).find((t) => t.id && esportsTeamId && String(t.id) === String(esportsTeamId));
  const blueTeam = findTeam(blue?.esportsTeamId);
  const redTeam = findTeam(red?.esportsTeamId);
  const totalGold = (blue?.totalGold ?? 0) + (red?.totalGold ?? 0);
  const bluePct = totalGold > 0 ? ((blue?.totalGold ?? 0) / totalGold) * 100 : 50;

  return (
    <div className="scoreboard">
      <div className="objectives-row">
        <TeamObjectives team={blue} side="blue" dragonTimes={dragonTimes('blue')} />
        <div className="gold-diff">
          <div className="kills">
            {blueTeam?.image && (
              <img src={blueTeam.image} alt={blueTeam.name} title={blueTeam.name} className="score-logo" />
            )}
            <b className="blue-text">{blue?.totalKills ?? 0}</b>
            <span className="sep">:</span>
            <b className="red-text">{red?.totalKills ?? 0}</b>
            {redTeam?.image && (
              <img src={redTeam.image} alt={redTeam.name} title={redTeam.name} className="score-logo" />
            )}
          </div>
          <div className="gold-bar">
            <div className="gold-bar-blue" style={{ width: `${bluePct}%` }} />
          </div>
          {/* 부호 대신 색으로 우세 팀을 표시 — 항상 +N 형태 */}
          <div className={`gold-diff-label ${goldDiff > 0 ? 'lead-blue' : goldDiff < 0 ? 'lead-red' : ''}`}>
            +{Math.abs(goldDiff ?? 0).toLocaleString()}
            <span className="muted"> GOLD</span>
          </div>
        </div>
        <TeamObjectives team={red} side="red" dragonTimes={dragonTimes('red')} />
      </div>

      <div className="players-grid">
        <PlayerTable team={blue} side="blue" />
        <PlayerTable team={red} side="red" />
      </div>
    </div>
  );
}

/** 초 → "11:01" */
function fmtClock(sec) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

/**
 * 드래곤 개수 아이콘 하나 — 호버하면 획득한 용 전체가 목록으로 뜬다.
 * 용마다 아이콘을 늘어놓으면 개수가 늘수록 줄이 길어져 아이콘 하나로 모았다.
 */
function DragonList({ dragons, times }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);

  const show = () => {
    const el = ref.current;
    if (!el || !dragons.length) return;
    const r = el.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.bottom });
  };

  return (
    <span
      ref={ref}
      className="obj dragon-obj"
      title="드래곤"
      tabIndex={dragons.length ? 0 : -1}
      onMouseEnter={show}
      onMouseLeave={() => setTip(null)}
      onFocus={show}
      onBlur={() => setTip(null)}
    >
      <span className="obj-mask dragon" aria-hidden="true" />
      <b>{dragons.length}</b>

      {tip && (
        <span className="dragon-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          {dragons.map((d, i) => (
            <span key={i} className="dragon-row">
              {times?.[i] != null && <b className="dragon-time">{fmtClock(times[i])}</b>}
              {dragonIcon(d) && (
                <img
                  src={dragonIcon(d)}
                  alt=""
                  className="dragon-ico"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <span className="dragon-name">{dragonName(d)}</span>
              <span className="dragon-desc">{dragonDesc(d)}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function TeamObjectives({ team, side, dragonTimes }) {
  if (!team) return <div className={`objectives ${side}`} />;
  return (
    <div className={`objectives ${side}`}>
      <span className="obj" title="타워"><TowerIcon /><b>{team.towers ?? 0}</b></span>
      <span className="obj" title="억제기"><InhibitorIcon /><b>{team.inhibitors ?? 0}</b></span>
      <span className="obj" title="바론"><span className="obj-mask baron" aria-hidden="true" /><b>{team.barons ?? 0}</b></span>

      {/* 드래곤 — 아이콘 하나에 올리면 획득한 용 전체가 목록으로 뜬다 */}
      <DragonList dragons={team.dragons ?? []} times={dragonTimes} />
    </div>
  );
}

/**
 * 선수 테이블. 레드팀은 열 순서를 뒤집어 선수명이 바깥쪽(우측)에 오게 한다
 * — 좌우 두 테이블이 가운데를 기준으로 대칭이 되어 비교가 쉬워진다.
 */
function PlayerTable({ team, side }) {
  if (!team) return null;

  const columns = [
    {
      key: 'player',
      label: 'PLAYER',
      // 챔피언 아이콘을 선수명과 한 셀에 — 별도 열을 두면 헤더가 잘린다
      cell: (p) => (
        <span className="player-cell">
          {p.championId && (
            <IconTip label={championName(p.championId)}>
              <img
                src={championIcon(p.championId)}
                alt={championName(p.championId)}
                className="champ-icon"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </IconTip>
          )}
          <span className="player-nick">{p.summonerName ?? `#${p.participantId}`}</span>
        </span>
      ),
    },
    { key: 'level', label: 'LV', cell: (p) => p.level ?? '-' },
    { key: 'kda', label: 'K/D/A', cell: (p) => `${p.kills ?? 0}/${p.deaths ?? 0}/${p.assists ?? 0}` },
    { key: 'cs', label: 'CS', cell: (p) => p.creepScore ?? '-' },
    { key: 'gold', label: 'GOLD', cell: (p) => (p.totalGold != null ? p.totalGold.toLocaleString() : '-') },
  ];
  const ordered = side === 'red' ? [...columns].reverse() : columns;

  return (
    <div className="table-scroll">
      <table className={`player-table ${side}`}>
        <thead>
          <tr>
            {ordered.map((c) => (
              <th key={c.key} className={`col-${c.key}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(team.participants ?? []).map((p) => (
            <tr key={p.participantId}>
              {ordered.map((c) => (
                <td key={c.key} className={`col-${c.key}`}>{c.cell(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
