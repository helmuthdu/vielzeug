import { isAbortError } from '@vielzeug/arsenal';

import type { FormContext } from './context';
import type { FieldOps } from './fields';

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

type ObserveDeps<TValues extends Record<string, unknown>> = Pick<
  FieldOps<TValues>,
  'set' | 'touch' | 'validateFields'
> & {
  /** Default `connect()` options — form-level, not part of the shared `FormContext` bag. */
  connectDefaults: ConnectOptions;
};

/**
 * Observation operations: `subscribe`/`subscribeField` (thin pass-throughs to the notifier
 * owned by `FormContext`), `connect` (per-binding debounce timer), and the
 * `[Symbol.asyncIterator]` implementation.
 */
export function createObserveOps<TValues extends Record<string, unknown>>(
  ctx: FormContext<TValues>,
  deps: ObserveDeps<TValues>,
) {
  function subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    return ctx.subscribe(listener, options);
  }

  function subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    const key = name as string;

    assertSafeKey(key);

    return ctx.subscribeField(key, listener as (state: FieldState<unknown>) => void, options);
  }

  /* ======== R5: Connect — per-binding debounce timer ======== */

  function connect<K extends FlatKeyOf<TValues>>(
    name: K,
    config?: ConnectOptions,
  ): ConnectionResult<TypeAtPath<TValues, K>> {
    ctx.ensureNotDisposed('connect');

    const key = name as string;

    assertSafeKey(key);

    // Three-way fallback (per-call config -> form-level default -> hard default), one place
    // instead of a copy-pasted `config?.x ?? deps.connectDefaults.x ?? fallback` per option.
    function resolve<Opt extends keyof ConnectOptions>(option: Opt, fallback: NonNullable<ConnectOptions[Opt]>) {
      return config?.[option] ?? deps.connectDefaults[option] ?? fallback;
    }

    const touchOnBlur = resolve('touchOnBlur', false);
    const validateOnBlur = resolve('validateOnBlur', false);
    const validateOnChange = resolve('validateOnChange', false);
    const validateOnTouch = resolve('validateOnTouch', false);
    const debounceMs = resolve('debounce', 0);

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
