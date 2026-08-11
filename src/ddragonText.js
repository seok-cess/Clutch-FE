/**
 * Data Dragon 설명 텍스트 정제.
 *
 * 설명은 표준 HTML 이 아니라 Riot 커스텀 태그(<attention>, <passive>, <physicalDamage> …)로 되어 있다.
 * 그대로 렌더하면 태그가 무시되어 글이 뭉개지므로, 구조 태그는 줄바꿈으로 바꾸고
 * 강조 태그는 우리 스타일 클래스가 붙은 조각으로 변환한다.
 *
 * dangerouslySetInnerHTML 을 쓰지 않기 위해 "토큰 배열"로 반환한다 —
 * 외부 데이터를 HTML 로 주입하지 않는 편이 안전하다.
 */

/** 값 강조로 취급할 태그 (숫자·능력치) */
const EMPHASIS = new Set([
  'attention', 'buffedstat', 'physicaldamage', 'magicdamage', 'truedamage',
  'healing', 'health', 'shield', 'speed', 'lifesteal', 'omnivamp',
  'attackspeed', 'scalead', 'scaleap', 'scalemana', 'gold', 'ornnbonus',
]);

/** 소제목으로 취급할 태그 */
const HEADING = new Set(['passive', 'active', 'rules', 'keywordmajor']);

/** 줄바꿈을 만드는 태그 */
const BREAK = new Set(['br', 'li']);

/** 통째로 버릴 구간 (플레이버 텍스트 등) */
const DROP = new Set(['flavortext']);

/**
 * 설명 문자열 → 토큰 배열
 * @returns {{text:string, kind:'plain'|'em'|'head'|'break'}[]}
 */
export function parseDescription(raw) {
  if (!raw) return [];

  const tokens = [];
  const stack = [];
  let dropDepth = 0;
  let buf = '';

  const flush = () => {
    if (!buf) return;
    // 연속 공백 정리 (원문에 개행·들여쓰기가 섞여 있다)
    const text = buf.replace(/\s+/g, ' ');
    if (text.trim() || tokens.length) {
      const top = stack[stack.length - 1];
      let kind = 'plain';
      if (top && EMPHASIS.has(top)) kind = 'em';
      else if (top && HEADING.has(top)) kind = 'head';
      tokens.push({ text, kind });
    }
    buf = '';
  };

  const re = /<\/?([a-zA-Z-]+)[^>]*>/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (dropDepth === 0) buf += raw.slice(last, m.index);
    last = re.lastIndex;

    const name = m[1].toLowerCase();
    const closing = m[0].startsWith('</');

    if (DROP.has(name)) {
      if (closing) dropDepth = Math.max(0, dropDepth - 1);
      else { flush(); dropDepth++; }
      continue;
    }
    if (dropDepth > 0) continue;

    if (BREAK.has(name)) {
      flush();
      if (tokens.length && tokens[tokens.length - 1].kind !== 'break') {
        tokens.push({ text: '', kind: 'break' });
      }
      continue;
    }

    flush();
    if (closing) {
      const i = stack.lastIndexOf(name);
      if (i >= 0) stack.splice(i, 1);
    } else {
      // 소제목 앞에는 줄바꿈을 넣어 문단이 붙지 않게
      if (HEADING.has(name) && tokens.length && tokens[tokens.length - 1].kind !== 'break') {
        tokens.push({ text: '', kind: 'break' });
      }
      stack.push(name);
    }
  }
  if (dropDepth === 0) buf += raw.slice(last);
  flush();

  // 앞뒤 빈 줄 제거
  while (tokens.length && (tokens[0].kind === 'break' || !tokens[0].text.trim())) tokens.shift();
  while (tokens.length && (tokens.at(-1).kind === 'break' || !tokens.at(-1).text.trim())) tokens.pop();

  return tokens;
}

/** 태그를 모두 제거한 순수 텍스트 (한 줄 요약용) */
export function stripTags(raw) {
  if (!raw) return '';
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
