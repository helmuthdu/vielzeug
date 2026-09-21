import { toPlainValues as flattenValue } from './core/path.js';

/**
 * Deeply converts a value into the plain shape Forge accepts: primitives pass through,
 * `Date` is cloned, `File`/`Blob` keep identity, arrays map, and class instances flatten to
 * their own enumerable entries. Unsafe keys (`__proto__`, `constructor`, `prototype`) are
 * dropped, so the output always passes value validation. Use as the `normalize` option of
 * `createForm` to hold domain-model classes in form state.
 *
 * Lossy conversions, applied instead of the error an un-normalized write would throw:
 * `Map`, `Set`, and other keyless built-ins flatten to `{}` (their entries live on the
 * prototype); sparse array slots are dropped, which shifts later indexes; `NaN`, `Infinity`,
 * functions, and circular branches become `undefined`. Normalize model classes, not
 * arbitrary graphs. The type parameter is a convenience cast — the flattened shape differs
 * from the input type whenever class instances are present.
 *
 * This is a public wrapper so the emitted declaration does not name `@vielzeug/arsenal`
 * symbols: exporting the `core/path.ts` original directly pulls arsenal's extensionless
 * re-exports into the NodeNext declaration graph that `test:types` compiles. Keep the
 * implementation in `core/path.ts` beside the `immutable()` leaf rules it mirrors.
 */
export function toPlainValues<T>(value: T): T {
  return flattenValue(value);
}
