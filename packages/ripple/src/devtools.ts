// ── DevTools — sub-path entry (@vielzeug/ripple/devtools) ────────────────────
//
// Import from the dedicated sub-path so this module is tree-shaken from
// production bundles when DevTools is not used:
//
//   import { installDevTools, debugEffect } from '@vielzeug/ripple/devtools';
//
// The hot-path stub (getDevToolsHook) lives in devtools-hook.ts and is the only
// part that ships in the core bundle.

import type { DepEntry } from './tracking';
import type { CleanupFn, EffectCallback, EffectHandle, EffectOptions, RippleDevToolsHook } from './types';

import { setDevToolsHook } from './devtools-hook';
import { effect } from './effect';
import { withSourceObserver } from './tracking';

// Re-export all hook types from the core types module so consumers of the
// sub-path don't need to import from two places.
export type { DisposeEvent, MutateEvent, NamedEvent, RippleDevToolsHook, WriteEvent } from './types';

// ── installDevTools ───────────────────────────────────────────────────────────

/**
 * Installs a DevTools hook for observing ripple internals.
 * Pass `null` to uninstall.
 *
 * Import from the dedicated sub-path to keep this out of production bundles:
 * ```ts
 * import { installDevTools } from '@vielzeug/ripple/devtools';
 *
 * installDevTools({
 *   write({ name, oldValue, newValue }) {
 *     console.log(`[ripple] ${name ?? '(unnamed)'}: ${String(oldValue)} → ${String(newValue)}`);
 *   },
 *   dispose({ kind, name }) {
 *     console.log(`[ripple] ${kind} "${name ?? '(unnamed)'}" disposed`);
 *   },
 * });
 * ```
 */
export const installDevTools = (hook: RippleDevToolsHook | null): void => {
  setDevToolsHook(hook);

  // Keep the globalThis mirror in sync for browser-extension DevTools.
  // Use assignment (not delete) — configurable property semantics vary by environment.
  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>)['__RIPPLE_DEVTOOLS__'] = hook ?? undefined;
  }
};

// ── debugEffect ───────────────────────────────────────────────────────────────

/**
 * Wraps `effect()` and logs reactive dependency information on every run:
 * - **Initial run**: logs all deps the effect subscribed to.
 * - **Re-runs**: logs which deps changed (with old and new version numbers).
 *
 * Use instead of `effect()` when debugging unexpected re-renders.
 *
 * @example
 * ```ts
 * import { debugEffect } from '@vielzeug/ripple/devtools';
 *
 * const stop = debugEffect(() => {
 *   renderUser(userId.value, name.value);
 * }, { name: 'renderUser' });
 * ```
 */
export const debugEffect = (fn: EffectCallback, options?: Omit<EffectOptions, 'trace'>): EffectHandle => {
  const label = options?.name ?? 'anonymous';

  // Track versions seen on the last run so we can diff on the next run.
  let prevDeps: DepEntry[] = [];

  const wrappedFn = (): CleanupFn | void => {
    const currentDeps: DepEntry[] = [];

    // SourceObserver is scoped to the current TrackingCtx — nested computed
    // recomputes run in their own context (no observer), so no identity check needed.
    const result = withSourceObserver((source) => {
      currentDeps.push({ source, version: source.version });
    }, fn);

    if (prevDeps.length === 0) {
      // First run — log initial subscriptions.
      if (currentDeps.length > 0) {
        console.group(`[ripple:debug] "${label}" initial deps:`);

        for (const dep of currentDeps) {
          console.debug(`  ${dep.source.name ?? '(unnamed)'} (v${dep.source.version})`);
        }

        console.groupEnd();
      }
    } else {
      // Re-run — log which sources changed.
      const changed = prevDeps.filter((d) => d.source.version !== d.version);

      if (changed.length > 0) {
        console.group(`[ripple:debug] "${label}" re-running — changed sources:`);

        for (const dep of changed) {
          console.debug(`  ${dep.source.name ?? '(unnamed)'} (v${dep.version} -> v${dep.source.version})`);
        }

        console.groupEnd();
      }
    }

    prevDeps = currentDeps;

    return result;
  };

  return effect(wrappedFn, options);
};
