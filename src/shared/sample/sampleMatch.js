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

/**
 * 첫 킬이 나는 프레임과 그 시점의 팀별 킬.
 *
 * 원본 프레임은 10초 간격이라, 그 사이에 난 킬은 한 프레임에 뭉쳐 들어온다.
 * 이 경기는 첫 한타가 그래서 0킬에서 곧장 3킬(blue 2 / red 1)로 뛴다.
 * 데이터는 정확하지만 시연에서는 첫 킬이 순간적으로 지나가 보이지 않는다.
 */
const FIRST_BLOOD_FRAME = (() => {
  let previous = null;
  for (const frame of TIMELINE) {
    const total = frame.bk + frame.rk;
    if (total > 0) {
      return {
        at: frame.t,
        from: previous ? previous.t : 0,
        blue: frame.bk,
        red: frame.rk,
        total,
      };
    }
    previous = frame;
  }
  return null;
})();

/**
 * 뭉친 첫 한타를 프레임 간격 안에 고르게 펼친 킬 시각.
 *
 * 원본이 한 프레임에 3킬을 주면 그 10초 구간에 3등분해 배치한다. 마지막 킬은
 * 원본 프레임 시각에 그대로 두어, 이 구간이 끝나면 원본과 값이 다시 일치한다.
 * 총 킬 수와 팀별 배분은 바꾸지 않는다 — 보이는 순서만 편다.
 */
const FIRST_BLOOD_KILLS = (() => {
  if (!FIRST_BLOOD_FRAME || FIRST_BLOOD_FRAME.total <= 1) return [];

  const { at, from, blue, red, total } = FIRST_BLOOD_FRAME;
  const span = at - from;
  const step = span / total;

  // 레드가 먼저 잡고 블루가 이어받는 순서로 둔다. 어느 쪽이 먼저였는지는
  // 프레임 집계에 남지 않으므로, 양 팀이 번갈아 오르는 편이 자연스럽다
  const sides = [];
  for (let i = 0; i < Math.max(blue, red); i += 1) {
    if (i < red) sides.push('red');
    if (i < blue) sides.push('blue');
  }

  return sides.map((side, index) => ({
    side,
    // 마지막 킬은 원본 프레임 시각에 정확히 맞춘다
    at: index === sides.length - 1
      ? at
      : Math.round(from + step * (index + 1)),
  }));
})();

/** t 까지 난 펜타킬 킬 수. 펜타킬 선수의 팀에만 더한다 */
function pentakillKillsAt(t, side) {
  const player = data.players.find(
    (p) => p.no === SAMPLE_PENTAKILL.participantNo,
  );
  if (!player || player.side !== side) return 0;
  return SAMPLE_PENTAKILL.killTimes.filter((killAt) => killAt <= t).length;
}

/** t 시점에 첫 한타에서 이미 난 킬을 팀별로 센다 */
function firstBloodKillsAt(t) {
  if (FIRST_BLOOD_KILLS.length === 0) return null;
  if (t >= FIRST_BLOOD_FRAME.at) return null;

  let blue = 0;
  let red = 0;
  for (const kill of FIRST_BLOOD_KILLS) {
    if (kill.at > t) break;
    if (kill.side === 'blue') blue += 1;
    else red += 1;
  }
  return { blue, red };
}

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

  /*
   * 펜타킬 선수는 "평소 킬" 만 비례 배분하고 펜타킬 5킬은 그대로 얹는다.
   *
   * 평소 킬까지 그대로 두면 경기 시작 시점에 이미 7킬을 들고 있는 것으로 보여,
   * 서버가 첫 킬을 "이미 지나간 사건" 으로 판정해 버린다. 반대로 펜타킬 5킬까지
   * 비율로 깎으면 반올림에 5킬이 4킬로 줄어 30초 창 안에 들어오지 않는다.
   *
   * 그래서 둘을 나눈다 — 평소 킬은 팀 추이를 따르고, 펜타킬 킬은 killTimes 가
   * 지난 개수만큼 온전히 더한다.
   */
  if (isPentaPlayer) {
    const ordinaryKills = Math.max(0, player.kills - 5);
    return {
      ...playerBase(t, player, ratio),
      kills: Math.round(ordinaryKills * killRatio) + pentaGot,
      assists: Math.round(player.assists * killRatio),
    };
  }

  return {
    ...playerBase(t, player, ratio),
    kills: Math.round(baseKills * killRatio),
    assists: Math.round(player.assists * killRatio),
  };
}

/** 킬·어시스트를 뺀 나머지 지표. 경과 비율로 선형 추정한다 */
function playerBase(t, player, ratio) {
  return {
    participantId: player.no,
    summonerName: player.name,
    championId: player.champion,
    role: player.role,
    level: Math.max(1, Math.round(player.level * ratio)),
    deaths: Math.round(player.deaths * ratio),
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
  const finalKills = side === 'blue' ? LAST.bk : LAST.rk;
  const roster = data.players.filter((p) => p.side === side);

  // 첫 한타 구간에서는 뭉친 킬 대신 펼친 값을 쓴다 (구간이 끝나면 원본과 같다)
  const spread = firstBloodKillsAt(t);
  const baseKills = spread
    ? (side === 'blue' ? spread.blue : spread.red)
    : (side === 'blue' ? frame.bk : frame.rk);

  /*
   * 주입한 펜타킬은 팀 누적 킬에도 함께 얹는다.
   *
   * 이 경기에는 원래 펜타킬이 없어 시연용으로 넣었는데, 원본 팀킬 추이는 그대로다.
   * 실제로 그 20초 동안 팀킬은 2 밖에 오르지 않아, 선수 킬만 5 올리면 참가자 합이
   * 팀킬을 넘어 정합을 맞추는 과정에서 도로 깎인다 — 감지기의 30초 창에 5킬이
   * 들어오지 않는다. 팀킬도 같이 올려야 앞뒤가 맞는다.
   */
  const kills = baseKills + pentakillKillsAt(t, side);

  return {
    totalGold: gold,
    totalKills: kills,
    towers: countObjective(t, side, 'tower'),
    inhibitors: countObjective(t, side, 'inhibitor'),
    barons: countObjective(t, side, 'baron'),
    dragons: dragonsOf(t, side),
    participants: reconcileKills(
      roster.map((p) => playerAt(t, p, kills, finalKills)),
      kills,
    ),
  };
}

/**
 * 참가자 킬의 합을 팀 누적 킬과 정확히 맞춘다.
 *
 * 참가자별 킬은 최종값을 팀 추이 비율로 나눈 뒤 반올림한 값이라, 합이 팀 킬과
 * 어긋난다. 특히 팀이 이제 막 1킬을 올린 시점에는 모두 0 으로 반올림돼 첫 킬이
 * 사라진다 — 서버는 참가자 킬을 합해 판정하므로 그만큼 트리거가 늦어진다.
 *
 * 모자라면 최종 킬이 많은 선수부터 하나씩 채우고, 넘치면 적은 선수부터 덜어낸다.
 */
function reconcileKills(participants, teamKills) {
  const total = participants.reduce((sum, p) => sum + p.kills, 0);
  if (total === teamKills) return participants;

  const adjusted = participants.map((p) => ({ ...p }));
  const order = adjusted
    .map((p, index) => index)
    .sort((a, b) => adjusted[b].kills - adjusted[a].kills);

  let diff = teamKills - total;
  // 한 바퀴로 못 맞추면 여러 바퀴 돈다. 킬이 0 밑으로 내려가지는 않는다
  while (diff !== 0) {
    let changed = false;
    for (const index of order) {
      if (diff === 0) break;
      if (diff > 0) {
        adjusted[index].kills += 1;
        diff -= 1;
        changed = true;
      } else if (adjusted[index].kills > 0) {
        adjusted[index].kills -= 1;
        diff += 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return adjusted;
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

/**
 * 서버 감지기에 보낼 프레임 한 장 (POST /api/v1/test/sample-frames 의 body).
 *
 * 트리거를 지목하지 않고 참가자별 누적 킬만 담는다. 무슨 사건인지는 서버가
 * 판단하므로, 트리거가 늘어도 이 함수는 그대로다.
 */
export function sampleFramePayload(t) {
  return {
    gameId: data.gameId,
    gameTimeSeconds: Math.floor(t),
    blue: killsOf(t, 'blue'),
    red: killsOf(t, 'red'),
  };
}

/** 한 팀의 참가자별 누적 킬 */
function killsOf(t, side) {
  return teamAt(t, side).participants.map((participant) => ({
    participantId: participant.participantId,
    kills: participant.kills,
  }));
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
