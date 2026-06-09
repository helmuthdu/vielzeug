import type { Middleware } from './types';

import { MIDDLEWARE_NAME, validateMiddlewareNames } from './utils';

/**
 * Validates middleware ordering and returns them as a typed array.
 *
 * This is the **single validation gate** for middleware ordering. In development, it throws
 * at call time if middleware are in a known-bad order. Prefer `compose()` over passing a raw
 * array to get early, descriptive errors rather than silent misbehaviour.
 *
 * Filters out falsy entries (`null`, `undefined`, `false`).
 *
 * @example
 * ```ts
 * import { compose, offset, flip, shift, arrow } from '@vielzeug/orbit';
 *
 * const middleware = compose(offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl }));
 * const cleanup = float(trigger, tooltip, { middleware });
 * ```
 */
export function compose(...middleware: Array<Middleware | null | undefined | false>): Middleware[] {
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
