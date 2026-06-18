import type { Middleware } from './types';

type Falsy = false | null | undefined;

/**
 * Filters out falsy middleware entries (`null`, `undefined`, `false`) and returns a clean array.
 *
 * Middleware ordering validation runs automatically inside `computePosition()` in development —
 * you do not need `compose()` to get ordering warnings. Use it purely for its falsy-filter
 * ergonomics when conditionally including middleware.
 *
 * @example
 * ```ts
 * import { compose, offset, flip, shift, arrow } from '@vielzeug/orbit';
 *
 * const middleware = compose(
 *   offset(8),
 *   flip(),
 *   shift({ padding: 6 }),
 *   hasArrow && arrow({ element: arrowEl }),
 * );
 * float(trigger, tooltip, { middleware });
 * ```
 */
export function compose(...middleware: Array<Middleware | Falsy>): Middleware[] {
  return middleware.filter(Boolean) as Middleware[];
}
