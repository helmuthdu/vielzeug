import { batch as rippleBatch, signal, watch, type Signal } from '@vielzeug/ripple';

import type { FieldState, FormState, SubscribeOptions, Unsubscribe } from '../types';

import { assertSafeKey } from '../_utils';

/**
 * Everything needed to (re)compute fresh state on demand. Supplied by whoever owns the
 * actual field/validator Maps (`core/context.ts`, backing `core/fields.ts`) so this module
 * never touches those Maps directly — it only knows "how to get current state" and "who's
 * listening," never "where the state lives."
 */
export type NotifierDeps = {
  buildFieldState(name: string): FieldState<unknown>;
  computeState(): FormState;
  /** Called once at the top of every requestNotify(), before state is recomputed — lets the
   * caller drop its own memoized derived values (e.g. `values()`'s cached unflattened object). */
  invalidateCaches(): void;
};

/**
 * Owns every signal, subscription, and derived-state cache a form needs to notify observers.
 * Extracted from the old shared `FormContext` god-object (see `core/context.ts`'s header
 * comment) — this is the one piece of that object with no real dependency on field values or
 * validators, only on "what does current state look like" (via `NotifierDeps`), so it's safe
 * to own its signals/caches privately instead of exposing them on a shared mutable bag.
 */
export function createNotifier(deps: NotifierDeps) {
  const formStateSignal: Signal<FormState> = signal(deps.computeState());
  const fieldSignals = new Map<string, Signal<FieldState<unknown>>>();
  const fieldStateCache = new Map<string, FieldState<unknown>>();
  const rippleSubs = new Set<{ dispose(): void }>();
  let disposed = false;

  function getOrCreateFieldSignal(key: string): Signal<FieldState<unknown>> {
    let sig = fieldSignals.get(key);

    if (!sig) {
      sig = signal<FieldState<unknown>>(deps.buildFieldState(key), {
        equals: (a, b) =>
          a.value === b.value &&
          a.error === b.error &&
          a.hasError === b.hasError &&
          a.touched === b.touched &&
          a.dirty === b.dirty,
      });
      fieldSignals.set(key, sig);
    }

    return sig;
  }

  function getFieldSnapshot(name: string): FieldState<unknown> {
    const cached = fieldStateCache.get(name);

    if (cached) return cached;

    const snap = Object.freeze(deps.buildFieldState(name));

    fieldStateCache.set(name, snap);

    return snap;
  }

  function getStateSnapshot(): FormState {
    return formStateSignal.value;
  }

  /**
   * Unified notification — a single write path for every mutation in the package.
   * - `undefined` → full-form refresh (all field signals + form signal)
   * - `string`    → single field + form signal
   * - `Iterable`  → targeted set of fields + form signal
   * `rippleBatch` deduplicates signal writes within the synchronous call stack.
   */
  function requestNotify(target?: string | Iterable<string>): void {
    if (disposed) return;

    deps.invalidateCaches();

    if (target === undefined) {
      fieldStateCache.clear();
      rippleBatch(() => {
        formStateSignal.value = deps.computeState();

        for (const [name, sig] of fieldSignals) sig.value = deps.buildFieldState(name);
      });
    } else if (typeof target === 'string') {
      fieldStateCache.delete(target);
      rippleBatch(() => {
        formStateSignal.value = deps.computeState();

        const sig = fieldSignals.get(target);

        if (sig) sig.value = deps.buildFieldState(target);
      });
    } else {
      // Materialize before rippleBatch so the iterable isn't consumed inside the callback.
      const fields = [...target];

      for (const field of fields) fieldStateCache.delete(field);

      rippleBatch(() => {
        formStateSignal.value = deps.computeState();

        for (const field of fields) {
          const sig = fieldSignals.get(field);

          if (sig) sig.value = deps.buildFieldState(field);
        }
      });
    }
  }

  function subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    if (disposed) return () => {};

    // Wrap listener so it always returns void — ripple watch throws on non-function returns.
    const sub = watch(formStateSignal, (state) => {
      listener(state);
    });

    rippleSubs.add(sub);

    if (options?.sync) listener(formStateSignal.value);

    return () => {
      sub.dispose();
      rippleSubs.delete(sub);
    };
  }

  function subscribeField(
    name: string,
    listener: (state: FieldState<unknown>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    if (disposed) return () => {};

    assertSafeKey(name);

    const sig = getOrCreateFieldSignal(name);
    const sub = watch(sig, (state) => {
      listener(state);
    });

    rippleSubs.add(sub);

    if (options?.sync) listener(sig.value);

    return () => {
      sub.dispose();
      rippleSubs.delete(sub);
    };
  }

  function dispose(): void {
    disposed = true;

    for (const sub of rippleSubs) sub.dispose();

    rippleSubs.clear();
    fieldSignals.clear();
    fieldStateCache.clear();
  }

  return {
    dispose,
    getFieldSnapshot,
    getOrCreateFieldSignal,
    getStateSnapshot,
    requestNotify,
    subscribe,
    subscribeField,
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
