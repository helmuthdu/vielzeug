import type { FormSnapshot } from '../types';
import type { FormContext } from './context';

import { isSafeKey } from '../_utils';

/**
 * Lifecycle operations: `dispose`, `snapshot`, `restore`. Moved verbatim from `createForm()`'s
 * "Lifecycle: dispose" and "Snapshot / Restore" sections.
 */
export function createLifecycleOps<TValues extends Record<string, unknown>>(ctx: FormContext<TValues>) {
  function dispose(): void {
    ctx.disposed = true;
    ctx.disposeController.abort();

    for (const ctrl of ctx.fieldCtrls.values()) ctrl.abort();

    ctx.fieldCtrls.clear();
    ctx.runCtrls.clear();
    ctx.arrayCache.clear();
    ctx.scopeCache.clear();

    for (const sub of ctx.rippleSubs) sub.dispose();

    ctx.rippleSubs.clear();
    ctx.fieldSignals.clear();
  }

  function snapshot(): FormSnapshot<TValues> {
    ctx.ensureNotDisposed();

    // Cast is irreducible: baseline/store are typed Partial<Record<FlatKeyOf<TValues>, unknown>>, a
    // TValues-dependent mapped type TS cannot verify a plain Object.fromEntries() result against for
    // a generic TValues param -- no runtime behavior is affected, only static verification.
    return Object.freeze({
      baseline: Object.freeze(Object.fromEntries(ctx.baseline)),
      dirty: Object.freeze([...ctx.dirty]),
      errors: Object.freeze(Object.fromEntries(ctx.fieldErrors)),
      store: Object.freeze(Object.fromEntries(ctx.store)),
      submitCount: ctx.submitCount,
      touched: Object.freeze([...ctx.touched]),
    }) as FormSnapshot<TValues>;
  }

  function restore(snap: FormSnapshot<TValues>): void {
    ctx.ensureNotDisposed();

    for (const ctrl of ctx.runCtrls) ctrl.abort();
    for (const ctrl of ctx.fieldCtrls.values()) ctrl.abort();

    ctx.runCtrls.clear();
    ctx.fieldCtrls.clear();
    ctx.validatingRuns.clear();
    ctx.store.clear();
    ctx.baseline.clear();
    ctx.fieldErrors.clear();
    ctx.touched.clear();
    ctx.dirty.clear();

    // Security: snap may be an externally-sourced blob (e.g. JSON.parse'd persisted state).
    // Unlike patch()/replace(), restore() writes flat keys directly into the internal Maps —
    // it must apply the same silent-drop defense-in-depth as flattenValues() does for those.
    for (const [k, v] of Object.entries(snap.store)) if (isSafeKey(k)) ctx.store.set(k, v);
    for (const [k, v] of Object.entries(snap.baseline)) if (isSafeKey(k)) ctx.baseline.set(k, v);
    for (const [k, v] of Object.entries(snap.errors)) if (isSafeKey(k)) ctx.fieldErrors.set(k, v);
    for (const t of snap.touched) if (isSafeKey(t)) ctx.touched.add(t);
    for (const d of snap.dirty) if (isSafeKey(d)) ctx.dirty.add(d);

    ctx.submitCount = snap.submitCount;

    ctx.invalidateErrors();
    ctx.invalidateValues();
    ctx.requestNotify();
  }

  return { dispose, restore, snapshot };
}

export type LifecycleOps<TValues extends Record<string, unknown>> = ReturnType<typeof createLifecycleOps<TValues>>;
