import { isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../craftit';

type Dep = unknown | ReadonlySignal<unknown>;

/**
 * Memoizes a template fragment — `templateFn` is only re-called when at least
 * one entry in `deps` has changed (compared with `Object.is`).
 *
 * Signal values in `deps` are automatically unwrapped and tracked, so changing a
 * dep signal triggers a re-evaluation. This is useful for skipping expensive
 * sub-tree renders when only unrelated state changes.
 *
 * @example
 * import { memo } from '@vielzeug/craftit/directives';
 *
 * // Only re-renders the table when `rows` actually changes
 * html`${memo([rows], () => html`<big-table :data=${rows}></big-table>`)}`
 *
 * // Multiple deps — re-renders when either changes
 * html`${memo([locale, theme], () => html`<themed-chart :locale=${locale}></themed-chart>`)}`
 */
export function memo(deps: ReadonlyArray<Dep>, templateFn: () => string | HTMLResult): () => string | HTMLResult {
  let cached: string | HTMLResult = '';
  let lastDeps: unknown[] = [];
  let initialized = false;

  return (): string | HTMLResult => {
    const current = deps.map((d) => (isSignal(d) ? (d as ReadonlySignal<unknown>).value : d));
    const changed =
      !initialized || current.length !== lastDeps.length || current.some((v, i) => !Object.is(v, lastDeps[i]));

    if (changed) {
      cached = templateFn();
      lastDeps = current;
      initialized = true;
    }

    return cached;
  };
}
