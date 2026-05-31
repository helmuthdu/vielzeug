/**
 * Produces a deterministic, order-independent JSON-like string for any value.
 * Object keys are sorted alphabetically, so `{ b: 1, a: 2 }` and `{ a: 2, b: 1 }` produce
 * the same output. Handles `Date`, `RegExp`, `Set`, `Map`, and `bigint` in addition to plain JSON.
 *
 * Useful for generating stable cache keys from arbitrary query parameters or options objects.
 *
 * Class instances (objects whose prototype is neither `Object.prototype` nor `null`) fall back
 * to `String(value)` by default. Pass `{ strict: true }` to throw a `TypeError` instead.
 *
 * @example
 * ```ts
 * stableStringify({ b: 2, a: 1 }) // '{"a":1,"b":2}'
 * stableStringify([3, 1, 2])      // '[3,1,2]'
 * stableStringify(new Date('2024-01-01T00:00:00Z')) // '[Date:2024-01-01T00:00:00.000Z]'
 * stableStringify(new Set([3, 1, 2])) // '[Set:1,2,3]'
 * stableStringify(new MyClass(), { strict: true }) // throws TypeError
 * ```
 */
export function stableStringify(value: unknown, options?: { strict?: boolean }): string {
  if (value === undefined) return 'undefined';

  if (value === null) return 'null';

  if (typeof value === 'bigint') return `${value}n`;

  if (typeof value !== 'object') return JSON.stringify(value);

  if (value instanceof Date) return `[Date:${Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString()}]`;

  if (value instanceof RegExp) return `[RegExp:${value.source}/${value.flags}]`;

  if (value instanceof Set)
    return `[Set:${[...value]
      .map((v) => stableStringify(v, options))
      .sort()
      .join(',')}]`;

  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, entryValue]) => [stableStringify(key, options), stableStringify(entryValue, options)] as const)
      .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
      );

    return `[Map:${entries.map(([key, entryValue]) => `${key}=>${entryValue}`).join(',')}]`;
  }

  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v, options)).join(',')}]`;

  const proto = Object.getPrototypeOf(value) as unknown;

  if (proto !== Object.prototype && proto !== null) {
    if (options?.strict) {
      throw new TypeError(
        `stableStringify: unsupported type ${
          (value as { constructor?: { name?: string } }).constructor?.name ?? 'unknown'
        }`,
      );
    }

    return String(value);
  }

  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec)
    .filter((k) => rec[k] !== undefined)
    .sort();

  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k], options)}`).join(',')}}`;
}
