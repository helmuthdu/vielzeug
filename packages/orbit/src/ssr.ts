/**
 * @vielzeug/orbit/ssr — no-op stubs for server-side rendering.
 *
 * Import this sub-path in SSR environments (Node.js, Deno, Bun) instead of the
 * main entry to avoid `getBoundingClientRect`, `window`, and `document` references
 * that are unavailable server-side.
 *
 * ```ts
 * // vite.config.ts (or equivalent)
 * resolve: {
 *   alias: {
 *     '@vielzeug/orbit': process.env.SSR ? '@vielzeug/orbit/ssr' : '@vielzeug/orbit',
 *   },
 * }
 * ```
 */

import type { AutoUpdateOptions } from './auto-update';
import type { FloatOptions } from './float';
import type { ComputePositionOptions, ComputePositionResult, FloatHandle, ReferenceElement } from './types';

const NOOP: () => void = () => {};

const NULL_RESULT = (placement: ComputePositionOptions['placement'] = 'bottom'): ComputePositionResult => ({
  middlewareData: {},
  placement,
  x: 0,
  y: 0,
});

/**
 * No-op stub. Returns zero-coordinate result with the requested placement.
 */
export function computePosition(
  _reference: ReferenceElement,
  _floating: HTMLElement,
  options: ComputePositionOptions = {},
): ComputePositionResult {
  return NULL_RESULT(options.placement);
}

/**
 * No-op stub. Returns a no-op cleanup function.
 */
export function autoUpdate(
  _reference: ReferenceElement,
  _floating: HTMLElement,
  _update: () => void,
  _options?: AutoUpdateOptions,
): () => void {
  return NOOP;
}

/**
 * No-op stub. Returns a FloatHandle with no-op methods. `getPosition()` always returns `null`
 * (position is never computed in an SSR environment).
 */
export function float(_reference: ReferenceElement, _floating: HTMLElement, _options: FloatOptions = {}): FloatHandle {
  return {
    cleanup: NOOP,
    cssAnchor: false,
    getPosition: () => null,
    update: NOOP,
  };
}
