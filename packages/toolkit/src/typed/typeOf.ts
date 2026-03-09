export type ArgType =
  | 'array'
  | 'boolean'
  | 'date'
  | 'error'
  | 'function'
  | 'map'
  | 'nan'
  | 'null'
  | 'number'
  | 'object'
  | 'promise'
  | 'regexp'
  | 'set'
  | 'string'
  | 'symbol'
  | 'weakmap'
  | 'weakset'
  | 'undefined';

/**
 * Returns the type of the given argument.
 *
 * @example
 * ```ts
 * typeOf(null); // 'null'
 * typeOf(undefined); // 'undefined'
 * typeOf(NaN); // 'nan'
 * typeOf(async function() {}); // 'function'
 * typeOf(123); // 'number'
 * typeOf('abc'); // 'string'
 * typeOf({}); // 'object'
 * typeOf([]); // 'array'
 * typeOf(() => {}); // 'function'
 * typeOf(new Date()); // 'date'
 * typeOf(new Error()); // 'error'
 * typeOf(new Map()); // 'map'
 * typeOf(new Set()); // 'set'
 * typeOf(new WeakMap()); // 'weakmap'
 * typeOf(new WeakSet()); // 'weakset'
 * typeOf(new RegExp('')); // 'regexp'
 * ```
 *
 * @param arg - The argument whose type is to be determined.
 *
 * @returns The type of the argument.
 */
export function typeOf(arg: unknown): ArgType {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'number' && Number.isNaN(arg)) return 'nan';

  const type = Object.prototype.toString.call(arg).slice(8, -1);

  return (type === 'AsyncFunction' ? 'function' : type.toLowerCase()) as ArgType;
}
