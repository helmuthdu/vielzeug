/**
 * The package's single object-branding mechanism: a `Symbol.for`-keyed property stamp.
 *
 * Why `Symbol.for` and not identity checks (`WeakSet`, `instanceof`): `Symbol.for` keys are
 * process-global, so brands survive a duplicated module graph (two copies of ore bundled into
 * one page — the exact failure mode `src/iife.ts`'s header documents). Identity-based checks
 * silently fail across those copies: an object stamped by one graph is invisible to the other.
 * Every branded runtime object in ore (`HTMLResult`, `DirectiveResult`,
 * `LiveBinding`, `CSSResult`) goes through this helper — do not introduce a second mechanism.
 */

export type Brand<T extends object> = {
  is: (value: unknown) => value is T;
  stamp: (obj: T) => T;
};

export const makeBrand = <T extends object>(key: string): Brand<T> => {
  const BRAND = Symbol.for(key);
  const stamp = (obj: T): T => Object.assign(obj, { [BRAND]: true });
  const is = (value: unknown): value is T => typeof value === 'object' && value !== null && BRAND in (value as object);

  return { is, stamp };
};
