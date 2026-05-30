import type { Middleware } from './types';

import { MIDDLEWARE_ORDER_RULES } from './utils';

type TaggedMiddleware = Middleware & { __name?: string };

function validateOrder(names: Array<string | null>): void {
  for (const [before, after] of MIDDLEWARE_ORDER_RULES) {
    const beforeIdx = names.indexOf(before);
    const afterIdx = names.indexOf(after);

    if (beforeIdx !== -1 && afterIdx !== -1 && beforeIdx < afterIdx) {
      throw new Error(
        `[orbit] compose(): "${before}" must come after "${after}". ` +
          `Recommended order: offset -> flip/autoPlacement -> shift -> size -> arrow.`,
      );
    }
  }

  if (names.includes('flip') && names.includes('autoPlacement')) {
    throw new Error('[orbit] compose(): use either flip() or autoPlacement(), not both.');
  }
}

/**
 * Validates middleware ordering and returns them as a typed array.
 *
 * Throws at call time (not at compute time) if middleware are in a known-bad order.
 * Filters out falsy entries.
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
  const names = mws.map((mw) => (mw as TaggedMiddleware).__name ?? null);

  validateOrder(names);

  return mws;
}
