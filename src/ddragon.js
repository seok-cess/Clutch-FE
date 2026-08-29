/**
 * Data Dragon (Riot 공식 정적 데이터) 연동.
 *
 * livestats 는 아이템·룬·챔피언을 ID 로만 주므로, 이름과 아이콘은 여기서 가져온다.
 * 버전·이름 데이터는 앱 구동 중 바뀌지 않으므로 한 번만 받아 메모리에 둔다.
 * CDN 이 죽어도 화면은 ID 표시로 degrade 되게 설계했다 (throw 하지 않음).
 */

const BASE = 'https://ddragon.leagueoflegends.com';
const LOCALE = 'ko_KR';
/** CDN 접근 실패 시 사용할 버전 (2026-08 기준 확인값) */
const FALLBACK_VERSION = '16.15.1';

let version = FALLBACK_VERSION;
let itemMeta = {};    // id → { name, description, gold }
let runeMeta = {};    // id → { name, icon, longDesc }
let champMeta = {};   // id("Aatrox") 와 숫자키 둘 다 → 한글 이름
let ready = false;

/** 스탯 샤드는 runesReforged.json 에 없어 별도 매핑 (2026-08 실호출로 아이콘 경로 확인) */
const STAT_SHARDS = {
  5001: { name: '체력', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png' },
  5002: { name: '방어력', icon: 'perk-images/StatMods/StatModsArmorIcon.png' },
  5003: { name: '마법 저항력', icon: 'perk-images/StatMods/StatModsMagicResIcon.png' },
  5005: { name: '공격 속도', icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png' },
  5007: { name: '스킬 가속', icon: 'perk-images/StatMods/StatModsCDRScalingIcon.png' },
  5008: { name: '적응형 능력치', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
  5010: { name: '이동 속도', icon: 'perk-images/StatMods/StatModsMovementSpeedIcon.png' },
  5011: { name: '체력', icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png' },
  5013: { name: '강인함', icon: 'perk-images/StatMods/StatModsTenacityIcon.png' },
};

/**
 * 용 종류 한글명 — 피드가 영문 키로만 준다 (chemtech, ocean …).
 * Data Dragon 에 대응 데이터가 없어 직접 매핑한다.
 */
const DRAGON_INFO = {
  infernal: { name: '화염 드래곤', desc: '공격력·주문력 증가' },
  ocean: { name: '바다 드래곤', desc: '체력·마나 회복 증가' },
  mountain: { name: '대지 드래곤', desc: '방어력·마법 저항력 증가' },
  cloud: { name: '바람 드래곤', desc: '이동 속도·스킬 가속 증가' },
  hextech: { name: '마법공학 드래곤', desc: '공격 속도·스킬 가속 증가' },
  chemtech: { name: '화학공학 드래곤', desc: '체력이 낮을수록 피해 증가' },
  elder: { name: '장로 드래곤', desc: '일정 시간 강력한 처형 효과' },
};

export const dragonName = (key) => DRAGON_INFO[key?.toLowerCase()]?.name ?? key ?? '드래곤';
export const dragonDesc = (key) => DRAGON_INFO[key?.toLowerCase()]?.desc ?? '';

/**
 * 용 종류별 아이콘 — public/icons 에 직접 넣은 파일을 쓴다.
 * Data Dragon 에는 용 아이콘이 없고 소스도 이미지를 주지 않는다.
 * 파일명이 한글이라 encodeURI 로 감싸야 경로가 깨지지 않는다.
 */
const DRAGON_ICON_FILE = {
  infernal: '화염용',
  ocean: '바다용',
  mountain: '대지용',
  cloud: '바람용',
  hextech: '마공용',
  chemtech: '화공용',
  elder: '장로용',
};

/** @return 아이콘 경로. 모르는 키면 null — 호출부가 글자로 대체한다 */
export function dragonIcon(key) {
  const file = DRAGON_ICON_FILE[key?.toLowerCase()];
  return file ? encodeURI(`/icons/${file}.png`) : null;
}

/** 용 외 오브젝트 아이콘 (타워·억제기는 아직 파일이 없어 글자로 남는다) */
const OBJ_ICON_FILE = {
  baron: '바론',
};

/**
 * 오브젝트 아이콘 경로.
 * 용은 종류(subtype)로, 나머지는 타입으로 찾는다.
 */
export function objectiveIcon(type, subtype) {
  if (type === 'dragon') return dragonIcon(subtype);
  const file = OBJ_ICON_FILE[type];
  return file ? encodeURI(`/icons/${file}.png`) : null;
}

/** 앱 시작 시 1회 호출. 실패해도 조용히 ID 표시로 동작한다. */
export async function initDDragon() {
  if (ready) return;
  try {
    const vs = await fetch(`${BASE}/api/versions.json`).then((r) => r.json());
    if (Array.isArray(vs) && vs[0]) version = vs[0];
  } catch {
    // 버전 조회 실패 — fallback 버전으로 계속 진행
  }

  const [items, runes, champions] = await Promise.allSettled([
    fetch(`${BASE}/cdn/${version}/data/${LOCALE}/item.json`).then((r) => r.json()),
    fetch(`${BASE}/cdn/${version}/data/${LOCALE}/runesReforged.json`).then((r) => r.json()),
    fetch(`${BASE}/cdn/${version}/data/${LOCALE}/champion.json`).then((r) => r.json()),
  ]);

  if (items.status === 'fulfilled' && items.value?.data) {
    for (const [id, v] of Object.entries(items.value.data)) {
      itemMeta[id] = { name: v.name, description: v.description, gold: v.gold?.total };
    }
  }
  if (runes.status === 'fulfilled' && Array.isArray(runes.value)) {
    for (const tree of runes.value) {
      runeMeta[tree.id] = { name: tree.name, icon: tree.icon, longDesc: null };
      for (const slot of tree.slots ?? []) {
        for (const r of slot.runes ?? []) {
          runeMeta[r.id] = { name: r.name, icon: r.icon, longDesc: r.longDesc };
        }
      }
    }
  }
  if (champions.status === 'fulfilled' && champions.value?.data) {
    // 소스가 챔피언을 문자열 id("Aatrox")로 주지만 숫자 키로 오는 경로도 있어 둘 다 담는다.
    for (const [id, v] of Object.entries(champions.value.data)) {
      champMeta[id] = v.name;
      if (v.key) champMeta[String(v.key)] = v.name;
    }
  }
  ready = true;
}

export const itemIcon = (id) => `${BASE}/cdn/${version}/img/item/${id}.png`;
export const itemName = (id) => itemMeta[String(id)]?.name ?? `아이템 ${id}`;
/** 아이템 설명 원문 (Riot 커스텀 태그 포함 — ddragonText.parseDescription 으로 정제) */
export const itemDescription = (id) => itemMeta[String(id)]?.description ?? '';
/** 총 구매가 (골드) */
export const itemGold = (id) => itemMeta[String(id)]?.gold ?? null;

export const championIcon = (championId) =>
  `${BASE}/cdn/${version}/img/champion/${championId}.png`;

/** 챔피언 한글명. CDN 을 못 받았으면 영문 id 로 degrade 된다 */
export const championName = (championId) =>
  champMeta[String(championId)] ?? championId ?? '';

/** 룬(키스톤·일반·트리) 또는 스탯 샤드의 아이콘 URL. 알 수 없으면 null */
export function runeIcon(id) {
  const meta = runeMeta[id] ?? STAT_SHARDS[id];
  return meta ? `${BASE}/cdn/img/${meta.icon}` : null;
}

export function runeName(id) {
  const meta = runeMeta[id] ?? STAT_SHARDS[id];
  return meta?.name ?? `룬 ${id}`;
}

/** 룬 설명 원문. 스탯 샤드는 설명이 없어 빈 문자열 */
export function runeDescription(id) {
  return runeMeta[id]?.longDesc ?? '';
}
