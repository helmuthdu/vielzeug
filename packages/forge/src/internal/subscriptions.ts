import type { FieldState, FormState, SubscribeOptions, Unsubscribe } from '../types';
import type { FormCore } from './core';

type LocalListener = (state: FormState) => void;
type AnyFieldListener = (payload: FieldState<unknown>) => void;

export interface SubscriptionStore {
  readonly listeners: Set<LocalListener>;
  readonly fieldListeners: Map<string, Set<AnyFieldListener>>;
  /** F2 shallow-equality gating: last snapshot sent to each field's listeners */
  readonly lastNotifiedField: Map<string, FieldState<unknown>>;
}

export function createSubscriptionStore(): SubscriptionStore {
  return {
    fieldListeners: new Map(),
    lastNotifiedField: new Map(),
    listeners: new Set(),
  };
}

/**
 * F2: Notify field listeners only when the FieldState has actually changed.
 * Shallow-compares all four properties to skip spurious notifications caused by
 * form-level state changes (isValidating, isSubmitting) that don't affect the field.
 */
export function notifyField(subs: SubscriptionStore, core: FormCore, name: string): void {
  const bucket = subs.fieldListeners.get(name);

  if (!bucket?.size) return;

  const snapshot = core.getFieldSnapshot(name);
  const last = subs.lastNotifiedField.get(name);

  if (
    last !== undefined &&
    last.value === snapshot.value &&
    last.error === snapshot.error &&
    last.touched === snapshot.touched &&
    last.dirty === snapshot.dirty
  ) {
    return;
  }

  subs.lastNotifiedField.set(name, snapshot);

  for (const listener of bucket) listener(snapshot);
}

export function flushNotifications(
  subs: SubscriptionStore,
  core: FormCore,
  pendingAll: boolean,
  pendingFields: Set<string>,
): void {
  if (!pendingAll && pendingFields.size === 0) return;

  if (subs.listeners.size > 0) {
    const state = core.getStateSnapshot();

    for (const listener of subs.listeners) listener(state);
  }

  if (pendingAll) {
    for (const name of subs.fieldListeners.keys()) notifyField(subs, core, name);
  } else {
    for (const name of pendingFields) notifyField(subs, core, name);
  }
}

export function subscribe(
  subs: SubscriptionStore,
  core: FormCore,
  listener: LocalListener,
  options?: SubscribeOptions,
): Unsubscribe {
  if (core.getIsDisposed()) return () => {};

  subs.listeners.add(listener);

  if (options?.sync) listener(core.getStateSnapshot());

  return () => subs.listeners.delete(listener);
}

export function subscribeField(
  subs: SubscriptionStore,
  core: FormCore,
  name: string,
  listener: AnyFieldListener,
  options?: SubscribeOptions,
): Unsubscribe {
  if (core.getIsDisposed()) return () => {};

  let bucket = subs.fieldListeners.get(name);

  if (!bucket) {
    bucket = new Set<AnyFieldListener>();
    subs.fieldListeners.set(name, bucket);
    // F2 + R5: Seed last-notified so the first requestNotify() doesn't spuriously
    // fire this listener when only isValidating/isSubmitting changed but FieldState didn't.
    subs.lastNotifiedField.set(name, core.getFieldSnapshot(name));
  }

  bucket.add(listener);

  if (options?.sync) listener(core.getFieldSnapshot(name));

  return () => {
    bucket!.delete(listener);

    if (bucket!.size === 0) {
      subs.fieldListeners.delete(name);
      subs.lastNotifiedField.delete(name);
    }
  };
}

/** Creates the async iterator for `form[Symbol.asyncIterator]()` (F4). */
export function createAsyncIterator(subs: SubscriptionStore, core: FormCore): AsyncIterableIterator<FormState> {
  type Resolver = (result: IteratorResult<FormState, undefined>) => void;

  let pending: FormState[] = [core.getStateSnapshot()];
  let waitingResolve: Resolver | null = null;
  let done = false;

  const unsubscribe = subscribe(subs, core, (state) => {
    if (done) return;

    if (waitingResolve) {
      const resolve = waitingResolve;

      waitingResolve = null;
      resolve({ done: false, value: state });
    } else {
      pending.push(state);
    }
  });

  core.disposeController.signal.addEventListener(
    'abort',
    () => {
      done = true;
      unsubscribe();

      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        resolve({ done: true, value: undefined } as IteratorResult<FormState, undefined>);
      }

      pending = [];
    },
    { once: true },
  );

  return {
    next(): Promise<IteratorResult<FormState, undefined>> {
      if (pending.length > 0) {
        return Promise.resolve({ done: false, value: pending.shift()! });
      }

      if (done) {
        return Promise.resolve({ done: true, value: undefined });
      }

      return new Promise<IteratorResult<FormState, undefined>>((resolve) => {
        waitingResolve = resolve;
      });
    },

    return(): Promise<IteratorResult<FormState, undefined>> {
      done = true;
      unsubscribe();

      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        resolve({ done: true, value: undefined });
      }

      pending = [];

      return Promise.resolve({ done: true, value: undefined });
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
