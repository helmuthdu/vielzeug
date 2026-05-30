import type { FormSnapshot } from '../types';
import type { FormCore } from './core';

import { flattenValues } from '../utils';

/** R3: Centralised debounce-timer cleanup */
export function clearAllDebounceTimers(core: FormCore): void {
  for (const timer of core.debounceTimers.values()) clearTimeout(timer);
  core.debounceTimers.clear();
}

/** R3: Cancel a single field's debounce timer if one is pending. */
export function clearFieldDebounceTimer(core: FormCore, key: string): void {
  const timer = core.debounceTimers.get(key);

  if (timer !== undefined) {
    clearTimeout(timer);
    core.debounceTimers.delete(key);
  }
}

export function resetField(core: FormCore, key: string): void {
  core.ensureNotDisposed();
  clearFieldDebounceTimer(core, key);

  core.fieldCtrls.get(key)?.abort();
  core.fieldCtrls.delete(key);

  core.store.set(key, core.baseline.get(key));
  core.dirty.delete(key);
  core.touched.delete(key);

  if (core.fieldErrors.delete(key)) core.invalidateErrors();

  core.requestNotify(key);
}

export function removeField(core: FormCore, key: string): void {
  core.ensureNotDisposed();
  clearFieldDebounceTimer(core, key);

  core.store.delete(key);
  core.baseline.delete(key);
  core.dirty.delete(key);
  core.touched.delete(key);
  core.validators.delete(key);
  core.fieldCtrls.get(key)?.abort();
  core.fieldCtrls.delete(key);

  if (core.fieldErrors.delete(key)) core.invalidateErrors();

  core.requestNotify(key);
}

export function reset(core: FormCore): void {
  core.ensureNotDisposed();
  clearAllDebounceTimers(core);

  for (const ctrl of core.runCtrls) ctrl.abort();
  for (const ctrl of core.fieldCtrls.values()) ctrl.abort();

  core.fieldCtrls.clear();
  core.store.clear();
  core.fieldErrors.clear();
  core.touched.clear();
  core.dirty.clear();
  // R4: reset() resets submitCount — form is back to initial state
  core.resetSubmitCount();
  core.invalidateErrors();

  for (const [name, value] of core.baseline) core.store.set(name, value);

  core.requestNotify();
}

export function replace(core: FormCore, newValues: Record<string, unknown>): void {
  core.ensureNotDisposed();
  clearAllDebounceTimers(core);

  for (const ctrl of core.runCtrls) ctrl.abort();
  for (const ctrl of core.fieldCtrls.values()) ctrl.abort();

  core.fieldCtrls.clear();

  const flat = flattenValues(newValues);

  core.store.clear();
  core.baseline.clear();
  core.fieldErrors.clear();
  core.touched.clear();
  core.dirty.clear();
  core.invalidateErrors();

  for (const [name, value] of Object.entries(flat)) {
    core.store.set(name, value);
    core.baseline.set(name, value);
  }

  core.requestNotify();
}

export function patch(core: FormCore, partial: Record<string, unknown>): void {
  core.ensureNotDisposed();

  const flat = flattenValues(partial);

  core.incrementBatchDepth();

  try {
    for (const [key, value] of Object.entries(flat)) {
      core.baseline.set(key, value);
      core.store.set(key, value);
      core.dirty.delete(key);
      core.requestNotify(key);
    }
  } finally {
    core.decrementBatchDepth();

    if (core.getBatchDepth() === 0) core.flushNotifications();
  }
}

export function dispose(
  core: FormCore,
  subs: { fieldListeners: Map<string, unknown>; lastNotifiedField: Map<string, unknown>; listeners: Set<unknown> },
): void {
  // mark disposed FIRST so ensureNotDisposed() works before we clear anything
  core.disposeController.abort();
  clearAllDebounceTimers(core);

  for (const ctrl of core.fieldCtrls.values()) ctrl.abort();

  core.fieldCtrls.clear();
  core.runCtrls.clear();
  subs.listeners.clear();
  subs.fieldListeners.clear();
  subs.lastNotifiedField.clear();
}

/** F5: Capture the full form state into a serialisable snapshot. */
export function snapshot<TValues extends Record<string, unknown>>(core: FormCore): FormSnapshot<TValues> {
  return Object.freeze({
    baseline: Object.freeze(Object.fromEntries(core.baseline)),
    dirty: Object.freeze([...core.dirty]),
    errors: Object.freeze(Object.fromEntries(core.fieldErrors)),
    store: Object.freeze(Object.fromEntries(core.store)),
    submitCount: core.getSubmitCount(),
    touched: Object.freeze([...core.touched]),
  }) as FormSnapshot<TValues>;
}

/** F5: Restore the form to a previously captured snapshot. Aborts in-flight validation. */
export function restore(core: FormCore, snap: FormSnapshot): void {
  core.ensureNotDisposed();
  clearAllDebounceTimers(core);

  for (const ctrl of core.runCtrls) ctrl.abort();
  for (const ctrl of core.fieldCtrls.values()) ctrl.abort();

  core.fieldCtrls.clear();
  core.store.clear();
  core.baseline.clear();
  core.fieldErrors.clear();
  core.touched.clear();
  core.dirty.clear();

  for (const [key, value] of Object.entries(snap.store)) core.store.set(key, value);
  for (const [key, value] of Object.entries(snap.baseline)) core.baseline.set(key, value);
  for (const [key, message] of Object.entries(snap.errors)) core.fieldErrors.set(key, message);
  for (const key of snap.touched) core.touched.add(key);
  for (const key of snap.dirty) core.dirty.add(key);

  // Restore submitCount via however many increments are needed (avoids exposing a direct setter)
  core.resetSubmitCount();

  for (let i = 0; i < snap.submitCount; i++) core.incrementSubmitCount();

  core.invalidateErrors();
  core.requestNotify();
}
