/**
 * 시연·테스트용 더미 경기 데이터.
 *
 * 실제 소스가 없어도 화면 전체를 움직여 보기 위한 것이다.
 * 저장된 과거 경기로는 골드·킬만 시점별로 재생할 수 있고 선수 기록은
 * 최종값 한 벌뿐이라(게임당 10행) 시점별 재현이 불가능하다.
 * 그래서 여기서는 모든 지표를 경과 시간의 함수로 생성한다.
 *
 * 서버 호출이 없으므로 소스 상태와 무관하게 항상 동작한다.
 */

/** 시연 기준 한 세트 길이 (초) */
export const SAMPLE_DURATION = 30 * 60;

const BLUE_TEAM_ID = 'sample-blue';
const RED_TEAM_ID = 'sample-red';

export const SAMPLE_TEAMS = [
  { id: BLUE_TEAM_ID, code: 'BLU', name: 'Sample Blue', image: null },
  { id: RED_TEAM_ID, code: 'RED', name: 'Sample Red', image: null },
];

/** 선수 5명 — 라인별 성장 속도가 다르게 보이도록 계수를 다르게 둔다 */
const ROSTER = {
  blue: [
    { no: 1, name: 'BLU Top', champ: 'Rumble', role: 'top', csRate: 7.4, killShare: 0.18 },
    { no: 2, name: 'BLU Jgl', champ: 'XinZhao', role: 'jungle', csRate: 5.1, killShare: 0.22 },
    { no: 3, name: 'BLU Mid', champ: 'Ryze', role: 'mid', csRate: 8.2, killShare: 0.26 },
    { no: 4, name: 'BLU Bot', champ: 'Jhin', role: 'bottom', csRate: 9.1, killShare: 0.28 },
    { no: 5, name: 'BLU Sup', champ: 'Pantheon', role: 'support', csRate: 1.2, killShare: 0.06 },
  ],
  red: [
    { no: 6, name: 'RED Top', champ: 'Ambessa', role: 'top', csRate: 7.1, killShare: 0.19 },
    { no: 7, name: 'RED Jgl', champ: 'JarvanIV', role: 'jungle', csRate: 4.9, killShare: 0.21 },
    { no: 8, name: 'RED Mid', champ: 'Ryze', role: 'mid', csRate: 8.0, killShare: 0.25 },
    { no: 9, name: 'RED Bot', champ: 'Ezreal', role: 'bottom', csRate: 8.8, killShare: 0.29 },
    { no: 10, name: 'RED Sup', champ: 'Pantheon', role: 'support', csRate: 1.1, killShare: 0.06 },
  ],
};

/**
 * 아이템·룬은 Data Dragon 실제 id 를 쓴다 — 그래야 아이콘이 CDN 에서 뜬다.
 * 라인별로 실제로 갈 법한 구성을 골라 시연이 그럴듯해 보이게 한다.
 */
const ITEM_BUILDS = {
  top:      [3068, 3075, 3047, 3065, 3193, 1054],
  jungle:   [6692, 3142, 3179, 3111, 6333, 2055],
  mid:      [6655, 3157, 4645, 3020, 3089, 2003],
  bottom:   [6672, 3094, 3033, 3006, 3072, 2003],
  support:  [3860, 3222, 3011, 3107, 4643, 2055],
};

/** 룬 — 첫 값이 키스톤 */
const PERK_SETS = {
  top:      [8010, 9111, 9104, 8014, 8446, 8451],
  jungle:   [8010, 9111, 9105, 8299, 8143, 8135],
  mid:      [8112, 8126, 8138, 8106, 8009, 9103],
  bottom:   [8008, 9111, 9104, 8014, 8009, 9103],
  support:  [8465, 8463, 8473, 8242, 8306, 8316],
};

/** 0~1 사이를 오가는 결정적 흔들림 — 매번 같은 그래프가 나와야 시연이 재현된다 */
function wobble(t, seed) {
  return Math.sin(t / 190 + seed) * 0.5 + Math.sin(t / 71 + seed * 2) * 0.25;
}

/** 경과 t 초 시점의 팀 총 골드 */
function goldAt(t, side) {
  const base = 2500 + t * 13.2;              // 시간에 비례한 기본 수급
  const lead = side === 'blue' ? 1 : -1;
  // 초반 균형 → 중반 블루 리드 → 후반 좁혀짐
  const swing = Math.sin((t / SAMPLE_DURATION) * Math.PI) * 3200;
  return Math.round(base + lead * (swing * 0.5 + wobble(t, 1.3) * 900));
}

/** 경과 t 초 시점의 팀 킬 — 단조 증가여야 한다 (되돌아가면 안 된다) */
function killsAt(t, side) {
  if (t <= 0) return 0;               // 시작 시점은 반드시 0:0
  const pace = side === 'blue' ? 0.0092 : 0.0074;
  const seed = side === 'blue' ? 0 : 2;
  // 초반 흔들림이 음수로 튀지 않도록 t 에 비례해 서서히 키운다
  const jitter = Math.sin(t / 240 + seed) * 1.4 * Math.min(1, t / 300);
  return Math.max(0, Math.floor(t * pace + jitter));
}

/** 오브젝트는 시각이 고정이어야 그래프 마커가 흔들리지 않는다 */
const OBJECTIVES = [
  { gameTimeSeconds: 312, side: 'blue', type: 'dragon', subtype: 'ocean' },
  { gameTimeSeconds: 428, side: 'red', type: 'tower', subtype: null },
  { gameTimeSeconds: 655, side: 'blue', type: 'tower', subtype: null },
  { gameTimeSeconds: 902, side: 'blue', type: 'dragon', subtype: 'infernal' },
  { gameTimeSeconds: 1130, side: 'red', type: 'dragon', subtype: 'mountain' },
  { gameTimeSeconds: 1245, side: 'blue', type: 'baron', subtype: null },
  { gameTimeSeconds: 1310, side: 'blue', type: 'tower', subtype: null },
  { gameTimeSeconds: 1495, side: 'red', type: 'tower', subtype: null },
  { gameTimeSeconds: 1620, side: 'blue', type: 'dragon', subtype: 'cloud' },
  { gameTimeSeconds: 1702, side: 'blue', type: 'inhibitor', subtype: null },
];

/** t 초까지 발생한 오브젝트만 */
function objectivesUntil(t) {
  return OBJECTIVES.filter((o) => o.gameTimeSeconds <= t);
}

function countObj(t, side, type) {
  return objectivesUntil(t).filter((o) => o.side === side && o.type === type).length;
}

function dragonsOf(t, side) {
  return objectivesUntil(t)
    .filter((o) => o.side === side && o.type === 'dragon')
    .map((o) => o.subtype);
}

/** 한 선수의 t 초 시점 기록 */
function playerAt(t, p, side, teamKills) {
  const min = t / 60;
  const kills = Math.floor(teamKills * p.killShare);
  const deaths = Math.max(0, Math.floor(min * 0.11 + wobble(t, p.no) * 0.8));
  const assists = Math.floor(teamKills * 0.42);
  const gold = Math.round(500 + min * (280 + p.csRate * 22));

  // 아이템은 골드에 비례해 하나씩 늘어난다 — 6칸을 채우면 완성
  const itemCount = Math.min(6, Math.floor(gold / 2600));
  // 룬은 게임 시작 시 확정이므로 시간과 무관하게 전부 보여준다
  const perks = PERK_SETS[p.role] ?? [];

  return {
    participantId: p.no,
    summonerName: p.name,
    championId: p.champ,
    role: p.role,
    level: Math.min(18, Math.max(1, Math.floor(1 + min * 0.55))),
    kills,
    deaths,
    assists,
    creepScore: Math.floor(min * p.csRate),
    totalGold: gold,
    currentHealth: null,
    maxHealth: null,

    // ---- DetailsTable 이 쓰는 상세 지표 ----
    totalGoldEarned: gold,
    // 딜 지분·킬 관여는 0~1 비율 (화면에서 % 로 환산한다)
    championDamageShare: Math.min(0.42, p.killShare * 0.9 + wobble(t, p.no) * 0.03),
    killParticipation: teamKills === 0 ? 0
      : Math.min(0.95, (kills + assists) / Math.max(1, teamKills)),
    wardsPlaced: Math.floor(min * (p.role === 'support' ? 1.15 : 0.32)),
    wardsDestroyed: Math.floor(min * (p.role === 'support' ? 0.34 : 0.09)),
    items: (ITEM_BUILDS[p.role] ?? []).slice(0, itemCount),
    perks,
  };
}

function teamAt(t, side) {
  const gold = goldAt(t, side);
  const kills = killsAt(t, side);
  return {
    esportsTeamId: side === 'blue' ? BLUE_TEAM_ID : RED_TEAM_ID,
    totalGold: gold,
    totalKills: kills,
    towers: countObj(t, side, 'tower'),
    inhibitors: countObj(t, side, 'inhibitor'),
    barons: countObj(t, side, 'baron'),
    dragons: dragonsOf(t, side),
    participants: ROSTER[side].map((p) => playerAt(t, p, side, kills)),
  };
}

/** /api/live/{gameId}/scoreboard 와 같은 모양 */
export function sampleScoreboard(t) {
  const blue = teamAt(t, 'blue');
  const red = teamAt(t, 'red');
  return {
    gameId: 'sample-game',
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
export function sampleHistory(t, stepSeconds = 10) {
  const points = [];
  for (let s = 0; s <= t; s += stepSeconds) {
    const bg = goldAt(s, 'blue');
    const rg = goldAt(s, 'red');
    points.push({
      gameTimeSeconds: s,
      goldDiff: bg - rg,
      blueGold: bg,
      redGold: rg,
      blueKills: killsAt(s, 'blue'),
      redKills: killsAt(s, 'red'),
    });
  }
  return { gameId: 'sample-game', points, objectives: objectivesUntil(t) };
}

/** /api/live/{gameId}/details 와 같은 모양 */
export function sampleDetails(t) {
  const blue = teamAt(t, 'blue');
  const red = teamAt(t, 'red');
  return {
    gameId: 'sample-game',
    rfc460Timestamp: new Date(Date.now()).toISOString(),
    participants: [...blue.participants, ...red.participants],
  };
}
