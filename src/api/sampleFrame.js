import { requestJson } from './client.js';

/**
 * 시연 화면이 만든 경기 프레임을 서버 감지기로 보낸다.
 *
 * 트리거를 지목하지 않는다 — 펜타킬인지는 서버의 PentakillDetector 가 판정한다.
 * 화면이 직접 트리거를 쏘면 감지 로직은 한 줄도 검증되지 않는다.
 */
export const sendSampleFrame = ({ gameId, gameTimeSeconds, blue, red }) => requestJson(
  '/api/v1/test/sample-frames',
  {
    method: 'POST',
    body: { gameId, gameTimeSeconds, blue, red },
    fallbackMessage: '시연 프레임을 서버에 보내지 못했습니다.',
  },
);

/** 처음부터 다시 재생할 때 서버에 쌓인 감지 상태를 비운다. */
export const resetSampleFrames = (gameId) => requestJson(
  `/api/v1/test/sample-frames?gameId=${encodeURIComponent(gameId)}`,
  {
    method: 'DELETE',
    fallbackMessage: '시연 감지 상태를 초기화하지 못했습니다.',
  },
);
