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
      `[fetchit] stableStringify: unsupported type ${
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

export function serializeBodyKey(body: unknown): string {
  if (body === undefined || body === null) return 'null';

  // Note: FormData can't be consistently serialized; bodies with the same entry count
  // will collide. Avoid using FormData as a write `dedupeKey` signal source.
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
