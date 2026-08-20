import { requestJson } from './client.js';

/** replay 스텁 서버에 새 테스트 경기 재생을 요청한다. */
export const startReplay = () => requestJson('/api/replay/start', {
  method: 'POST',
  fallbackMessage: '테스트 경기 재생을 시작하지 못했습니다. replay 서버 실행 상태를 확인해 주세요.',
});

/** JSONL fixture 전체 구간 대비 현재 재생 위치를 조회한다. */
export const fetchReplayStatus = () => requestJson('/api/replay/status', {
  fallbackMessage: '테스트 경기 재생 위치를 조회하지 못했습니다.',
});

/** 재생 위치를 유지한 채 JSONL fixture 배속을 바꾼다. */
export const changeReplaySpeed = (speed) => requestJson(
  `/api/replay/speed?value=${encodeURIComponent(speed)}`,
  {
    method: 'POST',
    fallbackMessage: '테스트 경기 배속을 변경하지 못했습니다.',
  },
);
