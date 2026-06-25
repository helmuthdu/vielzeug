import { ArsenalError } from '../errors';

export type HashOptions = {
  /**
   * What to do when a class instance is encountered (an object whose prototype is
   * neither `Object.prototype` nor `null`).
   *
   * - `'coerce'` (default) — calls `String(value)`.
   * - `'throw'` — throws a `TypeError`.
   */
  onClassInstance?: 'coerce' | 'throw';
};

/**
 * Produces a deterministic, order-independent string representation of any value.
 * Object keys are sorted alphabetically, so `{ b: 1, a: 2 }` and `{ a: 2, b: 1 }` produce
 * the same output. Handles `Date`, `RegExp`, `Set`, `Map`, and `bigint` in addition to plain JSON.
 *
 * Useful for generating stable cache keys from arbitrary query parameters or options objects.
 *
 * Class instances fall back to `String(value)` by default.
 * Pass `{ onClassInstance: 'throw' }` to throw a `TypeError` instead.
 *
 * @example
 * ```ts
 * hash({ b: 2, a: 1 }) // '{"a":1,"b":2}'
 * hash([3, 1, 2])      // '[3,1,2]'
 * hash(new Date('2024-01-01T00:00:00Z')) // '[Date:2024-01-01T00:00:00.000Z]'
 * hash(new Set([3, 1, 2])) // '[Set:1,2,3]'
 * hash(new MyClass(), { onClassInstance: 'throw' }) // throws TypeError
 * ```
 */
function _hash(value: unknown, options: HashOptions | undefined, visited: Set<object>): string {
  if (value === undefined) return 'undefined';

  if (value === null) return 'null';

  if (typeof value === 'bigint') return `${value}n`;

  if (typeof value !== 'object') return JSON.stringify(value);

  if (visited.has(value as object)) return '[Circular]';

  visited.add(value as object);

  if (value instanceof Date) return `[Date:${Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString()}]`;

  if (value instanceof RegExp) return `[RegExp:${value.source}/${value.flags}]`;

  if (value instanceof Set)
    return `[Set:${[...value]
      .map((v) => _hash(v, options, visited))
      .sort()
      .join(',')}]`;

  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, entryValue]) => [_hash(key, options, visited), _hash(entryValue, options, visited)] as const)
      .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
      );

    return `[Map:${entries.map(([key, entryValue]) => `${key}=>${entryValue}`).join(',')}]`;
  }

  if (Array.isArray(value)) return `[${value.map((v) => _hash(v, options, visited)).join(',')}]`;

  const proto = Object.getPrototypeOf(value) as unknown;

  if (proto !== Object.prototype && proto !== null) {
    if (options?.onClassInstance === 'throw') {
      throw new ArsenalError(
        `hash: unsupported type ${(value as { constructor?: { name?: string } }).constructor?.name ?? 'unknown'}`,
      );
    }

    return String(value);
  }

  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec)
    .filter((k) => rec[k] !== undefined)
    .sort();

  return `{${keys.map((k) => `${JSON.stringify(k)}:${_hash(rec[k], options, visited)}`).join(',')}}`;
}

export function hash(value: unknown, options?: HashOptions): string {
  return _hash(value, options, new Set<object>());
}
