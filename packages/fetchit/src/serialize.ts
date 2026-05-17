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
