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

  if (typeof value === 'bigint') return `BigInt:${value}`;

  if (typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  if (value instanceof Date) return `"Date:${value.toISOString()}"`;

  if (value instanceof RegExp) return `"RegExp:${value.toString()}"`;

  if (value instanceof Set) return `Set:[${[...value].map(stableStringify).join(',')}]`;

  if (value instanceof Map)
    return `Map:{${[...value.entries()]
      .map(([k, v]) => `${stableStringify(k)}:${stableStringify(v)}`)
      .sort()
      .join(',')}}`;

  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec)
    .filter((k) => rec[k] !== undefined)
    .sort();

  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`).join(',')}}`;
}

export function serializeBodyKey(body: unknown): string {
  if (body === undefined || body === null) return 'null';

  // Note: FormData can't be consistently serialized; bodies with the same entry count
  // will collide. Pass `dedupe: false` per-request to opt out.
  if (body instanceof FormData) return `[FormData:${[...body.keys()].length}]`;

  if (body instanceof Blob) return `[Blob:${body.size}:${body.type}]`;

  if (body instanceof URLSearchParams) return `[URLSearchParams:${body.toString()}]`;

  if (body instanceof ArrayBuffer) return `[ArrayBuffer:${body.byteLength}]`;

  if (ArrayBuffer.isView(body)) return `[ArrayBufferView:${(body as ArrayBufferView).byteLength}]`;

  if (typeof body === 'string') return body;

  try {
    return stableStringify(body);
  } catch {
    // Circular or unserializable reference — use fallback for dedup purposes.
    // JSON.stringify(body) in request() will throw the real TypeError.
    return '[Object]';
  }
}
