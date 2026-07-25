/**
 * @vielzeug/sourcerer — debug utilities for reactive source state visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugSource } from '@vielzeug/sourcerer/devtools';
 * ```
 */

const isDev = !(globalThis as { __SOURCERER_PROD__?: boolean }).__SOURCERER_PROD__;

/** Options for {@link debugSource}. */
export type SourcererDevtoolsOptions = {
  /** Label included in every log line, useful when debugging multiple sources at once. Default: `"source"`. */
  label?: string;
};

/**
 * Minimal shape `debugSource()` needs. `meta` is optional because `mergeSource()`'s
 * `MergedSource<T>` deliberately has none (parents may have incompatible meta shapes) — every
 * other source/combinator (`createLocalSource`/`createRemoteSource`/`createCursorSource`/
 * `createInfiniteSource`/`deriveSource`) does have one, and gets the full meta-diff logging;
 * `mergeSource()` results still get `current`'s item-count logging, just no `meta.*` lines.
 */
type DebuggableSource<TMeta extends Record<string, unknown>> = {
  readonly current: readonly unknown[];
  readonly meta?: TMeta;
  subscribe(listener: () => void): () => void;
};

/**
 * Attaches a `console.debug`-based observer to `source` that logs a distinct line per
 * observable state transition: any changed `meta` field (works generically across
 * `SourceMeta`/`CursorMeta`/`InfiniteMeta` — whatever shape this particular source has, when it
 * has one at all — see `DebuggableSource`'s doc comment for the `mergeSource()` exception) and
 * `current`'s item count.
 *
 * **Development only** by default — logging is a no-op when `__SOURCERER_PROD__` is set (the
 * same convention `_dev.ts` uses internally). Import from the dedicated `/devtools` sub-path so
 * the logging code is tree-shaken from production bundles entirely.
 *
 * @example
 * ```ts
 * import { createRemoteSource } from '@vielzeug/sourcerer';
 * import { debugSource } from '@vielzeug/sourcerer/devtools';
 *
 * const source = createRemoteSource({ fetch: fetchUsers, limit: 20 });
 * const detach = debugSource(source, { label: 'users' });
 * // [sourcerer:devtools:users] meta.isLoading: false → true
 * // [sourcerer:devtools:users] current: 0 → 20 items
 *
 * detach(); // stop logging
 * ```
 */
export function debugSource<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  source: DebuggableSource<TMeta>,
  options: SourcererDevtoolsOptions = {},
): () => void {
  if (!isDev) return () => {};

  const prefix = `[sourcerer:devtools:${options.label ?? 'source'}]`;
  let prevMeta = source.meta;
  let prevLength = source.current.length;

  return source.subscribe(() => {
    const nextMeta = source.meta;

    if (nextMeta) {
      for (const key of Object.keys(nextMeta)) {
        const prevValue = prevMeta?.[key as keyof TMeta];
        const nextValue = nextMeta[key as keyof TMeta];

        if (!Object.is(prevValue, nextValue)) {
          console.debug(`${prefix} meta.${key}:`, prevValue, '→', nextValue);
        }
      }
    }

    prevMeta = nextMeta;

    const nextLength = source.current.length;

    if (nextLength !== prevLength) {
      console.debug(`${prefix} current:`, prevLength, '→', nextLength, 'items');
      prevLength = nextLength;
    }
  });
}
