import { computed, isSignal, type ReadonlySignal, untrack } from '@vielzeug/stateit';

import type { HTMLResult } from '../internal';

type Dep = unknown | ReadonlySignal<unknown>;

export type MemoOptions = {
  deps?: ReadonlyArray<Dep>;
  render: () => string | HTMLResult;
};

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
 * html`${memo({ deps: [rows], render: () => html`<big-table :data=${rows}></big-table>` })}`
 *
 * // Multiple deps — re-renders when either changes
 * html`${memo({ deps: [locale, theme], render: () => html`<themed-chart :locale=${locale}></themed-chart>` })}`
 */
export function memo(options: MemoOptions): () => string | HTMLResult {
  const renderSignal = computed(() => {
    for (const dep of options.deps ?? []) {
      if (isSignal(dep)) Reflect.get(dep, 'value');
    }

    return untrack(options.render);
  });

  return () => renderSignal.value;
}
