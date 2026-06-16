import { stringify } from '@vielzeug/arsenal';

export { stringify };

/**
 * Build a `RequestInit` object from the request components, handling body serialisation.
 * Plain objects/arrays are JSON-serialised and `content-type: application/json` is added.
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
    return {
      ...rest,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...headers },
      method: method.toUpperCase(),
      signal,
    };
  }

  return {
    ...rest,
    ...(body !== undefined && { body: body as BodyInit }),
    headers,
    method: method.toUpperCase(),
    signal,
  };
}

export function isBodyInit(value: unknown): value is BodyInit {
  return (
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof URLSearchParams ||
    typeof value === 'string' ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream)
  );
}
