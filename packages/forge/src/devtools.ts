/**
 * @vielzeug/forge — debug utilities for form state visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { attachForgeDevtools } from '@vielzeug/forge/devtools';
 * ```
 */

import type { FieldState, FlatKeyOf, Form, FormState, Unsubscribe } from './types';

import { flattenValues, sanitizeForLog } from './_utils';

const isDev = !(globalThis as { __FORGE_PROD__?: boolean }).__FORGE_PROD__;

/** Options for {@link attachForgeDevtools}. */
export type ForgeDevtoolsOptions = {
  /** Label included in every log line, useful when debugging multiple forms at once. Default: `"form"`. */
  label?: string;
};

/**
 * Attaches a `console.debug`-based observer to `form` that logs a distinct line per observable
 * state transition: per-field value/error/touched/dirty changes, submit start/end (via the
 * `isSubmitting` edge), and `isLoading` edge (async `defaultValues` resolving).
 *
 * **Development only** by default — logging is a no-op when `__FORGE_PROD__` is set (the same
 * convention `_dev.ts` uses internally). Import from the dedicated `/devtools` sub-path so the
 * logging code is tree-shaken from production bundles entirely.
 *
 * Works identically on scoped sub-forms (`form.scope('address')`) — field paths logged are
 * relative to whatever `form` object is passed in, matching that form's own `state` convention.
 *
 * @example
 * ```ts
 * import { createForm } from '@vielzeug/forge';
 * import { attachForgeDevtools } from '@vielzeug/forge/devtools';
 *
 * const form = createForm({ defaultValues: { email: '' } });
 * const detach = attachForgeDevtools(form, { label: 'signup' });
 * // [forge:devtools:signup] field "email" value: "" → "a@b.com"
 *
 * detach(); // stop logging
 * ```
 */
export function attachForgeDevtools<TValues extends Record<string, unknown>>(
  form: Form<TValues>,
  options: ForgeDevtoolsOptions = {},
): Unsubscribe {
  if (!isDev) return () => {};

  const prefix = `[forge:devtools:${options.label ?? 'form'}]`;
  const fieldSnapshots = new Map<string, FieldState<unknown>>();

  let prevIsSubmitting = form.state.isSubmitting;
  let prevIsLoading = form.state.isLoading;

  function knownFieldKeys(state: FormState): Set<string> {
    const keys = new Set<string>(fieldSnapshots.keys());

    for (const key of Object.keys(flattenValues(form.values() as Record<string, unknown>))) keys.add(key);
    for (const key of Object.keys(state.errors)) keys.add(key);
    for (const key of state.touchedFields) keys.add(key);

    return keys;
  }

  function logFieldDiffs(state: FormState): void {
    for (const key of knownFieldKeys(state)) {
      const next = form.field(key as FlatKeyOf<TValues>);
      const prev = fieldSnapshots.get(key);

      fieldSnapshots.set(key, next);

      // First observation of this field establishes a baseline — logging it would just be
      // noise (every field would "change" from undefined on attach).
      if (!prev) continue;

      // Security: `key` is a caller-chosen field path (assertSafeKey only rejects reserved
      // segments, not control characters) — sanitize before interpolating into console output
      // to prevent terminal-escape-sequence injection, mirroring the sanitization `warn()`
      // call sites already apply (see `_utils.ts` sanitizeForLog).
      const safeKey = sanitizeForLog(key, 80);

      if (prev.value !== next.value) console.debug(`${prefix} field "${safeKey}" value:`, prev.value, '→', next.value);

      if (prev.error !== next.error) console.debug(`${prefix} field "${safeKey}" error:`, prev.error, '→', next.error);

      if (prev.touched !== next.touched) console.debug(`${prefix} field "${safeKey}" touched:`, next.touched);

      if (prev.dirty !== next.dirty) console.debug(`${prefix} field "${safeKey}" dirty:`, next.dirty);
    }
  }

  return form.subscribe(
    (state) => {
      logFieldDiffs(state);

      if (state.isSubmitting !== prevIsSubmitting) {
        prevIsSubmitting = state.isSubmitting;
        console.debug(
          `${prefix} submit ${state.isSubmitting ? 'started' : 'ended'} (submitCount=${state.submitCount})`,
        );
      }

      if (state.isLoading !== prevIsLoading) {
        prevIsLoading = state.isLoading;
        console.debug(`${prefix} isLoading:`, state.isLoading);
      }
    },
    { sync: true },
  );
}
