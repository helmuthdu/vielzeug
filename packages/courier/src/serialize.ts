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

export function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';

  if (value === null) return 'null';

  if (typeof value === 'bigint') return `${value}n`;

  if (typeof value !== 'object') return JSON.stringify(value);

  if (value instanceof Date) return `[Date:${Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString()}]`;

  if (value instanceof RegExp) return `[RegExp:${value.source}/${value.flags}]`;

  if (value instanceof Set) return `[Set:${[...value].map(stableStringify).sort().join(',')}]`;

  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, entryValue]) => [stableStringify(key), stableStringify(entryValue)] as const)
      .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
      );

    return `[Map:${entries.map(([key, entryValue]) => `${key}=>${entryValue}`).join(',')}]`;
  }

  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const proto = Object.getPrototypeOf(value) as unknown;

  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError(
      `[courier] stableStringify: unsupported type ${
        (value as { constructor?: { name?: string } }).constructor?.name ?? 'unknown'
      }`,
    );
  }

  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec)
    .filter((k) => rec[k] !== undefined)
    .sort();

  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`).join(',')}}`;
}
