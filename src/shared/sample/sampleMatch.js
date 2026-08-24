/**
 * 시연·테스트용 샘플 경기.
 *
 * 실제 소스가 없어도 화면 전체를 움직여 보기 위한 것이다.
 * 2026-08-15 GEN vs T1(12주 차)의 적재 기록을 그대로 재생한다 — 골드·킬 추이와
 * 오브젝트 획득 시각은 그날의 실제 값이다.
 *
 * 두 가지는 실제와 다르다.
 *  - 선수 지표는 세트당 최종값 한 벌만 적재돼(V4) 시점별 재현이 불가능하다.
 *    그래서 킬·데스·어시스트만 팀 추이에 맞춰 비례 배분하고 나머지는 최종값을 쓴다.
 *  - 펜타킬 UI 를 시연하기 위해 36분 14초에 펜타킬을 넣었다. 실제로는 없었던
 *    기록이며, 팀 킬 합계와 골드도 함께 올려 앞뒤가 맞게 조정했다.
 *
 * 서버 호출이 없으므로 소스 상태와 무관하게 항상 동작한다.
 */
import data from './sampleGameData.json';

/** 시연 기준 한 세트 길이 (초) — 원본 경기 길이 그대로 */
export const SAMPLE_DURATION = data.durationSeconds;

/** 이 샘플이 쓰는 세트 식별자. 트리거 중복 방지 키에 들어간다 */
export const SAMPLE_GAME_ID = data.gameId;

/**
 * 샘플 재생이 쿠폰 트리거를 걸 경기(내부 PK).
 *
 * 백엔드 CouponTestMatch.SAMPLE_MATCH_ID 와 같아야 한다. V15 마이그레이션이 이 ID 로
 * 실제 esports_match 행을 만들어 두므로, 관리자 화면에서 "테스트 이벤트" 로 만든
 * 쿠폰 이벤트가 이 경기에 매달린다.
 *
 * 경기를 반드시 지정해서 보낸다. 경기 없이 보내면 서버가 트리거만 보고 아무 경기의
 * 이벤트나 열어 진짜 경기의 쿠폰이 풀린다.
 */
export const SAMPLE_MATCH_ID = -1;

/** 펜타킬 발생 시각. 화면에서 연출 시점을 잡는 데 쓴다 */
export const SAMPLE_PENTAKILL = data.pentakill;

export const SAMPLE_TEAMS = data.teams.map((team) => ({
  id: team.id,
  code: team.code,
  name: team.name,
  image: team.image,
}));

const TIMELINE = data.timeline;
const LAST = TIMELINE[TIMELINE.length - 1];

/** t 이하의 마지막 프레임. 프레임 간격이 10초라 그 사이 값은 직전 프레임을 유지한다 */
function frameAt(t) {
  if (t <= TIMELINE[0].t) return TIMELINE[0];
  if (t >= LAST.t) return LAST;
  let low = 0;
  let high = TIMELINE.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (TIMELINE[mid].t <= t) low = mid;
    else high = mid - 1;
  }
  return TIMELINE[low];
}

/** t 까지 획득한 오브젝트만 */
function objectivesUntil(t) {
  return data.objectives.filter((o) => o.gameTimeSeconds <= t);
}

function countObjective(t, side, type) {
  return objectivesUntil(t).filter((o) => o.side === side && o.type === type).length;
}

/** 용은 종류가 툴팁에 필요해 배열로 준다 */
function dragonsOf(t, side) {
  return objectivesUntil(t)
    .filter((o) => o.side === side && o.type === 'dragon')
    .map((o) => o.subtype)
    .filter(Boolean);
}

/**
 * 선수 지표를 t 시점으로 환산한다.
 *
 * 킬·데스·어시스트는 팀 추이가 있으므로 그 비율로 나눈다. CS·레벨·골드는
 * 최종값밖에 없어 경과 비율로 선형 추정한다 — 실제 성장 곡선과 다르지만
 * 시연에서 "값이 멈춰 있는" 것보다 자연스럽다.
 */
function playerAt(t, player, teamKillsNow, teamKillsFinal) {
  const ratio = SAMPLE_DURATION === 0 ? 1 : Math.min(1, t / SAMPLE_DURATION);
  const killRatio = teamKillsFinal === 0 ? ratio : teamKillsNow / teamKillsFinal;

  // 펜타킬 킬은 시각별로 하나씩 붙는다 — 아직 안 지난 킬은 빼둬야 순차로 오른다
  const isPentaPlayer = player.no === SAMPLE_PENTAKILL.participantNo;
  const pentaGot = isPentaPlayer
    ? SAMPLE_PENTAKILL.killTimes.filter((killAt) => killAt <= t).length
    : 0;
  const baseKills = isPentaPlayer ? player.kills - (5 - pentaGot) : player.kills;

  return {
    participantId: player.no,
    summonerName: player.name,
    championId: player.champion,
    role: player.role,
    level: Math.max(1, Math.round(player.level * ratio)),
    kills: Math.round(baseKills * killRatio),
    deaths: Math.round(player.deaths * ratio),
    assists: Math.round(player.assists * killRatio),
    creepScore: Math.round(player.creepScore * ratio),
    totalGold: Math.round(player.totalGold * ratio),
    totalGoldEarned: Math.round(player.totalGold * ratio),
    wardsPlaced: Math.round(player.wardsPlaced * ratio),
    wardsDestroyed: Math.round(player.wardsDestroyed * ratio),
    items: player.items,
    perkMetadata: player.perks,
  };
}

function teamAt(t, side) {
  const frame = frameAt(t);
  const gold = side === 'blue' ? frame.bg : frame.rg;
  const kills = side === 'blue' ? frame.bk : frame.rk;
  const finalKills = side === 'blue' ? LAST.bk : LAST.rk;
  const roster = data.players.filter((p) => p.side === side);

  return {
    totalGold: gold,
    totalKills: kills,
    towers: countObjective(t, side, 'tower'),
    inhibitors: countObjective(t, side, 'inhibitor'),
    barons: countObjective(t, side, 'baron'),
    dragons: dragonsOf(t, side),
    participants: roster.map((p) => playerAt(t, p, kills, finalKills)),
  };
}

/** /api/live/{gameId}/scoreboard 와 같은 모양 */
export function sampleScoreboard(t) {
  const blue = teamAt(t, 'blue');
  const red = teamAt(t, 'red');
  return {
    gameId: data.gameId,
    rfc460Timestamp: new Date(Date.now()).toISOString(),
    gameState: t >= SAMPLE_DURATION ? 'finished' : 'in_game',
    patchVersion: '16.16.1',
    gameTimeSeconds: Math.floor(t),
    goldDiff: blue.totalGold - red.totalGold,
    blue,
    red,
  };
}

/** /api/live/{gameId}/history 와 같은 모양 — t 까지의 추이만 준다 */
export function sampleHistory(t) {
  const points = TIMELINE
    .filter((f) => f.t <= t)
    .map((f) => ({
      gameTimeSeconds: f.t,
      goldDiff: f.bg - f.rg,
      blueGold: f.bg,
      redGold: f.rg,
      blueKills: f.bk,
      redKills: f.rk,
    }));
  return { gameId: data.gameId, points, objectives: objectivesUntil(t) };
}

/** /api/live/{gameId}/details 와 같은 모양 */
export function sampleDetails(t) {
  const blue = teamAt(t, 'blue');
  const red = teamAt(t, 'red');
  return {
    gameId: data.gameId,
    rfc460Timestamp: new Date(Date.now()).toISOString(),
    participants: [...blue.participants, ...red.participants],
  };
}
