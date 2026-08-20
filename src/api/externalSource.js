import { requestJson } from './client.js';

/** 현재 운영 중인 외부 데이터 소스를 조회한다. */
export const fetchExternalSourceStatus = () => requestJson('/api/operator/external-source', {
  allowNotFound: true,
  fallbackMessage: '외부 데이터 소스 상태를 조회하지 못했습니다.',
});

/** 모든 사용자에게 적용되는 외부 데이터 소스를 전환한다. */
export const changeExternalSource = (mode) => requestJson('/api/operator/external-source', {
  method: 'PUT',
  body: { mode },
  fallbackMessage: '외부 데이터 소스를 전환하지 못했습니다.',
});
