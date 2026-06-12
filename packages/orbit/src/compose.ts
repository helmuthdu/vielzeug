import type { Middleware } from './types';

import { MIDDLEWARE_NAME, validateMiddlewareNames } from './utils';

type Falsy = false | null | undefined;

/**
 * Validates middleware ordering and returns them as a typed tuple.
 *
 * This is the **single validation gate** for middleware ordering. In development, it throws
 * at call time if middleware are in a known-bad order. Prefer `compose()` over passing a raw
 * array to get early, descriptive errors rather than silent misbehaviour.
 *
 * Filters out falsy entries (`null`, `undefined`, `false`).
 *
 * When all arguments are `TypedMiddleware`, the return type is a typed tuple that preserves
 * each middleware's key and data shape for use with {@link InferMiddlewareData} and
 * {@link TypedComputePositionResult}.
 *
 * @example
 * ```ts
 * import { compose, offset, flip, shift, arrow } from '@vielzeug/orbit';
 *
 * const middleware = compose(offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl }));
 * const cleanup = float(trigger, tooltip, { middleware });
 * ```
 */
export function compose(): [];
export function compose<A extends Middleware>(a: A | Falsy): [A];
export function compose<A extends Middleware, B extends Middleware>(a: A | Falsy, b: B | Falsy): [A, B];
export function compose<A extends Middleware, B extends Middleware, C extends Middleware>(
  a: A | Falsy,
  b: B | Falsy,
  c: C | Falsy,
): [A, B, C];
export function compose<A extends Middleware, B extends Middleware, C extends Middleware, D extends Middleware>(
  a: A | Falsy,
  b: B | Falsy,
  c: C | Falsy,
  d: D | Falsy,
): [A, B, C, D];
export function compose<
  A extends Middleware,
  B extends Middleware,
  C extends Middleware,
  D extends Middleware,
  E extends Middleware,
>(a: A | Falsy, b: B | Falsy, c: C | Falsy, d: D | Falsy, e: E | Falsy): [A, B, C, D, E];
export function compose<
  A extends Middleware,
  B extends Middleware,
  C extends Middleware,
  D extends Middleware,
  E extends Middleware,
  F extends Middleware,
>(a: A | Falsy, b: B | Falsy, c: C | Falsy, d: D | Falsy, e: E | Falsy, f: F | Falsy): [A, B, C, D, E, F];
export function compose<
  A extends Middleware,
  B extends Middleware,
  C extends Middleware,
  D extends Middleware,
  E extends Middleware,
  F extends Middleware,
  G extends Middleware,
>(
  a: A | Falsy,
  b: B | Falsy,
  c: C | Falsy,
  d: D | Falsy,
  e: E | Falsy,
  f: F | Falsy,
  g: G | Falsy,
): [A, B, C, D, E, F, G];
export function compose<
  A extends Middleware,
  B extends Middleware,
  C extends Middleware,
  D extends Middleware,
  E extends Middleware,
  F extends Middleware,
  G extends Middleware,
  H extends Middleware,
>(
  a: A | Falsy,
  b: B | Falsy,
  c: C | Falsy,
  d: D | Falsy,
  e: E | Falsy,
  f: F | Falsy,
  g: G | Falsy,
  h: H | Falsy,
): [A, B, C, D, E, F, G, H];
export function compose(...middleware: Array<Middleware | Falsy>): Middleware[];
export function compose(...middleware: Array<Middleware | Falsy>): Middleware[] {
  const mws = middleware.filter(Boolean) as Middleware[];

  if (import.meta.env.DEV) {
    const names = mws.map((mw) => {
      const tag = (mw as unknown as Record<symbol, unknown>)[MIDDLEWARE_NAME];

      return typeof tag === 'string' ? tag : null;
    });

    validateMiddlewareNames(names, 'compose()');
  }

  return mws;
}
