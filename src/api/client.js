async function parsePayload(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  return text || null;
}

export async function requestJson(url, options = {}) {
  const {
    allowNotFound = false,
    body,
    fallbackMessage,
    headers: optionHeaders,
    ...fetchOptions
  } = options;
  const headers = { ...optionHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 404 && allowNotFound) return null;
  const payload = await parsePayload(response);
  if (!response.ok) {
    const message = payload?.message
      ?? payload?.error
      ?? fallbackMessage
      ?? `${url} 요청에 실패했습니다. (${response.status})`;
    const requestError = new Error(message);
    requestError.name = 'ApiError';
    requestError.status = response.status;
    requestError.code = payload?.code;
    requestError.payload = payload;
    throw requestError;
  }
  return payload;
}

export function requestAsUser(url, userId, options = {}) {
  return requestJson(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-User-Id': String(userId),
    },
  });
}

export function requestAsAdmin(url, adminId, options = {}) {
  return requestJson(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-Admin-Id': String(adminId),
    },
  });
}
