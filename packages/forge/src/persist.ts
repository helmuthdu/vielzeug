import { abortable, abortError } from '@vielzeug/arsenal';

import { isRecord } from './core/path.js';
import type { Form } from './types.js';

type MaybeAsync<T> = T | Promise<T>;

/**
 * Key/value storage for form drafts. `get` may resolve to anything the storage holds;
 * `loadForm` only restores plain objects and reports every other draft as missing.
 */
export type FormDraftStore = Readonly<{
  get(key: string): MaybeAsync<unknown>;
  put(key: string, value: Record<string, unknown>): MaybeAsync<void>;
}>;

export type FormPersistOptions = Readonly<{ signal?: AbortSignal }>;

function persistSignal<TValues extends Record<string, unknown>>(
  form: Form<TValues>,
  options: FormPersistOptions,
): AbortSignal {
  const signal = options.signal ? AbortSignal.any([form.disposalSignal, options.signal]) : form.disposalSignal;
  if (signal.aborted) throw abortError(signal);
  return signal;
}

/**
 * Restores a saved draft into `form` through `form.reset`.
 * Returns `false` when no usable draft exists or the form changed while the draft was loading.
 * Disposing the form (or passing a signal) cancels the load with an `AbortError`.
 */
export async function loadForm<TValues extends Record<string, unknown>>(
  form: Form<TValues>,
  store: FormDraftStore,
  key: string,
  options: FormPersistOptions = {},
): Promise<boolean> {
  const signal = persistSignal(form, options);
  const snapshot = form.value;
  const draft = await abortable(Promise.resolve(store.get(key)), signal);
  if (draft === undefined || !isRecord(draft) || form.value !== snapshot) return false;

  // Storage crosses a trust boundary; `reset` re-validates and freezes the values.
  form.reset(draft as TValues);
  return true;
}

/**
 * Saves the current form values under `key`.
 * Disposing the form (or passing a signal) cancels the write with an `AbortError`.
 */
export async function saveForm<TValues extends Record<string, unknown>>(
  form: Form<TValues>,
  store: FormDraftStore,
  key: string,
  options: FormPersistOptions = {},
): Promise<void> {
  const signal = persistSignal(form, options);
  await abortable(Promise.resolve(store.put(key, form.value as Record<string, unknown>)), signal);
}
