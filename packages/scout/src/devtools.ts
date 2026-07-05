/**
 * @vielzeug/scout — debug utilities for the reactive search layer.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugSearch } from '@vielzeug/scout/devtools';
 * ```
 */

import type { SearchState } from './types';

/**
 * Logs `query` → `isSearching` → `results` transitions of a `SearchState` to
 * `console.debug`. Development only — helps visualize debounce timing and result
 * churn without stepping through `createSearch()` internals.
 *
 * **Logs the full, literal search query string.** If your queries may carry PII (names,
 * emails, medical/financial terms typed by end users), don't enable this in production —
 * it's opt-in dev tooling imported from a dedicated sub-path for exactly that reason.
 *
 * Returns a function that unsubscribes all listeners installed by this call.
 *
 * @example
 * ```ts
 * import { debugSearch } from '@vielzeug/scout/devtools';
 *
 * const search = createSearch(index);
 * const stopDebugging = debugSearch(search);
 *
 * search.query.value = 'alice';
 * // [scout:search] query -> "alice"
 * // [scout:search] isSearching -> true
 * // [scout:search] isSearching -> false
 * // [scout:search] results -> 1 item(s)
 *
 * stopDebugging();
 * ```
 */
export function debugSearch<T>(search: SearchState<T>): () => void {
  const label = 'scout:search';

  const subscriptions = [
    search.query.subscribe(() => {
      console.debug(`[${label}] query -> ${JSON.stringify(search.query.peek())}`);
    }),
    search.isSearching.subscribe(() => {
      console.debug(`[${label}] isSearching -> ${search.isSearching.peek()}`);
    }),
    search.results.subscribe(() => {
      console.debug(`[${label}] results -> ${search.results.peek().length} item(s)`);
    }),
  ];

  return () => {
    for (const subscription of subscriptions) subscription.dispose();
  };
}
