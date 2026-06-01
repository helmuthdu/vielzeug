/**
 * @vielzeug/ripple — debug utilities for reactive graph visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugEffect } from '@vielzeug/ripple/debug';
 * ```
 */

import type { DepEntry } from './tracking';
import type { CleanupFn, EffectCallback, EffectOptions, Subscription } from './types';

import { effect } from './effect';
import { getTracking, withSourceObserver } from './tracking';

/**
 * Wraps `effect()` and logs which reactive sources changed between re-runs.
 * Produces a `console.group` before each re-run listing sources whose version
 * has advanced since the last run. Does NOT log on the initial run.
 *
 * Use instead of `effect()` when debugging unexpected re-renders.
 * Import from the dedicated sub-path so this code is tree-shaken from production bundles.
 *
 * @example
 * ```ts
 * import { debugEffect } from '@vielzeug/ripple/debug';
 *
 * const stop = debugEffect(() => {
 *   renderUser(userId.value, name.value);
 * }, { name: 'renderUser' });
 * ```
 */
export const debugEffect = (fn: EffectCallback, options?: Omit<EffectOptions, 'trace'>): Subscription => {
  const label = options?.name ?? 'anonymous';

  // Track versions seen on the last run so we can diff on the next run.
  let prevDeps: DepEntry[] = [];

  const wrappedFn = (): CleanupFn | void => {
    const currentDeps: DepEntry[] = [];

    // Log changed sources on every run after the first.
    if (prevDeps.length > 0) {
      const changed = prevDeps.filter((d) => d.source.version !== d.version);

      if (changed.length > 0) {
        console.group(`[ripple:debug] "${label}" re-running — changed sources:`);

        for (const dep of changed) {
          console.log(`  ${dep.source.name ?? '(unnamed)'} (v${dep.version} -> v${dep.source.version})`);
        }

        console.groupEnd();
      }
    }

    // Run the effect body while observing accessed sources.
    // Only record sources accessed directly by the effect (ctx.kind === 'effect'),
    // not sources accessed during nested computed recomputes triggered inside the body.
    const result = withSourceObserver((source) => {
      if (getTracking()?.kind === 'effect') {
        currentDeps.push({ source, version: source.version });
      }
    }, fn);

    prevDeps = currentDeps;

    return result;
  };

  return effect(wrappedFn, options);
};
