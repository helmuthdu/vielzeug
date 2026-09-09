/**
 * Build a `RequestInit` object from the request components, handling body serialisation.
 * JSON-serializable non-BodyInit values are encoded and receive `content-type: application/json`.
 * BodyInit values (FormData, Blob, etc.) are forwarded as-is.
 */
export function buildRequestInit(
  method: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal | undefined,
  rest: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>,
): RequestInit {
  if (body !== undefined && !isBodyInit(body)) {
    const encoded = JSON.stringify(body);
    if (encoded === undefined) throw new TypeError('request body is not JSON-serializable');

    return {
      ...rest,
      body: encoded,
      headers: { 'content-type': 'application/json', ...headers },
      method: method.toUpperCase(),
      signal,
    };
  }

  return {
    ...rest,
    ...(body !== undefined && { body: body as BodyInit }),
    ...(isReadableStream(body) && { duplex: 'half' }),
    headers,
    method: method.toUpperCase(),
    signal,
  };
}

function objectTag(value: unknown): string {
  try {
    return Object.prototype.toString.call(value);
  } catch {
    return '';
  }
}

function isReadableStream(value: unknown): value is ReadableStream {
  return objectTag(value) === '[object ReadableStream]' && typeof (value as ReadableStream).getReader === 'function';
}

export function isBodyInit(value: unknown): value is BodyInit {
  if (typeof value === 'string' || ArrayBuffer.isView(value)) return true;

  return [
    '[object ArrayBuffer]',
    '[object Blob]',
    '[object FormData]',
    '[object URLSearchParams]',
    '[object ReadableStream]',
  ].includes(objectTag(value));
}
