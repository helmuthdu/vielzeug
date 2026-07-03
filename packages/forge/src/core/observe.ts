import { isAbortError } from '@vielzeug/arsenal';
import { watch } from '@vielzeug/ripple';

import type { FormContext } from './context';
import type { ValidationOps } from './validation';
import type { ValueOps } from './values';

import { assertSafeKey } from '../_utils';
import {
  type ConnectionResult,
  type ConnectOptions,
  type FieldState,
  type FlatKeyOf,
  type FormState,
  type SubscribeOptions,
  type TypeAtPath,
  type Unsubscribe,
} from '../types';
import { createAsyncQueue } from './asyncQueue';

type ObserveDeps<TValues extends Record<string, unknown>> = Pick<ValueOps<TValues>, 'set' | 'touch'> &
  Pick<ValidationOps<TValues>, 'validateFields'>;

/**
 * Observation operations: `subscribe`/`subscribeField`, `connect` (per-binding debounce timer),
 * and the `[Symbol.asyncIterator]` implementation. Moved verbatim from `createForm()`'s
 * "Subscriptions", "Connect", and "Async iterator" sections.
 */
export function createObserveOps<TValues extends Record<string, unknown>>(
  ctx: FormContext<TValues>,
  deps: ObserveDeps<TValues>,
) {
  function subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    if (ctx.disposed) return () => {};

    // Wrap listener so it always returns void — ripple watch throws on non-function returns.
    const sub = watch(ctx.formStateSignal, (state) => {
      listener(state);
    });

    ctx.rippleSubs.add(sub);

    if (options?.sync) listener(ctx.formStateSignal.value);

    return () => {
      sub.dispose();
      ctx.rippleSubs.delete(sub);
    };
  }

  function subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    if (ctx.disposed) return () => {};

    const key = name as string;

    assertSafeKey(key);

    const sig = ctx.getOrCreateFieldSignal(key);
    // Wrap listener so it always returns void — ripple watch throws on non-function returns.
    const sub = watch(sig, (state) => {
      (listener as (state: FieldState<unknown>) => void)(state);
    });

    ctx.rippleSubs.add(sub);

    if (options?.sync) listener(sig.value as FieldState<TypeAtPath<TValues, K>>);

    return () => {
      sub.dispose();
      ctx.rippleSubs.delete(sub);
    };
  }

  /* ======== R5: Connect — per-binding debounce timer ======== */

  function connect<K extends FlatKeyOf<TValues>>(
    name: K,
    config?: ConnectOptions,
  ): ConnectionResult<TypeAtPath<TValues, K>> {
    ctx.ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);

    const touchOnBlur = config?.touchOnBlur ?? ctx.connectDefaults.touchOnBlur ?? false;
    const validateOnBlur = config?.validateOnBlur ?? ctx.connectDefaults.validateOnBlur ?? false;
    const validateOnChange = config?.validateOnChange ?? ctx.connectDefaults.validateOnChange ?? false;
    const validateOnTouch = config?.validateOnTouch ?? ctx.connectDefaults.validateOnTouch ?? false;
    const debounceMs = config?.debounce ?? ctx.connectDefaults.debounce ?? 0;

    // R5: each connect() call owns its own timer — cancelling one binding never affects another.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleValidation(): void {
      if (debounceMs > 0) {
        if (debounceTimer !== null) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
          debounceTimer = null;

          if (ctx.disposed) return;

          void deps.validateFields([name]).catch((err: unknown) => {
            if (!isAbortError(err)) throw err;
          });
        }, debounceMs);
      } else {
        void deps.validateFields([name]).catch((err: unknown) => {
          if (!isAbortError(err)) throw err;
        });
      }
    }

    let bindingDisposed = false;

    return {
      get dirty() {
        return ctx.dirty.has(key);
      },
      /** Cancels this binding's own debounce timer. Does not affect other bindings for the same field. */
      dispose() {
        bindingDisposed = true;

        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
      },
      get disposed() {
        return bindingDisposed;
      },
      get error() {
        return ctx.fieldErrors.get(key);
      },
      onBlur: () => {
        if (ctx.disposed) return;

        if (touchOnBlur) deps.touch(name);

        if (validateOnBlur) scheduleValidation();
      },
      onChange: (value: TypeAtPath<TValues, K>) => {
        if (ctx.disposed) return;

        deps.set(name, value);

        const shouldValidate = validateOnChange || (validateOnTouch && ctx.touched.has(key));

        if (shouldValidate) scheduleValidation();
      },
      [Symbol.dispose]() {
        this.dispose();
      },
      get touched() {
        return ctx.touched.has(key);
      },
      get value() {
        return ctx.store.get(key) as TypeAtPath<TValues, K>;
      },
    };
  }

  /* ======== Async iterator (for await...of form) ======== */

  function createAsyncIterator(): AsyncIterableIterator<FormState> {
    const queue = createAsyncQueue<FormState>(() => unsubscribe());

    queue.push(ctx.getStateSnapshot());

    const unsubscribe = subscribe((state) => {
      queue.push(state);
    });

    ctx.disposeController.signal.addEventListener('abort', () => queue.terminate(), { once: true });

    return queue.iterator;
  }

  return { connect, subscribe, subscribeField, [Symbol.asyncIterator]: createAsyncIterator };
}
